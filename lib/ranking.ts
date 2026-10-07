/**
 * Tie-aware ranking core — the ONE implementation behind useRanking,
 * calculateBulkRanking and My Team's matchup ranks. Pure (no React), so it
 * runs anywhere on the client; ranking stays client-side (CLAUDE.md).
 *
 * Rule: rank = 1 + number of strictly better values. Values within
 * RANK_TIE_EPSILON of each other tie ("T-12th"). NaN values are ignored.
 * Snapshot-guarded by lib/__tests__/ranking.snapshot.test.ts.
 */

import { formatRank } from '@/utils/ordinal';

/** Tie tolerance (3 decimal places). */
export const RANK_TIE_EPSILON = 0.001;

/** Compare two numbers with floating-point tolerance. */
export function areValuesEqual(a: number, b: number, epsilon = RANK_TIE_EPSILON): boolean {
  return Math.abs(a - b) < epsilon;
}

export interface RankPosition {
  rank: number;
  /** "1st", "T-12th", … */
  formattedRank: string;
  isTied: boolean;
  /** How many values (including the target) share the target's value. */
  teamsWithSameValue: number;
}

/** Rank `target` among `values` (the target's own value should be in `values`). */
export function rankAmong(target: number, values: readonly number[], higherIsBetter = true): RankPosition {
  let betterCount = 0;
  let sameCount = 0;
  for (const value of values) {
    if (isNaN(value)) continue;
    if (areValuesEqual(value, target)) sameCount++;
    else if (higherIsBetter ? value > target : value < target) betterCount++;
  }
  const rank = betterCount + 1;
  const isTied = sameCount > 1;
  return { rank, formattedRank: formatRank(rank, isTied), isTied, teamsWithSameValue: sameCount };
}

/** Rank every entry against the others. Entries with NaN values are left out. */
export function rankAll<K>(entries: ReadonlyArray<readonly [K, number]>, higherIsBetter = true): Map<K, RankPosition> {
  const values = entries.map(([, v]) => v);
  const out = new Map<K, RankPosition>();
  for (const [key, value] of entries) {
    if (!isNaN(value)) out.set(key, rankAmong(value, values, higherIsBetter));
  }
  return out;
}
