/**
 * ScheduleBoard — schedule section header (title + week stepper) plus the list.
 *
 * Server passes the current week + its matchups for a fast, flash-free first
 * paint. The ‹ › arrows fetch `/api/schedule?week=N`, swapping the list while
 * showing the skeleton. Regular season only (weeks 1–18).
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ScheduleList, { type ScheduleStatus } from './ScheduleList';
import { MIN_WEEK, MAX_WEEK, type Matchup, type GameState, type MatchupOdds } from '@/lib/schedule';
import type { NflTeam } from '@/lib/teams';
import { useNflStats } from '@/lib/useNflStats';

interface ScheduleBoardProps {
  currentWeek: number;
  initialMatchups: Matchup[];
}

/** Matchup as it arrives over JSON from the API route (kickoff is a string). */
interface SerializedMatchup {
  id: string;
  week: number;
  away: NflTeam;
  home: NflTeam;
  kickoff: string;
  state: GameState;
  completed: boolean;
  statusDetail: string;
  awayScore: number | null;
  homeScore: number | null;
  winner: 'away' | 'home' | null;
  odds: MatchupOdds | null;
}

export default function ScheduleBoard({ currentWeek, initialMatchups }: ScheduleBoardProps) {
  const [week, setWeek] = useState<number>(currentWeek);
  const [matchups, setMatchups] = useState<Matchup[]>(initialMatchups);
  const [status, setStatus] = useState<ScheduleStatus>(
    initialMatchups.length > 0 ? 'ready' : 'empty',
  );
  // Guards against out-of-order responses when arrows are tapped quickly.
  const requestIdRef = useRef(0);

  // Single-open accordion state (which matchup row is expanded).
  const [openId, setOpenId] = useState<string | null>(null);
  const toggleOpen = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  // Shared NFL stats for the inline compare peeks — fetched ONCE here and passed
  // to every row (no per-row refetch; same hook the workspace uses).
  const {
    offenseData,
    defenseData,
    isLoading: statsLoading,
    isLoadingOffense,
    isLoadingDefense,
  } = useNflStats();

  const loadWeek = useCallback(async (target: number) => {
    if (target < MIN_WEEK || target > MAX_WEEK) return;

    const requestId = ++requestIdRef.current;
    setWeek(target);
    setOpenId(null); // collapse any open peek when switching weeks
    setStatus('loading');

    try {
      const res = await fetch(`/api/schedule?week=${target}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { week: number; matchups: SerializedMatchup[] };
      if (requestId !== requestIdRef.current) return; // a newer request superseded this

      const revived: Matchup[] = data.matchups.map((m) => ({
        ...m,
        kickoff: new Date(m.kickoff),
      }));
      setMatchups(revived);
      setStatus(revived.length > 0 ? 'ready' : 'empty');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('❌ [schedule] Week fetch failed:', err);
      setMatchups([]);
      setStatus('empty');
    }
  }, []);

  const atMin = week <= MIN_WEEK;
  const atMax = week >= MAX_WEEK;

  return (
    <>
      {/* Section header: title (left) + week stepper (top-right) */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div
            className="font-black tracking-tight"
            style={{ fontSize: '22px', color: 'var(--text)', lineHeight: 1.1 }}
          >
            Schedule
          </div>
          <div className="mt-1" style={{ fontSize: '12px', color: 'var(--subtext)' }}>
            Tap a matchup to compare
          </div>
        </div>

        {/* Week stepper */}
        <div
          className="flex flex-none items-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
        >
          <StepButton
            label="Previous week"
            disabled={atMin}
            onClick={() => loadWeek(week - 1)}
          >
            <ChevronLeft size={18} />
          </StepButton>

          <div
            className="text-center font-bold tabular-nums"
            style={{ minWidth: 58, fontSize: '13px', color: 'var(--gold)' }}
          >
            Week {week}
          </div>

          <StepButton label="Next week" disabled={atMax} onClick={() => loadWeek(week + 1)}>
            <ChevronRight size={18} />
          </StepButton>
        </div>
      </div>

      <ScheduleList
        status={status}
        matchups={matchups}
        openId={openId}
        onToggle={toggleOpen}
        offenseData={offenseData}
        defenseData={defenseData}
        statsLoading={statsLoading}
        offenseLoading={isLoadingOffense}
        defenseLoading={isLoadingDefense}
      />
    </>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`flex h-11 w-11 items-center justify-center touch-optimized ${disabled ? '' : 'active:opacity-60'}`}
      style={{
        color: disabled ? 'var(--muted)' : 'var(--text)',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        // Belt-and-suspenders: native `disabled` already blocks clicks, but this
        // guarantees no tap/active feedback at Week 1 (‹) or Week 18 (›).
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {children}
    </button>
  );
}
