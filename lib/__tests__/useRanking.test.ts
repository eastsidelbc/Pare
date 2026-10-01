import { describe, it, expect } from 'vitest';
import { calculateBulkRanking } from '../useRanking';
import type { TeamData } from '../useNflStats';

const data: TeamData[] = [
  { team: 'A', points: '30' },
  { team: 'B', points: '20' },
  { team: 'C', points: '20' }, // tie with B
  { team: 'D', points: '10' },
];

describe('calculateBulkRanking', () => {
  it('ranks higher-is-better correctly', () => {
    const r = calculateBulkRanking(data, 'points', ['A', 'D'], { higherIsBetter: true });
    expect(r['A']?.rank).toBe(1);
    expect(r['A']?.formattedRank).toBe('1st');
    expect(r['D']?.rank).toBe(4);
    expect(r['D']?.formattedRank).toBe('4th');
  });

  it('shares rank and flags ties', () => {
    const r = calculateBulkRanking(data, 'points', ['B', 'C'], { higherIsBetter: true });
    expect(r['B']?.rank).toBe(2);
    expect(r['B']?.isTied).toBe(true);
    expect(r['B']?.formattedRank).toBe('T-2nd');
    expect(r['C']?.rank).toBe(2);
  });

  it('inverts for lower-is-better (defense "allowed" context)', () => {
    const r = calculateBulkRanking(data, 'points', ['D'], { higherIsBetter: false });
    expect(r['D']?.rank).toBe(1); // fewest points allowed = best defense
  });

  it('produces correct ordinals past 20 (regression for the "21th/31th" bug)', () => {
    const many: TeamData[] = Array.from({ length: 32 }, (_, i) => ({
      team: `T${i}`,
      points: String(100 - i), // strictly descending → unique ranks 1..32
    }));
    const r = calculateBulkRanking(many, 'points', ['T20', 'T30'], { higherIsBetter: true });
    expect(r['T20']?.formattedRank).toBe('21st');
    expect(r['T30']?.formattedRank).toBe('31st');
  });

  it('excludes special-team rows from the field', () => {
    const withSpecial: TeamData[] = [...data, { team: 'League Total', points: '80' }];
    const r = calculateBulkRanking(withSpecial, 'points', ['A'], { higherIsBetter: true });
    // "League Total" (80) is excluded, so A (30) is still #1 of the 4 real teams.
    expect(r['A']?.rank).toBe(1);
    expect(r['A']?.totalTeams).toBe(4);
  });
});
