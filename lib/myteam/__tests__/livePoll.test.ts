import { describe, it, expect } from 'vitest';
import { KICKOFF_LEAD_MS, LATE_START_GRACE_MS } from '@/lib/liveWindow';
import {
  INITIAL_LIVE, LIVE_POLL_MS, liveReducer, myWeekGames, nextGateChangeMs, scheduleGate, shouldPollMyTeam, startersTotal, weekStarted,
  type LiveGame, type LiveState, type PollGate,
} from '../livePoll';
import type { LivePoints } from '../types';
import matchupsW4 from '../__fixtures__/sleeper-matchups-w4.json';

const NOW = Date.parse('2026-10-11T18:00:00Z');
const game = (away: string, home: string, state: LiveGame['state'], kickoffMs: number): LiveGame => ({
  away: { abbr: away }, home: { abbr: home }, state, kickoff: new Date(kickoffMs),
});

describe('shouldPollMyTeam (poll gate)', () => {
  const on: PollGate = { liveWindow: true, visible: true, mounted: true, allFinal: false };
  it('true only inside the live window while visible and mounted', () => {
    expect(shouldPollMyTeam(on)).toBe(true);
  });
  it('false outside the live window', () => {
    expect(shouldPollMyTeam({ ...on, liveWindow: false })).toBe(false);
  });
  it('false when the tab is hidden', () => {
    expect(shouldPollMyTeam({ ...on, visible: false })).toBe(false);
  });
  it('false when unmounted / off the route', () => {
    expect(shouldPollMyTeam({ ...on, mounted: false })).toBe(false);
  });
  it('false when all my games are final', () => {
    expect(shouldPollMyTeam({ ...on, allFinal: true })).toBe(false);
  });
  it('every other combination is false', () => {
    const keys = ['liveWindow', 'visible', 'mounted', 'allFinal'] as const;
    for (let mask = 0; mask < 16; mask++) {
      const g = Object.fromEntries(keys.map((k, i) => [k, !!(mask & (1 << i))])) as unknown as PollGate;
      expect(shouldPollMyTeam(g)).toBe(g.liveWindow && g.visible && g.mounted && !g.allFinal);
    }
  });
  it('interval is 60s (Sleeper CDN s-maxage=60)', () => {
    expect(LIVE_POLL_MS).toBe(60_000);
  });
});

describe('schedule-derived gate inputs', () => {
  it('live game → in window; far-future kickoff → not; all post → allFinal', () => {
    expect(scheduleGate([game('KC', 'LV', 'in', NOW - 3600_000)], NOW)).toEqual({ liveWindow: true, allFinal: false });
    expect(scheduleGate([game('KC', 'LV', 'pre', NOW + 2 * 3600_000)], NOW)).toEqual({ liveWindow: false, allFinal: false });
    expect(scheduleGate([game('KC', 'LV', 'pre', NOW + KICKOFF_LEAD_MS - 1)], NOW).liveWindow).toBe(true);
    expect(scheduleGate([game('KC', 'LV', 'post', NOW - 4 * 3600_000), game('A', 'B', 'post', NOW)], NOW)).toEqual({ liveWindow: false, allFinal: true });
    expect(scheduleGate([], NOW)).toEqual({ liveWindow: false, allFinal: false });
  });
  it('only my teams count; weekStarted once any of mine kicked off', () => {
    const games = [game('KC', 'LV', 'in', NOW), game('DAL', 'NYG', 'pre', NOW + 1e7)];
    expect(myWeekGames(games, new Set(['NYG'])).map((g) => g.home.abbr)).toEqual(['NYG']);
    expect(weekStarted(myWeekGames(games, new Set(['NYG'])))).toBe(false);
    expect(weekStarted(myWeekGames(games, new Set(['LV', 'NYG'])))).toBe(true);
  });
  it('next gate change = the nearest kickoff − lead or kickoff + grace still ahead', () => {
    const k = NOW + 5 * 3600_000;
    expect(nextGateChangeMs([game('KC', 'LV', 'pre', k)], NOW)).toBe(k - KICKOFF_LEAD_MS);
    expect(nextGateChangeMs([game('KC', 'LV', 'pre', NOW - 60_000)], NOW)).toBe(NOW - 60_000 + LATE_START_GRACE_MS);
    expect(nextGateChangeMs([game('KC', 'LV', 'in', k), game('A', 'B', 'post', k)], NOW)).toBeNull();
  });
});

