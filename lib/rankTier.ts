/**
 * Rank tiers — one shared definition of "how special is this rank?" used by the
 * Compare bars + rank badges (Round 5 "R" design).
 *
 *   first → #1            gold ring + gold sparks + fast team-color breathe
 *   top   → #2–#5         soft team-color breathe only (gold is #1's alone)
 *   mid   → #6–#27        plain
 *   low   → #28–#31       badge: red outline with a light running laps
 *   last  → #32 (worst)   badge: solid red, smoldering "ember"
 *
 * Tie-aware by construction: tied teams share a rank, so they share a tier.
 * `total` is the size of the ranked field (32 for a full league).
 */

export type RankTier = 'first' | 'top' | 'mid' | 'low' | 'last' | 'none';

export function getRankTier(rank: number | null | undefined, total = 32): RankTier {
  if (rank == null || !Number.isFinite(rank) || rank < 1) return 'none';
  const worst = Math.max(total, 1);
  if (rank === 1) return 'first';
  if (rank <= 5) return 'top';
  if (rank === worst && worst > 5) return 'last';
  if (rank >= worst - 4 && rank > 5) return 'low';
  return 'mid';
}
