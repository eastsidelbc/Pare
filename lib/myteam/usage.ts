/**
 * Fantasy usage (Wave A2) — pure + client-safe. The server turns the season's Sleeper
 * week lines into raw per-week rows per player (`buildUsage`); the client windows them
 * (Season / Last 4, the toggle) and summarizes with lib/formulas (`summarizeUsage`).
 *
 * Shares are the player's sum over the window divided by his team's sum over the same
 * weeks (not an average of weekly shares), so a 2-target game doesn't count like a
 * 12-target one.
 */

import { mean, percentile } from '@/lib/formulas/stats';
import { boomRate, wopr } from '@/lib/formulas/player';
import { FORMULA_CONFIG } from '@/lib/formulas/config';
import { scoreLine } from './fpa';
import { LAST_N_GAMES } from './rating';
import type { FantasyPosition, PlayerGameLine, RatingWindow, ScoringRules } from './types';

/** One week of one player — raw values only. */
export interface UsageWeek {
  week: number;
  /** League-scored fantasy points. */
  pts: number;
  /** Offensive snaps / team offensive snaps; null when Sleeper has no snap counts. */
  snaps: number | null;
  teamSnaps: number | null;
  tgt: number;
  teamTgt: number;
  air: number;
  teamAir: number;
  /** Sleeper PPR positional rank that week (null = unranked). */
  posRank: number | null;
}

export type UsageMap = Record<string, UsageWeek[]>;

const USAGE_POSITIONS: readonly FantasyPosition[] = ['QB', 'RB', 'WR', 'TE'];

const val = (l: PlayerGameLine, k: string) => l.stats[k] ?? 0;

/** Every skill player's weeks, ascending. Team sums are over all of that team's lines that week. */
export function buildUsage(lines: readonly PlayerGameLine[], rules: ScoringRules): UsageMap {
  const teamWeek = new Map<string, { tgt: number; air: number }>();
  for (const l of lines) {
    const k = `${l.team}|${l.week}`;
    const t = teamWeek.get(k) ?? { tgt: 0, air: 0 };
    t.tgt += val(l, 'rec_tgt');
    t.air += Math.max(0, val(l, 'rec_air_yd'));
    teamWeek.set(k, t);
  }
  const out: UsageMap = {};
  for (const l of lines) {
    if (!USAGE_POSITIONS.includes(l.position)) continue;
    const team = teamWeek.get(`${l.team}|${l.week}`) ?? { tgt: 0, air: 0 };
    const snaps = l.stats.off_snp;
    const teamSnaps = l.stats.tm_off_snp;
    const rank = l.stats.pos_rank_ppr;
    (out[l.playerId] ??= []).push({
      week: l.week,
      pts: scoreLine(l.stats, rules),
      snaps: typeof snaps === 'number' ? snaps : null,
      teamSnaps: typeof teamSnaps === 'number' && teamSnaps > 0 ? teamSnaps : null,
      tgt: val(l, 'rec_tgt'),
      teamTgt: team.tgt,
      air: Math.max(0, val(l, 'rec_air_yd')),
      teamAir: team.air,
      posRank: typeof rank === 'number' && rank > 0 && rank < FORMULA_CONFIG.unrankedPosRank ? rank : null,
    });
  }
  for (const weeks of Object.values(out)) weeks.sort((a, b) => a.week - b.week);
  return out;
}

/** Only the players asked for (the bundle sends a roster's worth, not the league). */
export function pickUsage(map: UsageMap, playerIds: Iterable<string>): UsageMap {
  const out: UsageMap = {};
  for (const id of playerIds) if (map[id]) out[id] = map[id];
  return out;
}

export interface UsageSummary {
  games: number;
  ptsPerGame: number | null;
  floor: number | null;
  ceiling: number | null;
  /** Share of ranked weeks inside the boom rank (top-12 at the position). */
  boomPct: number | null;
  snapPct: number | null;
  targetShare: number | null;
  airShare: number | null;
  wopr: number | null;
}

/** Players who played at all that week (a 0-snap inactive week isn't a game). */
const played = (w: UsageWeek) => w.snaps === null || w.snaps > 0;

const shareOf = (num: number, den: number) => (den > 0 ? num / den : null);

export function summarizeUsage(weeks: readonly UsageWeek[] | undefined, window: RatingWindow, position: FantasyPosition | null): UsageSummary {
  const all = (weeks ?? []).filter(played);
  const w = window === 'last4' ? all.slice(-LAST_N_GAMES) : all;
  const pts = w.map((x) => x.pts);
  const snapWeeks = w.filter((x) => x.snaps !== null && x.teamSnaps !== null);
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  const receiving = position === 'WR' || position === 'TE' || position === 'RB';
  const tgtShare = receiving ? shareOf(sum(w.map((x) => x.tgt)), sum(w.map((x) => x.teamTgt))) : null;
  const airShare = receiving ? shareOf(sum(w.map((x) => x.air)), sum(w.map((x) => x.teamAir))) : null;
  const ranks = w.map((x) => x.posRank).filter((r): r is number => r !== null);
  return {
    games: w.length,
    ptsPerGame: mean(pts),
    floor: percentile(pts, FORMULA_CONFIG.floorPercentile),
    ceiling: percentile(pts, FORMULA_CONFIG.ceilingPercentile),
    boomPct: ranks.length > 0 ? boomRate(ranks) : null,
    snapPct: snapWeeks.length > 0 ? shareOf(sum(snapWeeks.map((x) => x.snaps ?? 0)), sum(snapWeeks.map((x) => x.teamSnaps ?? 0))) : null,
    targetShare: tgtShare,
    airShare,
    wopr: position === 'WR' || position === 'TE' ? (tgtShare !== null && airShare !== null ? wopr(tgtShare, airShare) : null) : null,
  };
}
