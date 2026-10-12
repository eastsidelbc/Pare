import { describe, it, expect } from 'vitest';
import type { FpaTable } from '../fpa';
import { FANTASY_POSITIONS, type FantasyPosition } from '../types';
import { chipText, fpaPerGame, rankFpa, rateMatchup, TIER_CUTOFFS, tierForRank, windowWeeks } from '../rating';

/** Table where each team allows `perWeek[team][i]` RB points in week weeks[i]. */
function table(perTeam: Record<string, Record<number, number>>): FpaTable {
  const t: FpaTable = {};
  for (const [team, weeks] of Object.entries(perTeam)) {
    t[team] = Object.fromEntries(FANTASY_POSITIONS.map((p) => [p, {}])) as FpaTable[string];
    for (const [w, pts] of Object.entries(weeks)) {
      for (const p of FANTASY_POSITIONS) t[team][p][Number(w)] = { pts: p === 'RB' ? pts : 0, games: 1 };
    }
  }
  return t;
}

describe('windowWeeks', () => {
  it('last4 = the last 4 games played, skipping a bye', () => {
    expect(windowWeeks([1, 2, 3, 5, 6, 7], 'last4')).toEqual([3, 5, 6, 7]);
  });
  it('season = every played week; fewer than 4 games → all of them', () => {
    expect(windowWeeks([3, 1, 2], 'season')).toEqual([1, 2, 3]);
    expect(windowWeeks([1, 2], 'last4')).toEqual([1, 2]);
  });
});

describe('fpaPerGame', () => {
  // Bye in week 4.
  const t = table({ T: { 1: 10, 2: 20, 3: 30, 5: 40, 6: 50 } });
  it('season average and last-4 average (bye skipped)', () => {
    expect(fpaPerGame(t, 'T', 'RB', 'season')).toBe(30);
    expect(fpaPerGame(t, 'T', 'RB', 'last4')).toBe(35); // weeks 2,3,5,6
  });
  it('null for unknown team', () => {
    expect(fpaPerGame(t, 'NOPE', 'RB', 'season')).toBeNull();
  });
});

describe('rankFpa + tiers (rank convention: #1 = fewest allowed)', () => {
  // 32 teams, team k allows k RB points per game (k = 1..32).
  const teams = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`T${i + 1}`, { 1: i + 1 }]));
  const ranks = rankFpa(table(teams), 'RB', 'season');

  it('fewest points allowed ranks #1, most ranks #32', () => {
    expect(ranks.get('T1')?.rank).toBe(1);
    expect(ranks.get('T32')?.rank).toBe(32);
    expect(ranks.get('T24')?.perGame).toBe(24);
  });
  it('tier cut-offs 1–5 / 6–12 / 13–20 / 21–27 / 28–32 (P4 picks)', () => {
    expect(TIER_CUTOFFS.map((c) => c.maxRank)).toEqual([5, 12, 20, 27, 32]);
    const at = (r: number) => tierForRank(r);
    expect([at(1), at(5), at(6), at(12), at(13), at(20), at(21), at(27), at(28), at(32)]).toEqual([
      'avoid', 'avoid', 'tough', 'tough', 'avg', 'avg', 'good', 'good', 'great', 'great',
    ]);
    expect(at(40)).toBe('great');
  });
  it('rateMatchup gives the chip: generous defense = Great; "Good · #24"', () => {
    expect(rateMatchup(ranks, 'T30')?.tier).toBe('great');
    expect(rateMatchup(ranks, 'T2')?.tier).toBe('avoid');
    expect(rateMatchup(ranks, 'T24')?.text).toBe('Good · #24');
    expect(rateMatchup(ranks, 'NOPE')).toBeNull();
  });
  it('ties render T- and share the tier of their rank', () => {
    const tied = rankFpa(table({ A: { 1: 5 }, B: { 1: 9 }, C: { 1: 9 }, D: { 1: 12 } }), 'RB', 'season');
    const b = rateMatchup(tied, 'B');
    expect(b?.formattedRank).toBe('T-2nd');
    expect(b?.isTied).toBe(true);
    expect(chipText('avoid', 2, true)).toBe('Avoid · T-2');
    expect(tied.get('D')?.rank).toBe(4);
  });
  it('the window changes the rank (Season vs Last 4)', () => {
    // A: one blowout in week 1, then shut down. B: steady 5.
    const t = table({ A: { 1: 40, 2: 1, 3: 1, 4: 1, 5: 1 }, B: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 } });
    const pos: FantasyPosition = 'RB';
    expect(rankFpa(t, pos, 'season').get('A')?.rank).toBe(2); // 8.8 vs 5
    expect(rankFpa(t, pos, 'last4').get('A')?.rank).toBe(1); // 1 vs 5
    expect(rankFpa(t, pos, 'season').get('A')?.perGame).toBeCloseTo(8.8);
  });
});
