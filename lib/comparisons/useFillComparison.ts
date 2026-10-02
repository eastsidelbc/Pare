/**
 * useFillComparison — fill a BLANK comparison with a whole matchup in one tap
 * (the "This week" pills on <BlankComparePicker>).
 *
 * Same no-duplicates rule as Home's "Open full": if another tab already holds
 * this pair (either orientation), jump to it and drop the blank tab instead of
 * creating a second copy. Otherwise set both teams on the blank tab.
 */

'use client';

import { useCallback } from 'react';
import { useComparisons } from '@/components/ComparisonsProvider';

/** Pure: another comparison (not `blankId`) already holding this pair, either orientation. */
export function findPairDuplicate<T extends { id: string; teamA: string; teamB: string }>(
  comparisons: readonly T[],
  blankId: string,
  teamA: string,
  teamB: string,
): T | undefined {
  return comparisons.find(
    (c) =>
      c.id !== blankId &&
      ((c.teamA === teamA && c.teamB === teamB) || (c.teamA === teamB && c.teamB === teamA)),
  );
}

export function useFillComparison(): (blankId: string, teamA: string, teamB: string) => void {
  const { comparisons, setActive, removeComparison, updateComparison } = useComparisons();

  return useCallback(
    (blankId: string, teamA: string, teamB: string) => {
      const existing = findPairDuplicate(comparisons, blankId, teamA, teamB);
      if (existing) {
        setActive(existing.id); // activate first so removing the blank keeps it active
        removeComparison(blankId);
        return;
      }
      updateComparison(blankId, { teamA, teamB });
    },
    [comparisons, setActive, removeComparison, updateComparison],
  );
}
