/**
 * useLiveScores — live score/clock/state for the schedule.
 *
 * SOURCE:
 *   Polls our own `/api/live/scoreboard?week=N` (the browser never calls ESPN).
 *   The server fetches ESPN at most once per TTL for everyone (single-flight
 *   memory cache, 15s while live — lib/espnLive.ts) and returns the whole
 *   week's games already mapped; this hook only revives `kickoff` to a Date.
 *   If ESPN fails, the server answers with its last good copy (`stale: true`).
 *
 * POLICY:
 *   • Poll while at least one loaded game is live, OR is about to kick off /
 *     should have kicked off but ESPN still says "pre" (see lib/liveWindow.ts).
 *     That way a page opened BEFORE kickoff goes live on its own — no reload.
 *   • Re-check that window every 60s (cheap, no network) so polling switches
 *     on by itself as kickoff approaches, and off once every game is final.
 *   • Interval = 15s (ESPN itself refreshes ~every 15–20s; faster is wasted).
 *   • Skip ticks while the tab is hidden; fire one immediately on refocus.
 *   • 8s timeout; failures are swallowed → last-known data stays. Pure
 *     progressive enhancement.
 *
 * The merge (by matchup id, change-detected) lives in ScheduleProvider's
 * `patchLiveMatchups`; this hook just fetches, revives, and hands it the games.
 * A stale answer is still patched: it is never older than what this client last
 * got from us, and the merge ignores unchanged games.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { reviveMatchups, type LiveScoreboardResponse } from '@/lib/liveClient';
import { shouldPollLive } from '@/lib/liveWindow';
import type { Matchup } from '@/lib/schedule';

const POLL_MS = 15_000;
/** How often to re-evaluate the kickoff window (local check, no network). */
const WINDOW_CHECK_MS = 60_000;
const FETCH_TIMEOUT_MS = 8_000;

/**
 * @param pollWeek  The week to poll (the current NFL week — where live games are).
 * @param matchups  Currently loaded matchups; used only to gate polling.
 * @param patch     Merges the freshly-polled games into app state (by id).
 */
export function useLiveScores(
  pollWeek: number,
  matchups: Matchup[],
  patch: (live: Matchup[]) => void,
): void {
  // `shouldPoll` is state (not derived per render) because it also depends on
  // the CLOCK: a "pre" game enters the window as kickoff approaches with no
  // data change at all. setState with an unchanged boolean is a no-op, so the
  // 60s re-check doesn't re-render the screen unless the answer flips.
  const [shouldPoll, setShouldPoll] = useState(() => shouldPollLive(matchups, Date.now()));

  // Re-evaluate immediately whenever the loaded games change (e.g. a poll
  // flips the last game to "post" → stop), then every 60s for the clock.
  useEffect(() => {
    const check = () => setShouldPoll(shouldPollLive(matchups, Date.now()));
    check();
    const id = setInterval(check, WINDOW_CHECK_MS);
    return () => clearInterval(id);
  }, [matchups]);

  // Keep `patch` in a ref so the effect only restarts on week / poll flips.
  const patchRef = useRef(patch);
  patchRef.current = patch;

  useEffect(() => {
    if (!shouldPoll) return;

    let cancelled = false;

    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const url = `/api/live/scoreboard?week=${pollWeek}`;
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as LiveScoreboardResponse;
        if (cancelled) return;
        patchRef.current(reviveMatchups(body.matchups));
      } catch {
        // Swallow — keep last-known data. Live scores are best-effort.
      } finally {
        clearTimeout(timer);
      }
    };

    void tick();
    const id = setInterval(tick, POLL_MS);

    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pollWeek, shouldPoll]);
}
