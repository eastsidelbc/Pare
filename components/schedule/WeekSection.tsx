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
 *
 * Favorites (A2): when the pin setting is on, games with a "Your teams" team
 * move into a "★ Your teams" group at the top of the week (moved, not
 * duplicated). The current week shows a "Pick your teams" prompt while the
 * list is empty.
 */

'use client';

import { memo, useMemo } from 'react';
import { Star } from 'lucide-react';
import MatchupAccordion from './MatchupAccordion';
import { useFavorites } from '@/components/FavoritesProvider';
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
  /** The live NFL week → shows the "Pick your teams" prompt when none are picked. */
  isCurrentWeek?: boolean;
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
        fontWeight: 800,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--gold-bright)',
      }}
    >
      {children}
      <span className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
    </div>
  );
}

/** Empty-state nudge (current week only) — opens the Your-teams sheet. */
function PickTeamsPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-4 flex w-full items-center gap-3 text-left touch-optimized active:opacity-80"
      style={{
        minHeight: 60,
        padding: '0 16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed color-mix(in srgb, var(--gold-bright) 50%, transparent)',
        background: 'color-mix(in srgb, var(--gold-bright) 5%, transparent)',
      }}
    >
      <Star size={20} strokeWidth={1.8} style={{ color: 'var(--gold-bright)', flex: 'none' }} aria-hidden />
      <span>
        <span className="block" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Pick your teams</span>
        <span className="block" style={{ marginTop: 2, fontSize: 11, color: 'var(--subtext)' }}>
          Their games pin to the top of every week
        </span>
      </span>
    </button>
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
      <span className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
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
  isCurrentWeek = false,
}: WeekSectionProps) {
  const { teams: favTeams, pin, hydrated, openSheet } = useFavorites();

  // Split favorites out (pin on) → "Your teams" group first, rest by day.
  const { pinned, groups } = useMemo(() => {
    if (entry.status !== 'ready') return { pinned: [] as Matchup[], groups: [] as ReturnType<typeof groupByDay> };
    if (!pin || favTeams.length === 0) return { pinned: [] as Matchup[], groups: groupByDay(entry.matchups) };
    const isFav = (m: Matchup) => favTeams.includes(m.away.abbr) || favTeams.includes(m.home.abbr);
    // Pin order follows the Your-teams order (first favorite's game first).
    const rank = (m: Matchup) => {
      const ia = favTeams.indexOf(m.away.abbr);
      const ih = favTeams.indexOf(m.home.abbr);
      return Math.min(ia < 0 ? 99 : ia, ih < 0 ? 99 : ih);
    };
    const fav = entry.matchups.filter(isFav).sort((x, y) => rank(x) - rank(y));
    return { pinned: fav, groups: groupByDay(entry.matchups.filter((m) => !isFav(m))) };
  }, [entry.status, entry.matchups, pin, favTeams]);

  let running = indexBase;
  const renderRow = (m: Matchup) => (
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
  );

  return (
    <section
      ref={(el) => registerSection(entry.week, el)}
      data-week={entry.week}
      className="pt-2"
    >
      <WeekDivider week={entry.week} />

      {isCurrentWeek && hydrated && favTeams.length === 0 && <PickTeamsPrompt onOpen={openSheet} />}

      {entry.status === 'loading' && (
        <div className="space-y-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <MatchupCardSkeleton key={i} />
          ))}
        </div>
      )}

      {entry.status === 'empty' && (
        <div
          className="flex flex-col items-center gap-2 px-6 py-10 text-center"
          style={{
            background: 'linear-gradient(90deg, var(--card-deep-a), var(--card-deep-mid) 50%, var(--card-deep-b))',
            border: '1px solid var(--frame-mid)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="font-bold" style={{ fontSize: '14px', color: 'var(--text)' }}>
            No games this week
          </div>
          <div style={{ fontSize: '12px', color: 'var(--subtext)' }}>Nothing scheduled for Week {entry.week}.</div>
        </div>
      )}

      {entry.status === 'ready' && (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <div>
              <DayLabel>
                <Star size={11} fill="currentColor" strokeWidth={0} aria-hidden />
                Your teams
              </DayLabel>
              {/* A touch more gap than day groups so the outer auras don't touch. */}
              <div className="space-y-2.5">{pinned.map(renderRow)}</div>
            </div>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              <DayLabel>{group.label}</DayLabel>
              <div className="space-y-2">{group.games.map(renderRow)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const WeekSection = memo(WeekSectionImpl);
export default WeekSection;
