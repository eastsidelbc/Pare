import { describe, it, expect } from 'vitest';
import { areValuesEqual, rankAll, rankAmong, RANK_TIE_EPSILON } from '../ranking';

describe('areValuesEqual', () => {
  it('ties values inside the 0.001 tolerance only', () => {
    expect(RANK_TIE_EPSILON).toBe(0.001);
    expect(areValuesEqual(5.7, 5.7004)).toBe(true);
    expect(areValuesEqual(5.7, 5.702)).toBe(false);
  });
});

describe('rankAmong', () => {
  const values = [10, 8, 8, 5, NaN];
  it('ranks higher-is-better with T- ties', () => {
    expect(rankAmong(10, values)).toEqual({ rank: 1, formattedRank: '1st', isTied: false, teamsWithSameValue: 1 });
    expect(rankAmong(8, values)).toEqual({ rank: 2, formattedRank: 'T-2nd', isTied: true, teamsWithSameValue: 2 });
    expect(rankAmong(5, values).rank).toBe(4);
  });
  it('ranks lower-is-better (defense convention: fewest allowed = #1)', () => {
    expect(rankAmong(5, values, false).rank).toBe(1);
    expect(rankAmong(10, values, false).rank).toBe(4);
  });
  it('ignores NaN values', () => {
    expect(rankAmong(5, [NaN, NaN, 5]).rank).toBe(1);
  });
});

describe('rankAll', () => {
  it('ranks every key and drops NaN entries', () => {
    const r = rankAll(
      [
        ['A', 3],
        ['B', 1],
        ['C', 1],
        ['D', NaN],
      ] as const,
      false,
    );
    expect(r.get('B')?.formattedRank).toBe('T-1st');
    expect(r.get('C')?.formattedRank).toBe('T-1st');
    expect(r.get('A')?.rank).toBe(3);
    expect(r.has('D')).toBe(false);
  });
});
