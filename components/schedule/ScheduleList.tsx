/**
 * ScheduleList — renders the week's matchups grouped by day, with intentional
 * loading (skeleton), empty, and error states.
 */

'use client';

import { motion } from 'framer-motion';
import { CalendarX2, AlertTriangle, RotateCw } from 'lucide-react';
import MatchupAccordion from './MatchupAccordion';
import MatchupCardSkeleton from './MatchupCardSkeleton';
import { type Matchup } from '@/lib/schedule';
import type { TeamData } from '@/lib/useNflStats';

export type ScheduleStatus = 'loading' | 'ready' | 'empty' | 'error';

interface ScheduleListProps {
  status: ScheduleStatus;
  matchups: Matchup[];
  onRetry?: () => void;
  /** Accordion (single-open) + shared stats for the inline compare peek. */
  openId: string | null;
  onToggle: (id: string) => void;
  offenseData: TeamData[];
  defenseData: TeamData[];
  statsLoading: boolean;
  offenseLoading: boolean;
  defenseLoading: boolean;
}

function DayLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2 mt-1 flex items-center gap-2"
      style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}
    >
      {children}
      <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function groupByDay(matchups: Matchup[]): { label: string; games: Matchup[] }[] {
  const groups: { label: string; games: Matchup[] }[] = [];
  for (const m of matchups) {
    const label = m.kickoff.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.games.push(m);
    else groups.push({ label, games: [m] });
  }
  return groups;
}

export default function ScheduleList({
  status,
  matchups,
  onRetry,
  openId,
  onToggle,
  offenseData,
  defenseData,
  statsLoading,
  offenseLoading,
  defenseLoading,
}: ScheduleListProps) {
  if (status === 'loading') {
    return (
      <div className="space-y-2.5">
        <DayLabel>Loading</DayLabel>
        {Array.from({ length: 6 }).map((_, i) => (
          <MatchupCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 px-6 py-12 text-center"
        style={{
          background: 'var(--card)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <AlertTriangle size={28} style={{ color: 'var(--red)' }} />
        <div>
          <div className="font-bold" style={{ fontSize: '15px', color: 'var(--text)' }}>
            Couldn&apos;t load this week&apos;s games
          </div>
          <div className="mt-1" style={{ fontSize: '13px', color: 'var(--subtext)' }}>
            Something went wrong fetching the schedule.
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-2 font-semibold touch-optimized active:opacity-70"
            style={{
              fontSize: '13px',
              color: '#1a1400',
              background: 'linear-gradient(180deg, var(--gold-bright), var(--gold))',
              borderRadius: 'var(--radius-md)',
              padding: '9px 16px',
            }}
          >
            <RotateCw size={14} /> Try again
          </button>
        )}
      </motion.div>
    );
  }

  if (status === 'empty') {
    return (
      <div
        className="flex flex-col items-center gap-3 px-6 py-14 text-center"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
      >
        <CalendarX2 size={28} style={{ color: 'var(--muted)' }} />
        <div>
          <div className="font-bold" style={{ fontSize: '15px', color: 'var(--text)' }}>
            No games scheduled
          </div>
          <div className="mt-1" style={{ fontSize: '13px', color: 'var(--subtext)' }}>
            Check back when the next week is set.
          </div>
        </div>
      </div>
    );
  }

  const groups = groupByDay(matchups);
  let runningIndex = 0;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.label}>
          <DayLabel>{group.label}</DayLabel>
          <div className="space-y-2.5">
            {group.games.map((m) => (
              <MatchupAccordion
                key={m.id}
                matchup={m}
                index={runningIndex++}
                isOpen={openId === m.id}
                onToggle={() => onToggle(m.id)}
                offenseData={offenseData}
                defenseData={defenseData}
                isLoading={statsLoading}
                isLoadingOffense={offenseLoading}
                isLoadingDefense={defenseLoading}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
