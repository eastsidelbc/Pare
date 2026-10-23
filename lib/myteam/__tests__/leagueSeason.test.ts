import { describe, expect, it } from 'vitest';
import { allPlayRecord, buildLeagueSeason, sleeperPoints, type RosterSeasonRaw, type WeekScore } from '@/lib/myteam/leagueSeason';
import { loadFixture } from './fixtures';

const rosters = loadFixture<RosterSeasonRaw[]>('sleeper-rosters.json');
const w4 = loadFixture<WeekScore[]>('sleeper-matchups-w4.json');

describe('sleeperPoints', () => {
  it('whole + hundredths', () => {
    expect(sleeperPoints(380, 54)).toBeCloseTo(380.54, 10);
    expect(sleeperPoints(undefined, 5)).toBeNull();
  });
});

describe('allPlayRecord — fixture week 4 (10 teams)', () => {
  it('roster 2 (201.7, the top score) beats all 9', () => {
    expect(allPlayRecord([w4], 2)).toEqual({ wins: 9, losses: 0, ties: 0, expectedWins: 1, weeks: 1 });
  });
  it('roster 4 (103.72, the low score) loses to all 9', () => {
    const r = allPlayRecord([w4], 4);
    expect([r.wins, r.losses, r.expectedWins]).toEqual([0, 9, 0]);
  });
  it('an unplayed week (all zeros) is skipped; ties count half', () => {
    const zero = w4.map((m) => ({ ...m, points: 0 }));
    expect(allPlayRecord([zero], 2).weeks).toBe(0);
    const tie: WeekScore[] = [{ roster_id: 1, points: 100 }, { roster_id: 2, points: 100 }, { roster_id: 3, points: 50 }];
    expect(allPlayRecord([tie], 1)).toEqual({ wins: 1, losses: 0, ties: 1, expectedWins: 0.75, weeks: 1 });
  });
});

describe('buildLeagueSeason', () => {
  it('record, points rank, bench left, luck', () => {
    const first = rosters[0];
    const s = buildLeagueSeason(rosters, first.roster_id, [w4]);
    expect(s?.wins).toBe(first.settings?.wins);
    expect(s?.teams).toBe(rosters.length);
    expect(s?.pointsFor).toBeCloseTo(380.54, 10);
    expect(s?.benchLeft).toBeCloseTo(449.54 - 380.54, 10);
    expect(s?.pointsRank).toBeGreaterThanOrEqual(1);
    expect(s?.luck).toBeCloseTo((s?.wins ?? 0) - (s?.expectedWins ?? 0), 10);
  });
  it('unknown roster → null', () => {
    expect(buildLeagueSeason(rosters, 999, [w4])).toBeNull();
  });
});
