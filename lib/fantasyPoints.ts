/**
 * Pare fantasy points — one number everywhere (Home box score + Leaders Fantasy).
 *
 * Kobe's rule (2026-10-12, docs/plans/2026-10-12-home-sleeper-ppr.md):
 *   points = Sleeper `pts_ppr` + 3 per Sleeper yardage-bonus flag on that game
 *            (300–399 pass yd, 400+ pass yd, 200+ rush yd, 200+ rec yd).
 * e.g. Dak Prescott W5 2026: pts_ppr 14.64 + `bonus_pass_yd_300` → 17.64, what the Sleeper app shows.
 *
 * Every input is a Sleeper field, so Sleeper's own scoring and stat corrections flow
 * through. Pare never scores yards or touchdowns itself. Sleeper's season stats sum the
 * flags as counts, so the same function works on a single game or a season total.
 *
 * Plain module (no server-only) so it can be unit-tested.
 */
import type { PlayerGameLine } from './myteam/types';
import { rookieKey } from './rookieMatch';

/** Sleeper's yardage-bonus flags that earn Pare points. The tiers are exclusive (a 412-yd game sets only `_400`). */
export const PARE_BONUS_FLAGS = ['bonus_pass_yd_300', 'bonus_pass_yd_400', 'bonus_rush_yd_200', 'bonus_rec_yd_200'] as const;
/** Points per bonus flag. */
export const PARE_BONUS_POINTS = 3;

/** Pare points for one game (or a season total), or null when Sleeper has no `pts_ppr` for it. */
export function parePoints(stats: Readonly<Record<string, number | undefined>>): number | null {
  const base = stats.pts_ppr;
  if (typeof base !== 'number') return null;
  const flags = PARE_BONUS_FLAGS.reduce((n, key) => n + (stats[key] ?? 0), 0);
  return Math.round((base + flags * PARE_BONUS_POINTS) * 100) / 100;
}

/** Positions that show up in a box score. */
const BOX_SCORE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K']);

/** One week's Pare points, findable by ESPN athlete id or by name + team. */
export interface PprIndex {
  byEspnId: Map<string, number>;
  byNameTeam: Map<string, number>;
}

/** Index one week of Sleeper lines. `players` = Sleeper id → name (+ ESPN id when Sleeper has it). */
export function buildPprIndex(
  lines: readonly PlayerGameLine[],
  players: Readonly<Record<string, { name: string; espnId?: string }>>,
): PprIndex {
  const index: PprIndex = { byEspnId: new Map(), byNameTeam: new Map() };
  for (const line of lines) {
    if (!BOX_SCORE_POSITIONS.has(line.position)) continue;
    const points = parePoints(line.stats);
    const player = players[line.playerId];
    if (points === null || !player) continue;
    if (player.espnId) index.byEspnId.set(player.espnId, points);
    index.byNameTeam.set(rookieKey(player.name, line.team), points);
  }
  return index;
}

/** A player's Pare points: ESPN id first, then normalized name + team. Null when Sleeper has nothing. */
export function pprFor(index: PprIndex, player: { espnId?: string; fullName: string; team: string }): number | null {
  if (player.espnId) {
    const byId = index.byEspnId.get(player.espnId);
    if (byId !== undefined) return byId;
  }
  return index.byNameTeam.get(rookieKey(player.fullName, player.team)) ?? null;
}

/** What `applySleeperPoints` needs from a box-score line (lib/gameSummary.ts `BoxLine`). */
export interface PointsLine {
  espnId?: string;
  fullName: string;
  /** The team's passer — pinned first. */
  isPasser: boolean;
  /** Rush + rec yards — the order when Sleeper has no points yet. */
  scrimmageYds: number;
  ppr: number | null;
}

/** Skill players shown per team under the pinned passer. */
const SKILL_SHOWN = 3;

/**
 * Fill every line's points from the index, then per team: passer first, then the top 3
 * skill players by points (by scrimmage yards when nobody on the team has points yet).
 * Returns a new summary; the input is not mutated.
 */
export function applySleeperPoints<
  L extends PointsLine,
  T extends { abbr: string; lines: L[] },
  S extends { byAbbr: Record<string, T> },
>(summary: S, index: PprIndex): S {
  const byAbbr: Record<string, T> = {};
  for (const [key, box] of Object.entries(summary.byAbbr)) {
    const lines: L[] = box.lines.map((l) => ({ ...l, ppr: pprFor(index, { espnId: l.espnId, fullName: l.fullName, team: box.abbr }) }));
    const passer = lines.find((l) => l.isPasser);
    const skill = lines.filter((l) => l !== passer);
    const anyPoints = skill.some((l) => l.ppr !== null);
    skill.sort(anyPoints ? byPointsDesc : (a, b) => b.scrimmageYds - a.scrimmageYds);
    byAbbr[key] = { ...box, lines: [...(passer ? [passer] : []), ...skill.slice(0, SKILL_SHOWN)] };
  }
  return { ...summary, byAbbr };
}

/** Points high → low; players without points last. */
function byPointsDesc(a: PointsLine, b: PointsLine): number {
  if (a.ppr === null || b.ppr === null) return (a.ppr === null ? 1 : 0) - (b.ppr === null ? 1 : 0);
  return b.ppr - a.ppr;
}
