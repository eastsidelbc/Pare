/**
 * Open a team-vs-team pair on Compare — the Home "Open full" flow
 * (components/schedule/MatchupAccordion.tsx) without the metric settings:
 * reuse an existing tab for the same (unordered) pair, else add one
 * (respects MAX_COMPARISONS), activate it, go to /compare.
 */

'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useComparisons } from '@/components/ComparisonsProvider';
import { resolveTeamByAbbr } from '@/lib/teams';

export type OpenInCompareResult = 'opened' | 'full' | 'unknown-team';

export function useOpenInCompare(): (teamAbbr: string, oppAbbr: string) => OpenInCompareResult {
  const router = useRouter();
  const { comparisons, addComparison, setActive } = useComparisons();

  return useCallback(
    (teamAbbr: string, oppAbbr: string) => {
      const a = resolveTeamByAbbr(teamAbbr)?.name;
      const b = resolveTeamByAbbr(oppAbbr)?.name;
      if (!a || !b) return 'unknown-team';
      const existing = comparisons.find((c) => (c.teamA === a && c.teamB === b) || (c.teamA === b && c.teamB === a));
      const id = existing ? existing.id : addComparison(a, b);
      if (!id) return 'full';
      setActive(id);
      router.push('/compare');
      return 'opened';
    },
    [comparisons, addComparison, setActive, router],
  );
}
