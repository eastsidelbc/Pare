/**
 * WeekSection — one week's slice of the continuous schedule scroll.
 *
 * Renders a "WEEK n" divider (the marker the scroll handler uses to know which
 * week is in view), then the week's matchups grouped by day as accordion rows.
 * While a week is still loading it shows skeletons; an empty week shows a note.
 *
 * Only a small window of weeks is mounted at a time (see ScheduleProvider), so
 * each mounted week lays out at its real height — that keeps jump/scroll targets
 * exact. Memoized so scrolling and the header label updating never re-render a
 * week that didn't change.
 */

'use client';

import { memo } from 'react';
import MatchupAccordion from './MatchupAccordion';
import MatchupCardSkeleton from './MatchupCardSkeleton';
import type { WeekEntry } from './ScheduleProvider';
import { type Matchup } from '@/lib/schedule';
import type { TeamData } from '@/lib/useNflStats';

interface WeekSectionProps {
  entry: WeekEntry;
  /** Running index across the whole list, for a subtle stagger on the rows. */
  indexBase: number;
  openId: string | null;
  onToggle: (id: string) => void;
  offenseData: TeamData[];
  defenseData: TeamData[];
  statsLoading: boolean;
  offenseLoading: boolean;
  defenseLoading: boolean;
  /** Register this section's DOM node (or null on unmount) for scroll tracking. */
  registerSection: (week: number, el: HTMLElement | null) => void;
}

function groupByDay(matchups: Matchup[]): { label: string; games: Matchup[] }[] {
  const groups: { label: string; games: Matchup[] }[] = [];
  for (const m of matchups) {
    const label = m.kickoff.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.games.push(m);
    else groups.push({ label, games: [m] });
  }
  return groups;
}

function DayLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2 mt-1 flex items-center gap-2"
      style={{
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: 'var(--gold)',
      }}
    >
      {children}
      <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function WeekDivider({ week }: { week: number }) {
  return (
    <div className="mb-3 mt-1 flex items-center gap-3" data-week-divider={week}>
      <span
        className="font-black tracking-tight"
        style={{ fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text)' }}
      >
        Week {week}
      </span>
      <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function WeekSectionImpl({
  entry,
  indexBase,
  openId,
  onToggle,
  offenseData,
  defenseData,
  statsLoading,
  offenseLoading,
  defenseLoading,
  registerSection,
}: WeekSectionProps) {
  const groups = entry.status === 'ready' ? groupByDay(entry.matchups) : [];
  let running = indexBase;

  return (
    <section
      ref={(el) => registerSection(entry.week, el)}
      data-week={entry.week}
      className="pt-2"
    >
      <WeekDivider week={entry.week} />

      {entry.status === 'loading' && (
        <div className="space-y-2.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <MatchupCardSkeleton key={i} />
          ))}
        </div>
      )}

      {entry.status === 'empty' && (
        <div
          className="flex flex-col items-center gap-2 px-6 py-10 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
        >
          <div className="font-bold" style={{ fontSize: '14px', color: 'var(--text)' }}>
            No games this week
          </div>
          <div style={{ fontSize: '12px', color: 'var(--subtext)' }}>Nothing scheduled for Week {entry.week}.</div>
        </div>
      )}

      {entry.status === 'ready' && (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <DayLabel>{group.label}</DayLabel>
              <div className="space-y-2.5">
                {group.games.map((m) => (
                  <MatchupAccordion
                    key={m.id}
                    matchup={m}
                    index={running++}
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const WeekSection = memo(WeekSectionImpl);
export default WeekSection;
