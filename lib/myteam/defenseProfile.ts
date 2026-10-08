/**
 * Player-sheet "why" stats — pure. Maps a position to the opponent stats that
 * explain the matchup, aggregated over the same window as the chip and ranked
 * across all teams with the shared core (lib/ranking.ts).
 *
 * Rank convention = Compare's: #1 is the BEST team at that stat
 * (a defense: fewest yards/TDs/points allowed, most INT/sacks; an offense:
 * fewest turnovers/sacks allowed, most points). "vs #30 run D" therefore
 * reads the same here as on Compare.
 *
 * Game logs come from ESPN box scores (P2: espnStats `getDefenseGameLog`).
 * Fields verified present in P0a (summary?event=…).
 */

import { rankAll } from '@/lib/ranking';
import { windowWeeks } from './rating';
import type { FantasyPosition, RatingWindow } from './types';

/** What one team's DEFENSE allowed in one game. */
export type DefenseGame = {
  team: string;
  week: number;
  pass_yds: number;
  rush_yds: number;
  pass_td: number;
  rush_td: number;
  int: number;
  sacks: number;
  points: number;
  red_zone_att: number;
  drives: number;
};

/** What one team's OFFENSE did in one game (for rating D/ST matchups). */
export type OffenseGame = {
  team: string;
  week: number;
  turnovers: number;
  sacks_allowed: number;
  points: number;
};

type DefenseStatKey = 'pass_yds' | 'rush_yds' | 'pass_td' | 'rush_td' | 'int' | 'sacks' | 'points' | 'rz_per_drive';
type OffenseStatKey = 'turnovers' | 'sacks_allowed' | 'points';

interface StatSpec<K extends string> {
  key: K;
  /** Short label; the UI appends " / {unit}" (P4 mockup copy: "Pass yds / game"). */
  label: string;
  /** Per game, except the red-zone rate (per drive). */
  unit: 'game' | 'drive';
  /** For the team being ranked: is a higher value better? */
  higherIsBetter: boolean;
}

const DEF: Record<DefenseStatKey, StatSpec<DefenseStatKey>> = {
  pass_yds: { key: 'pass_yds', label: 'Pass yds', unit: 'game', higherIsBetter: false },
  rush_yds: { key: 'rush_yds', label: 'Rush yds', unit: 'game', higherIsBetter: false },
  pass_td: { key: 'pass_td', label: 'Pass TD', unit: 'game', higherIsBetter: false },
  rush_td: { key: 'rush_td', label: 'Rush TD', unit: 'game', higherIsBetter: false },
  int: { key: 'int', label: 'INT made', unit: 'game', higherIsBetter: true },
  sacks: { key: 'sacks', label: 'Sacks made', unit: 'game', higherIsBetter: true },
  points: { key: 'points', label: 'Points allowed', unit: 'game', higherIsBetter: false },
  rz_per_drive: { key: 'rz_per_drive', label: 'Red-zone trips', unit: 'drive', higherIsBetter: false },
};

const OFF: Record<OffenseStatKey, StatSpec<OffenseStatKey>> = {
  turnovers: { key: 'turnovers', label: 'Turnovers', unit: 'game', higherIsBetter: false },
  sacks_allowed: { key: 'sacks_allowed', label: 'Sacks allowed', unit: 'game', higherIsBetter: false },
  points: { key: 'points', label: 'Points scored', unit: 'game', higherIsBetter: true },
};

/** Which opponent stats explain a matchup, per position. DEF reads the opposing OFFENSE. */
export const POSITION_PROFILE: Readonly<Record<FantasyPosition, { side: 'defense' | 'offense'; stats: readonly string[] }>> = {
  QB: { side: 'defense', stats: ['pass_yds', 'pass_td', 'int', 'sacks'] },
  RB: { side: 'defense', stats: ['rush_yds', 'rush_td'] },
  WR: { side: 'defense', stats: ['pass_yds', 'pass_td'] },
  TE: { side: 'defense', stats: ['pass_yds', 'pass_td'] },
  K: { side: 'defense', stats: ['points', 'rz_per_drive'] },
  DEF: { side: 'offense', stats: ['turnovers', 'sacks_allowed', 'points'] },
};

export interface WhyStat {
  key: string;
  label: string;
  unit: 'game' | 'drive';
  /** Per game, except `rz_per_drive` (a rate over the window). */
  value: number;
  rank: number;
  formattedRank: string;
  isTied: boolean;
}

type Row = Readonly<Record<string, number | string>>;

/** Window totals per team: per-game averages, plus the red-zone-per-drive rate. */
function aggregate(log: readonly Row[], keys: readonly string[], window: RatingWindow): Map<string, Record<string, number>> {
  const byTeam = new Map<string, Row[]>();
  for (const row of log) {
    const team = String(row.team);
    const rows = byTeam.get(team) ?? [];
    rows.push(row);
    byTeam.set(team, rows);
  }
  const out = new Map<string, Record<string, number>>();
  for (const [team, rows] of byTeam) {
    const weeks = new Set(windowWeeks(rows.map((r) => Number(r.week)), window));
    const games = rows.filter((r) => weeks.has(Number(r.week)));
    if (games.length === 0) continue;
    const sum = (k: string) => games.reduce((acc, r) => acc + Number(r[k] ?? 0), 0);
    const values: Record<string, number> = {};
    for (const key of keys) {
      if (key === 'rz_per_drive') {
        const drives = sum('drives');
        values[key] = drives > 0 ? sum('red_zone_att') / drives : NaN;
      } else {
        values[key] = sum(key) / games.length;
      }
    }
    out.set(team, values);
  }
  return out;
}

/** Ranked "why" stats for a player at `position` facing `opponent`. Empty if the opponent has no games. */
export function whyStats(
  position: FantasyPosition,
  opponent: string,
  defenseLog: readonly DefenseGame[],
  offenseLog: readonly OffenseGame[],
  window: RatingWindow,
): WhyStat[] {
  const profile = POSITION_PROFILE[position];
  const specs = profile.stats.map((k) =>
    profile.side === 'defense' ? DEF[k as DefenseStatKey] : OFF[k as OffenseStatKey],
  );
  const log: readonly Row[] = profile.side === 'defense' ? defenseLog : offenseLog;
  const totals = aggregate(log, profile.stats, window);
  const mine = totals.get(opponent);
  if (!mine) return [];

  return specs.map((spec) => {
    const ranks = rankAll(
      [...totals].map(([team, v]) => [team, v[spec.key]] as const),
      spec.higherIsBetter,
    );
    const r = ranks.get(opponent);
    return {
      key: spec.key,
      label: spec.label,
      unit: spec.unit,
      value: mine[spec.key],
      rank: r?.rank ?? NaN,
      formattedRank: r?.formattedRank ?? '—',
      isTied: r?.isTied ?? false,
    };
  });
}
