/**
 * MatchupAccordion — a schedule row that expands inline to a head-to-head peek
 * (Vision Step 4). The header is <MatchupCard>; tapping it toggles an inline
 * <ComparePane inline> for the matchup's two teams, editable in place.
 *
 * The peek uses an EPHEMERAL local draft (teams/metrics) seeded from the
 * matchup — it is NOT added to the comparisons store just by expanding. It reads
 * the same shared stats (passed down) and the same Compare component as the
 * workspace, so there's a single source of truth for data + logic.
 *
 * "Open full" promotes the draft into the workspace: dedupe to an existing tab
 * for the same pair (setActive) or addComparison (respecting the cap), carry the
 * inline edits, then navigate to /compare.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import MatchupCard from './MatchupCard';
import ComparePane from '@/components/compare/ComparePane';
import { useComparisons } from '@/components/ComparisonsProvider';
import { DEFAULT_OFFENSE_METRICS, DEFAULT_DEFENSE_METRICS } from '@/lib/metricsConfig';
import type { TeamData } from '@/lib/useNflStats';
import { type Matchup } from '@/lib/schedule';

interface MatchupAccordionProps {
  matchup: Matchup;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  offenseData: TeamData[];
  defenseData: TeamData[];
  isLoading: boolean;
  isLoadingOffense: boolean;
  isLoadingDefense: boolean;
}

export default function MatchupAccordion({
  matchup,
  index,
  isOpen,
  onToggle,
  offenseData,
  defenseData,
  isLoading,
  isLoadingOffense,
  isLoadingDefense,
}: MatchupAccordionProps) {
  const router = useRouter();
  const { comparisons, addComparison, setActive, updateComparison } = useComparisons();

  // Ephemeral local draft (NOT in the store) seeded from the matchup.
  const [draftA, setDraftA] = useState(matchup.away.name);
  const [draftB, setDraftB] = useState(matchup.home.name);
  const [offMetrics, setOffMetrics] = useState<string[]>(DEFAULT_OFFENSE_METRICS);
  const [defMetrics, setDefMetrics] = useState<string[]>(DEFAULT_DEFENSE_METRICS);

  // Re-seed the draft whenever this row opens so it reflects the matchup.
  useEffect(() => {
    if (isOpen) {
      setDraftA(matchup.away.name);
      setDraftB(matchup.home.name);
    }
  }, [isOpen, matchup.away.name, matchup.home.name]);

  const openFull = useCallback(() => {
    // Dedupe against an existing tab for the same (unordered) pair.
    const existing = comparisons.find(
      (c) =>
        (c.teamA === draftA && c.teamB === draftB) ||
        (c.teamA === draftB && c.teamB === draftA),
    );

    let id: string | null;
    if (existing) {
      // Carry inline edits (orientation + metrics) into the existing tab.
      updateComparison(existing.id, {
        teamA: draftA,
        teamB: draftB,
        settings: { offenseMetrics: offMetrics, defenseMetrics: defMetrics },
      });
      id = existing.id;
    } else {
      id = addComparison(draftA, draftB); // respects MAX_COMPARISONS (null if capped)
      if (id) {
        updateComparison(id, {
          settings: { offenseMetrics: offMetrics, defenseMetrics: defMetrics },
        });
      }
    }

    if (id) setActive(id);
    router.push('/compare');
  }, [comparisons, draftA, draftB, offMetrics, defMetrics, addComparison, updateComparison, setActive, router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut', delay: Math.min(index * 0.03, 0.3) }}
    >
      <MatchupCard matchup={matchup} isOpen={isOpen} onToggle={onToggle} />

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="peek"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="mt-2 overflow-hidden"
              style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--card)' }}
            >
              <ComparePane
                inline
                isMobile
                teamA={draftA}
                teamB={draftB}
                offenseData={offenseData}
                defenseData={defenseData}
                selectedOffenseMetrics={offMetrics}
                selectedDefenseMetrics={defMetrics}
                isLoading={isLoading}
                isLoadingOffense={isLoadingOffense}
                isLoadingDefense={isLoadingDefense}
                onTeamAChange={setDraftA}
                onTeamBChange={setDraftB}
                onOffenseMetricsChange={setOffMetrics}
                onDefenseMetricsChange={setDefMetrics}
              />

              <div className="p-3 pt-0">
                <button
                  type="button"
                  onClick={openFull}
                  className="flex w-full items-center justify-center gap-1.5 font-bold touch-optimized active:opacity-80"
                  style={{
                    background: 'var(--gold)',
                    color: '#0a0e1a',
                    borderRadius: 'var(--radius-md)',
                    padding: '11px',
                    fontSize: '14px',
                  }}
                >
                  Open full <ArrowUpRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
