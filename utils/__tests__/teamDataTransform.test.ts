import { describe, it, expect } from 'vitest';
import { transformTeamDataByMode } from '../teamDataTransform';
import type { TeamData } from '../../lib/useNflStats';

const team: TeamData = {
  team: 'A',
  g: '4',
  points: '100',
  total_yards: '1600',
  third_down_pct: '45.5',
  record: '3-1',
};

describe('transformTeamDataByMode — per-game', () => {
  it('divides counting stats by games played', () => {
    const out = transformTeamDataByMode(team, 'per-game')!;
    expect(out.points).toBe(25); // 100 / 4
    expect(out.total_yards).toBe(400); // 1600 / 4
  });

  it('leaves percentages, record and games untouched', () => {
    const out = transformTeamDataByMode(team, 'per-game')!;
    expect(out.third_down_pct).toBe('45.5'); // pct never divided
    expect(out.record).toBe('3-1'); // W-L string never divided
    expect(out.g).toBe('4'); // games never divided by games
  });
});

describe('transformTeamDataByMode — total', () => {
  it('converts counting stats to numbers without dividing', () => {
    const out = transformTeamDataByMode(team, 'total')!;
    expect(out.points).toBe(100);
    expect(out.total_yards).toBe(1600);
  });
});

describe('transformTeamDataByMode — guards', () => {
  it('returns null for null input', () => {
    expect(transformTeamDataByMode(null, 'per-game')).toBeNull();
  });
});
