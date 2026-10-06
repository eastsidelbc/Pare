import { describe, it, expect } from 'vitest';
import { mergeRefreshedWeek } from '@/lib/scheduleRefresh';
import type { Matchup } from '@/lib/schedule';

const team = (abbr: string) =>
  ({ abbr, name: abbr, location: abbr, nickname: abbr, espnId: 1, conference: 'AFC', division: 'East' }) as Matchup['away'];

const game = (over: Partial<Matchup> = {}): Matchup => ({
  id: '2026-w7-NE-CHI',
  week: 7,
  away: team('NE'),
  home: team('CHI'),
  kickoff: new Date(Date.UTC(2026, 9, 23, 0, 15)),
  state: 'pre',
  completed: false,
  statusDetail: '10/22 - 8:15 PM EDT',
  awayScore: null,
  homeScore: null,
  winner: null,
  odds: null,
  awayRecord: '2-2',
  homeRecord: '3-1',
  network: 'Prime',
  espnEventId: '401873010',
  ...over,
});

const LINE = { spread: 'CHI -3.5', overUnder: 44.5 };

describe('mergeRefreshedWeek', () => {
  it('fills in a line ESPN posted after the week was loaded', () => {
    const merged = mergeRefreshedWeek([game()], [game({ odds: LINE })]);
    expect(merged?.[0].odds).toEqual(LINE);
  });

  it('returns null when nothing changed (no re-render)', () => {
    expect(mergeRefreshedWeek([game({ odds: LINE })], [game({ odds: LINE })])).toBeNull();
  });

  it('keeps unchanged games as the same object', () => {
    const a = game();
    const b = game({ id: '2026-w7-BUF-MIA' });
    const merged = mergeRefreshedWeek([a, b], [game(), game({ id: '2026-w7-BUF-MIA', odds: LINE })]);
    expect(merged?.[0]).toBe(a);
    expect(merged?.[1]).not.toBe(b);
  });

  it('never erases a known line', () => {
    const merged = mergeRefreshedWeek(
      [game({ odds: LINE })],
      [game({ odds: null, awayRecord: '3-2' })],
    );
    expect(merged?.[0].odds).toEqual(LINE);
    expect(merged?.[0].awayRecord).toBe('3-2');
  });

  it('never steps a game backwards behind the live poll', () => {
    const live = game({ state: 'in', awayScore: 7, homeScore: 3, statusDetail: 'Q2 4:10' });
    const merged = mergeRefreshedWeek([live], [game({ state: 'pre', odds: LINE })]);
    expect(merged?.[0].state).toBe('in');
    expect(merged?.[0].awayScore).toBe(7);
    expect(merged?.[0].odds).toEqual(LINE); // only the missing line is filled
  });

  it('leaves an in-progress game to the live poll', () => {
    const live = game({ state: 'in', awayScore: 14, statusDetail: 'Q3 2:00' });
    expect(mergeRefreshedWeek([live], [game({ state: 'in', awayScore: 7 })])).toBeNull();
  });

  it('moves a game forward (pre → post) when the fresh copy is ahead', () => {
    const merged = mergeRefreshedWeek(
      [game({ odds: LINE })],
      [game({ state: 'post', completed: true, awayScore: 20, homeScore: 17, winner: 'away' })],
    );
    expect(merged?.[0].state).toBe('post');
    expect(merged?.[0].odds).toEqual(LINE);
  });

  it('treats an empty fresh list as a failed fetch', () => {
    expect(mergeRefreshedWeek([game()], [])).toBeNull();
  });

  it('fills a week that was empty', () => {
    expect(mergeRefreshedWeek([], [game()])).toHaveLength(1);
  });
});
