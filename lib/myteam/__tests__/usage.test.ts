import { describe, expect, it } from 'vitest';
import { buildUsage, pickUsage, summarizeUsage, type UsageWeek } from '@/lib/myteam/usage';
import type { PlayerGameLine } from '@/lib/myteam/types';

const PPR = { rec: 1, rec_yd: 0.1, rush_yd: 0.1, rec_td: 6, rush_td: 6 };

function line(playerId: string, team: string, week: number, position: PlayerGameLine['position'], stats: Record<string, number>): PlayerGameLine {
  return { playerId, team, opponent: 'X', week, position, stats };
}

describe('buildUsage', () => {
  const lines = [
    line('wr1', 'DAL', 1, 'WR', { rec: 6, rec_yd: 80, rec_tgt: 9, rec_air_yd: 100, off_snp: 60, tm_off_snp: 64, pos_rank_ppr: 8 }),
    line('te1', 'DAL', 1, 'TE', { rec: 3, rec_yd: 30, rec_tgt: 3, rec_air_yd: 20, off_snp: 40, tm_off_snp: 64, pos_rank_ppr: 999 }),
    line('qb1', 'DAL', 1, 'QB', { pass_yd: 250 }),
    line('wr1', 'DAL', 2, 'WR', { rec: 2, rec_yd: 20, rec_tgt: 3, rec_air_yd: 40, off_snp: 50, tm_off_snp: 60, pos_rank_ppr: 40 }),
    line('te1', 'DAL', 2, 'TE', { rec: 4, rec_yd: 50, rec_tgt: 9, rec_air_yd: 60, off_snp: 55, tm_off_snp: 60 }),
    line('k1', 'DAL', 2, 'K', { fgm: 2 }),
  ];
  const usage = buildUsage(lines, PPR);

  it('team sums per week, league-scored points, unranked → null', () => {
    expect(usage.wr1[0]).toEqual({ week: 1, pts: 14, snaps: 60, teamSnaps: 64, tgt: 9, teamTgt: 12, air: 100, teamAir: 120, posRank: 8 });
    expect(usage.te1[0].posRank).toBeNull();
    expect(usage.k1).toBeUndefined();
  });
  it('pickUsage keeps only the asked players', () => {
    expect(Object.keys(pickUsage(usage, ['wr1', 'nobody']))).toEqual(['wr1']);
  });
  it('season summary: shares are sum ÷ sum, WOPR for WR', () => {
    const s = summarizeUsage(usage.wr1, 'season', 'WR');
    expect(s.games).toBe(2);
    // 6 rec + 8.0 yd pts = 14; 2 rec + 2.0 = 4
    expect(s.ptsPerGame).toBeCloseTo((14 + 4) / 2, 10);
    expect(s.targetShare).toBeCloseTo(12 / 24, 10);
    expect(s.airShare).toBeCloseTo(140 / 220, 10);
    expect(s.snapPct).toBeCloseTo(110 / 124, 10);
    expect(s.boomPct).toBe(0.5);
    expect(s.wopr).toBeCloseTo(1.5 * 0.5 + 0.7 * (140 / 220), 10);
  });
  it('QB: no target share / WOPR', () => {
    const s = summarizeUsage(usage.qb1, 'season', 'QB');
    expect(s.targetShare).toBeNull();
    expect(s.wopr).toBeNull();
  });
});

describe('summarizeUsage — windows', () => {
  const weeks: UsageWeek[] = [1, 2, 3, 4, 5, 6].map((week) => ({ week, pts: week * 2, snaps: week === 3 ? 0 : 50, teamSnaps: 60, tgt: 5, teamTgt: 30, air: 50, teamAir: 300, posRank: null }));
  it('last 4 = last four games played (a 0-snap week is skipped)', () => {
    const s = summarizeUsage(weeks, 'last4', 'RB');
    expect(s.games).toBe(4);
    expect(s.ptsPerGame).toBeCloseTo((4 + 8 + 10 + 12) / 4, 10);
    expect(s.boomPct).toBeNull();
  });
  it('no weeks → empty summary', () => {
    expect(summarizeUsage(undefined, 'season', 'WR').games).toBe(0);
  });
});
