/**
 * useMyTeamLive — game-day points for my roster (P6, plan docs/plans/my-team-fantasy.md).
 *
 * Polls /api/myteam/live every LIVE_POLL_MS (60s) ONLY while shouldPollMyTeam
 * says so: one of my players' games is in its live window (read from
 * ScheduleProvider's existing ESPN poll — no second useLiveScores), the tab is
 * visible, this route is mounted (unmount = effects cleaned up), and not all my
 * games are final. Outside that: at most one fetch when the week has started and
 * nothing is on screen yet, plus one when the last game goes final. No timer
 * ticks at rest — the gate is re-checked only at the next kickoff boundary.
 * Errors keep the last good points (liveReducer).
 */

'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useSchedule } from '@/components/schedule/ScheduleProvider';
import {
  INITIAL_LIVE, LIVE_POLL_MS, liveReducer, myWeekGames, nextGateChangeMs, scheduleGate, shouldPollMyTeam, weekStarted,
  type LiveState,
} from '@/lib/myteam/livePoll';
import type { LivePoints } from '@/lib/myteam/types';
import type { Matchup } from '@/lib/schedule';

export interface MyTeamLive {
  state: LiveState;
  /** This week's games involving my roster's teams (live state / clock from ESPN). */
  games: Matchup[];
  /** Currently polling every 60s. */
  polling: boolean;
  /** One of my games has kicked off — the points column shows. */
  started: boolean;
  allFinal: boolean;
}

const NO_GAMES: Matchup[] = [];

export function useMyTeamLive({
  leagueId, userId, week, teams,
}: {
  leagueId: string | null;
  userId: string | null;
  week: number;
  /** My roster's NFL teams. */
  teams: ReadonlySet<string>;
}): MyTeamLive {
  const { weeks } = useSchedule();
  const weekGames = weeks[week]?.matchups ?? NO_GAMES;
  const games = useMemo(() => myWeekGames(weekGames, teams), [weekGames, teams]);

  const [state, dispatch] = useReducer(liveReducer, INITIAL_LIVE);
  const stateRef = useRef(state);
  stateRef.current = state;
  const key = leagueId && userId ? `${leagueId}|${week}` : null;

  const [visible, setVisible] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (key) dispatch({ type: 'reset', key });
  }, [key]);

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    onChange();
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  // Re-check the gate exactly when a kickoff window opens/closes — no ticking all week.
  useEffect(() => {
    const at = nextGateChangeMs(games, Date.now());
    if (at === null) return;
    const t = setTimeout(() => setNow(Date.now()), Math.min(Math.max(at - Date.now() + 50, 0), 2_147_000_000));
    return () => clearTimeout(t);
  }, [games, now]);

  const { liveWindow, allFinal } = scheduleGate(games, now);
  // mounted: this hook only runs while the /myteam route is on screen.
  const polling = shouldPollMyTeam({ liveWindow, visible, mounted: true, allFinal });
  const started = weekStarted(games);

  const fetchOnce = useCallback(
    async (signal: AbortSignal) => {
      if (!key || !leagueId || !userId) return;
      try {
        const res = await fetch(
          `/api/myteam/live?id=${encodeURIComponent(leagueId)}&uid=${encodeURIComponent(userId)}&w=${week}`,
          { cache: 'no-store', signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const points = (await res.json()) as LivePoints;
        dispatch({ type: 'success', key, points, at: Date.now() });
      } catch {
        if (!signal.aborted) dispatch({ type: 'error' });
      }
    },
    [key, leagueId, userId, week],
  );

  /** Last good points for this key are younger than one interval. */
  const fresh = () => {
    const s = stateRef.current;
    return s.key === key && s.updatedAt !== null && Date.now() - s.updatedAt < LIVE_POLL_MS;
  };

  // The 60s poll — only while the gate is open.
  useEffect(() => {
    if (!key || !polling) return;
    const ctrl = new AbortController();
    if (!fresh()) void fetchOnce(ctrl.signal); // back from the background → catch up once
    const id = setInterval(() => void fetchOnce(ctrl.signal), LIVE_POLL_MS);
    return () => {
      clearInterval(id);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, polling, fetchOnce]);

  // Not polling, but games have been played and nothing is on screen (e.g. Monday morning) → one fetch.
  // The last game going final → one more, for the final numbers.
  const finalFetched = useRef<string | null>(null);
  useEffect(() => {
    if (!key || polling || !visible || !started) return;
    const needFinal = allFinal && finalFetched.current !== key;
    const haveNone = !(stateRef.current.key === key && stateRef.current.points);
    if (!needFinal && !haveNone) return;
    if (allFinal) finalFetched.current = key;
    const ctrl = new AbortController();
    void fetchOnce(ctrl.signal);
    return () => ctrl.abort();
  }, [key, polling, visible, started, allFinal, fetchOnce]);

  return { state, games, polling, started, allFinal };
}
