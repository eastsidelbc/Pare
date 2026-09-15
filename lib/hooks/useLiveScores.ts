/**
 * useLiveScores — live score/clock/state for the schedule, for FREE.
 *
 * WHY IT'S CHEAP:
 *   ESPN's scoreboard endpoint is CORS-open, so we poll it DIRECTLY from the
 *   browser — never through our own API route. ESPN's CDN absorbs the traffic;
 *   our server does zero work no matter how many viewers. One request returns
 *   the whole week's games.
 *
 * POLICY:
 *   • Poll ONLY while at least one loaded game is live (`state === 'in'`).
 *   • Interval = 15s (ESPN itself refreshes ~every 15–20s; faster is wasted).
 *   • Skip ticks while the tab is hidden; fire one immediately on refocus.
 *   • 8s timeout; failures are swallowed → last-known data stays. Pure
 *     progressive enhancement.
 *
 * The merge (by matchup id, change-detected) lives in ScheduleProvider's
 * `patchLiveMatchups`; this hook just fetches, maps, and hands it the games.
 */

'use client';

import { useEffect, useRef } from 'react';
import { mapEspnScoreboard, ESPN_SCOREBOARD_URL } from '@/lib/espnScoreboard';
import type { Matchup } from '@/lib/schedule';

const POLL_MS = 15_000;
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
  const hasLive = matchups.some((m) => m.state === 'in');

  // Keep `patch` in a ref so the effect only restarts on week / live flips.
  const patchRef = useRef(patch);
  patchRef.current = patch;

  useEffect(() => {
    if (!hasLive) return;

    let cancelled = false;

    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const url = `${ESPN_SCOREBOARD_URL}?seasontype=2&week=${pollWeek}`;
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        patchRef.current(mapEspnScoreboard(data, pollWeek));
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
  }, [pollWeek, hasLive]);
}
