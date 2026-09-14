/**
 * Home — schedule-first entry point.
 *
 * The front door of the app: a mobile-first list of THIS WEEK's NFL matchups as
 * compact tappable cards. Tapping a card deep-links into the compare view with
 * both teams preloaded (`/compare?away=XXX&home=YYY`).
 *
 * Schedule data comes from the `getCurrentWeekMatchups()` seam (currently a mock).
 * State is owned here so it works unchanged when that seam becomes async.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCurrentWeekMatchups, getCurrentWeekNumber, type Matchup } from '@/lib/schedule';
import ScheduleList, { type ScheduleStatus } from '@/components/schedule/ScheduleList';

export default function Home() {
  const [status, setStatus] = useState<ScheduleStatus>('loading');
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const week = getCurrentWeekNumber();

  const load = useCallback(() => {
    setStatus('loading');
    try {
      const games = getCurrentWeekMatchups();
      setMatchups(games);
      setStatus(games.length > 0 ? 'ready' : 'empty');
    } catch {
      setMatchups([]);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <header
        className="flex-none border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-14 w-full max-w-[600px] items-center justify-between px-4">
          <h1 className="font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
            Pare
            <span
              className="ml-1.5 font-bold"
              style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}
            >
              NFL
            </span>
          </h1>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--subtext)' }}>2025 Season</div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-[600px] flex-1 px-4 pb-10 pt-4">
        <div className="mb-4">
          <div
            className="font-black tracking-tight"
            style={{ fontSize: '22px', color: 'var(--text)', lineHeight: 1.1 }}
          >
            This Week
          </div>
          <div className="mt-1" style={{ fontSize: '12px', color: 'var(--subtext)' }}>
            Week {week} · Tap a matchup to compare
          </div>
        </div>

        <ScheduleList status={status} matchups={matchups} onRetry={load} />
      </main>
    </div>
  );
}
