/**
 * My Team live points (P6) — pure. No React, no fetch: the poll gate, the
 * live-points reducer (last-good on error, "+N.N" change deltas) and the
 * starters total. Used by lib/hooks/useMyTeamLive.ts; unit-tested in
 * lib/myteam/__tests__/livePoll.test.ts.
 *
 * Game state (live / final / kickoff) comes from ScheduleProvider's existing
 * ESPN poll — this module never adds a second one.
 */

import { KICKOFF_LEAD_MS, LATE_START_GRACE_MS, shouldPollLive } from '@/lib/liveWindow';
import type { Matchup } from '@/lib/schedule';
import type { LivePoints } from './types';

/** Poll interval — matches Sleeper's 60s CDN cache (`s-maxage=60`); P0b confirms it. Never go below. */
export const LIVE_POLL_MS = 60_000;

export type LiveGame = Pick<Matchup, 'state' | 'kickoff'> & { away: { abbr: string }; home: { abbr: string } };

/** This week's games involving my roster's NFL teams. */
export function myWeekGames<G extends LiveGame>(games: readonly G[], teams: ReadonlySet<string>): G[] {
  return games.filter((g) => teams.has(g.away.abbr) || teams.has(g.home.abbr));
}

export interface PollGate {
  /** A game of mine is live, or about to kick off / running late (lib/liveWindow rule). */
  liveWindow: boolean;
  /** Tab / app in the foreground. */
  visible: boolean;
  /** The My Team route is on screen. */
  mounted: boolean;
  /** Every one of my games this week is final. */
  allFinal: boolean;
}

/** Poll only while a game of mine is in its live window, the tab is visible, the route is mounted and not everything is final. */
export function shouldPollMyTeam({ liveWindow, visible, mounted, allFinal }: PollGate): boolean {
  return mounted && visible && liveWindow && !allFinal;
}

/** Gate inputs that come from the schedule (visible / mounted are added by the hook). */
export function scheduleGate(games: readonly LiveGame[], nowMs: number): Pick<PollGate, 'liveWindow' | 'allFinal'> {
  return {
    liveWindow: shouldPollLive(games, nowMs),
    allFinal: games.length > 0 && games.every((g) => g.state === 'post'),
  };
}

/** True once any of my games has kicked off (so there are points worth showing). */
export function weekStarted(games: readonly LiveGame[]): boolean {
  return games.some((g) => g.state === 'in' || g.state === 'post');
}

/**
 * Next instant the live window can open or close on its own (kickoff − lead,
 * or kickoff + grace for a game still listed "pre"); null if none ahead. The hook
 * re-checks the gate then instead of ticking a timer all week.
 */
export function nextGateChangeMs(games: readonly LiveGame[], nowMs: number): number | null {
  let next: number | null = null;
  for (const g of games) {
    if (g.state !== 'pre') continue;
    const k = new Date(g.kickoff).getTime();
    if (!Number.isFinite(k)) continue;
    for (const t of [k - KICKOFF_LEAD_MS, k + LATE_START_GRACE_MS]) {
      if (t > nowMs && (next === null || t < next)) next = t;
    }
  }
  return next;
}

/** Cents-exact sum (avoids 0.1 + 0.2 drift). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** My starters' points — what Sleeper calls the roster's `points` (checked against P0a data). */
export function startersTotal(byPlayer: Readonly<Record<string, number>>, starterIds: readonly string[]): number {
  return round2(starterIds.reduce((sum, id) => sum + (byPlayer[id] ?? 0), 0));
}

export interface LiveState {
  /** `${leagueId}|${week}` the points belong to. */
  key: string | null;
  /** Last good points (kept on error). */
  points: LivePoints | null;
  /** Positive per-player changes from the previous good poll (the gold "+N.N" flash). */
  deltas: Readonly<Record<string, number>>;
  /** Bumps when `deltas` change, so a flash can restart on a new change. */
  seq: number;
  /** The last request failed — the screen is showing the last good points. */
  stale: boolean;
  /** Time of the last good response (ms). */
  updatedAt: number | null;
}

export const INITIAL_LIVE: LiveState = { key: null, points: null, deltas: {}, seq: 0, stale: false, updatedAt: null };

export type LiveAction =
  | { type: 'success'; key: string; points: LivePoints; at: number }
  | { type: 'error' }
  | { type: 'reset'; key: string };

export function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case 'reset':
      return state.key === action.key ? state : { ...INITIAL_LIVE, key: action.key };
    case 'error':
      // Last-good: keep the points on screen, just mark them stale.
      return state.stale ? state : { ...state, stale: true };
    case 'success': {
      const prev = state.key === action.key ? state.points : null;
      const deltas: Record<string, number> = {};
      if (prev) {
        for (const [id, pts] of Object.entries(action.points.byPlayer)) {
          const before = prev.byPlayer[id];
          if (before === undefined) continue;
          const d = round2(pts - before);
          if (d > 0) deltas[id] = d;
        }
      }
      const changed = Object.keys(deltas).length > 0;
      return {
        key: action.key,
        points: action.points,
        deltas: changed ? deltas : {},
        seq: changed ? state.seq + 1 : state.seq,
        stale: false,
        updatedAt: action.at,
      };
    }
  }
}
