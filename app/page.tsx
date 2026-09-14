/**
 * Home — schedule-first entry point.
 *
 * The front door of the app: a mobile-first list of THIS WEEK's NFL matchups as
 * compact tappable cards. Tapping a card deep-links into the compare view with
 * both teams preloaded (`/compare?away=XXX&home=YYY`).
 *
 * Server component: awaits the `getCurrentWeekMatchups()` seam (live ESPN fetch,
 * cached, with a hardcoded fallback) so the schedule is fetched server-side.
 */

import { getCurrentWeekInfo, getCurrentWeekMatchups, type Matchup } from '@/lib/schedule';
import ScheduleBoard from '@/components/schedule/ScheduleBoard';

export default async function Home() {
  // Detect the current week + fetch its games server-side (fast first paint).
  const [{ week: currentWeek }, matchups] = await Promise.all([
    getCurrentWeekInfo(),
    getCurrentWeekMatchups(),
  ]);

  // Prefer the week the games actually belong to (keeps stepper + list in sync).
  const initialMatchups: Matchup[] = matchups;
  const week = initialMatchups[0]?.week ?? currentWeek;

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
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--subtext)' }}>2026 Season</span>
        </div>
      </header>

      {/* Content — bottom padding clears the persistent app BottomNav. */}
      <main
        className="mx-auto w-full max-w-[600px] flex-1 px-4 pt-4"
        style={{ paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)' }}
      >
        <ScheduleBoard currentWeek={week} initialMatchups={initialMatchups} />
      </main>
    </div>
  );
}