describe('liveReducer', () => {
  const pts = (byPlayer: Record<string, number>, total = 0): LivePoints => ({ week: 6, total, byPlayer });
  const KEY = '900|6';
  const start = liveReducer(INITIAL_LIVE, { type: 'reset', key: KEY });

  it('first success stores points without deltas', () => {
    const s = liveReducer(start, { type: 'success', key: KEY, points: pts({ a: 10, b: 0 }, 10), at: 1 });
    expect(s).toMatchObject({ key: KEY, stale: false, updatedAt: 1, deltas: {}, seq: 0 });
    expect(s.points?.byPlayer).toEqual({ a: 10, b: 0 });
  });

  it('later successes record positive changes only ("+N.N" flash), cents-exact', () => {
    let s = liveReducer(start, { type: 'success', key: KEY, points: pts({ a: 10.1, b: 5, c: 3 }), at: 1 });
    s = liveReducer(s, { type: 'success', key: KEY, points: pts({ a: 12.7, b: 4, c: 3 }), at: 2 });
    expect(s.deltas).toEqual({ a: 2.6 });
    expect(s.seq).toBe(1);
    s = liveReducer(s, { type: 'success', key: KEY, points: pts({ a: 12.7, b: 4, c: 3 }), at: 3 });
    expect(s.deltas).toEqual({});
    expect(s.seq).toBe(1);
  });

  it('last-good on error: points stay, marked stale; next success clears stale', () => {
    let s: LiveState = liveReducer(start, { type: 'success', key: KEY, points: pts({ a: 8 }, 8), at: 5 });
    s = liveReducer(s, { type: 'error' });
    expect(s.points?.byPlayer).toEqual({ a: 8 });
    expect(s.points?.total).toBe(8);
    expect(s.stale).toBe(true);
    expect(s.updatedAt).toBe(5);
    expect(liveReducer(s, { type: 'error' })).toBe(s);
    s = liveReducer(s, { type: 'success', key: KEY, points: pts({ a: 9 }, 9), at: 6 });
    expect(s).toMatchObject({ stale: false, updatedAt: 6, deltas: { a: 1 } });
  });

  it('an error before any success shows nothing (no fake zeros)', () => {
    expect(liveReducer(start, { type: 'error' }).points).toBeNull();
  });

  it('a new league / week resets — no deltas against another roster', () => {
    let s = liveReducer(start, { type: 'success', key: KEY, points: pts({ a: 1 }), at: 1 });
    s = liveReducer(s, { type: 'reset', key: '901|6' });
    expect(s).toEqual({ ...INITIAL_LIVE, key: '901|6' });
    s = liveReducer(s, { type: 'success', key: '901|6', points: pts({ a: 30 }), at: 2 });
    expect(s.deltas).toEqual({});
  });
});

describe('startersTotal (roster total)', () => {
  it('sums starters only, cents-exact', () => {
    expect(startersTotal({ a: 0.1, b: 0.2, bench: 40 }, ['a', 'b'])).toBe(0.3);
    expect(startersTotal({ a: 12.34 }, ['a', 'missing'])).toBe(12.34);
  });
  it("equals Sleeper's roster `points` for every roster in the anonymized P0a week-4 matchups", () => {
    type Row = { roster_id: number; points: number; starters: string[]; players_points: Record<string, number> };
    const rows = matchupsW4 as unknown as Row[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(startersTotal(r.players_points, r.starters)).toBe(r.points);
  });
});
