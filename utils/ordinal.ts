/**
 * Ordinal + rank formatting — the ONE place rank text is built.
 *
 * Consolidates three previously-divergent copies (useRanking's `formatRank`,
 * calculateBulkRanking's `formatRank`, and RankBadge's `ordinalSuffix`). The old
 * `formatRank` copies only special-cased 1st/2nd/3rd and appended "th" to
 * everything else, so ranks 21/22/23/31 rendered as "21th/22th/23th/31th".
 * This implementation applies the correct English ordinal rules.
 */

/** Correct English ordinal suffix (1st, 2nd, 3rd, 11th–13th, 21st, 31st, …). */
export function ordinalSuffix(rank: number): string {
  const lastTwo = Math.abs(rank) % 100;
  const lastOne = Math.abs(rank) % 10;
  if (lastTwo < 11 || lastTwo > 13) {
    if (lastOne === 1) return 'st';
    if (lastOne === 2) return 'nd';
    if (lastOne === 3) return 'rd';
  }
  return 'th';
}

/** "1st" / "T-12th" / "31st" — rank with its ordinal suffix and an optional tie prefix. */
export function formatRank(rank: number, isTied = false): string {
  return `${isTied ? 'T-' : ''}${rank}${ordinalSuffix(rank)}`;
}
