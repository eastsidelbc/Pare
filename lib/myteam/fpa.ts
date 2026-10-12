/**
 * Fantasy points allowed (FPA) — pure engine.
 *
 * One rule for every position: `table[X][P][week]` = fantasy points scored
 * by position-P players AGAINST team X that week (players whose `opponent`
 * is X), under the league's scoring. For QB/RB/WR/TE/K, X is the defense; for
 * DEF (D/ST) X is the offense the defense faced. So a player on team T facing
 * O is rated by `table[O][his position]`.
 *
 * Each team gets a cell for every week it played (from either side of any
 * line), so a defense that allowed 0 TE points still counts that game.
 * Verified P0a: summing Sleeper's own pts_ppr this way reproduces Sleeper's
 * `fan_pts_allow_*` on 160/160 week-4 values.
 */

import { FANTASY_POSITIONS, type FantasyPosition, type PlayerGameLine, type ScoringRules, type StatLine } from './types';

/** Points for one stat line. Missing stat keys score 0. Rounded to 2 decimals (Sleeper's precision). */
export function scoreLine(stats: StatLine, rules: ScoringRules): number {
  let points = 0;
  for (const key in rules) {
    const value = stats[key];
    if (value) points += value * rules[key];
  }
  return Math.round(points * 100) / 100;
}

export interface FpaCell {
  pts: number;
  games: number;
}

/** team → position → week → cell. */
export type FpaTable = Record<string, Record<FantasyPosition, Record<number, FpaCell>>>;

export function buildFpaTable(lines: readonly PlayerGameLine[], rules: ScoringRules): FpaTable {
  const table: FpaTable = {};
  const cellsFor = (team: string) =>
    (table[team] ??= Object.fromEntries(FANTASY_POSITIONS.map((p) => [p, {}])) as Record<FantasyPosition, Record<number, FpaCell>>);
  const markPlayed = (team: string, week: number) => {
    const byPos = cellsFor(team);
    for (const p of FANTASY_POSITIONS) byPos[p][week] ??= { pts: 0, games: 1 };
  };

  for (const line of lines) {
    markPlayed(line.team, line.week);
    markPlayed(line.opponent, line.week);
  }
  for (const line of lines) {
    const cell = table[line.opponent][line.position][line.week];
    cell.pts = Math.round((cell.pts + scoreLine(line.stats, rules)) * 100) / 100;
  }
  return table;
}

/** Weeks a team played, ascending (byes are simply absent). */
export function playedWeeks(table: FpaTable, team: string): number[] {
  const byPos = table[team];
  if (!byPos) return [];
  return Object.keys(byPos.QB)
    .map(Number)
    .sort((a, b) => a - b);
}
