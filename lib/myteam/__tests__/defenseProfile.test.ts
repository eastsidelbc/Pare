import { describe, it, expect } from 'vitest';
import { POSITION_PROFILE, whyStats, type DefenseGame, type OffenseGame } from '../defenseProfile';

const dg = (team: string, week: number, o: Partial<DefenseGame> = {}): DefenseGame => ({
  team, week, pass_yds: 200, rush_yds: 100, pass_td: 1, rush_td: 1, int: 1, sacks: 2, points: 20, red_zone_att: 3, drives: 12, ...o,
});
const og = (team: string, week: number, o: Partial<OffenseGame> = {}): OffenseGame => ({
  team, week, turnovers: 1, sacks_allowed: 2, points: 20, ...o,
});

describe('POSITION_PROFILE', () => {
  it('maps each position to the planned "why" stats', () => {
    expect(POSITION_PROFILE.QB.stats).toEqual(['pass_yds', 'pass_td', 'int', 'sacks']);
    expect(POSITION_PROFILE.RB.stats).toEqual(['rush_yds', 'rush_td']);
    expect(POSITION_PROFILE.WR.stats).toEqual(['pass_yds', 'pass_td']);
    expect(POSITION_PROFILE.TE.stats).toEqual(['pass_yds', 'pass_td']);
    expect(POSITION_PROFILE.K.stats).toEqual(['points', 'rz_per_drive']);
    expect(POSITION_PROFILE.DEF).toEqual({ side: 'offense', stats: ['turnovers', 'sacks_allowed', 'points'] });
  });
});

describe('whyStats', () => {
  const defense = [
    dg('A', 1, { rush_yds: 60, int: 3 }),
    dg('B', 1, { rush_yds: 150, int: 0 }),
    dg('C', 1, { rush_yds: 100, int: 1 }),
  ];

  it('defense ranks: fewest allowed = #1 (bad run D ranks last)', () => {
    const rb = whyStats('RB', 'B', defense, [], 'season');
    expect(rb.map((s) => s.key)).toEqual(['rush_yds', 'rush_td']);
    expect(rb[0]).toMatchObject({ value: 150, rank: 3, formattedRank: '3rd' });
    expect(whyStats('RB', 'A', defense, [], 'season')[0].rank).toBe(1);
  });
  it('forced stats rank the other way: most INT = #1', () => {
    const qb = whyStats('QB', 'A', defense, [], 'season');
    expect(qb.find((s) => s.key === 'int')?.rank).toBe(1);
    expect(whyStats('QB', 'B', defense, [], 'season').find((s) => s.key === 'int')?.rank).toBe(3);
  });
  it('K: red-zone trips per drive is a ratio of window sums, not a mean of ratios', () => {
    const k = whyStats('K', 'A', [dg('A', 1, { red_zone_att: 1, drives: 10 }), dg('A', 2, { red_zone_att: 3, drives: 5 })], [], 'season');
    expect(k.find((s) => s.key === 'rz_per_drive')?.value).toBeCloseTo(4 / 15); // not (0.1 + 0.6) / 2
    expect(k.find((s) => s.key === 'points')?.value).toBe(20);
  });
  it('Last 4 uses only the last 4 games played (bye skipped)', () => {
    const log = [1, 2, 3, 5, 6].map((w) => dg('A', w, { pass_yds: w === 1 ? 500 : 100 }));
    expect(whyStats('WR', 'A', log, [], 'season')[0].value).toBe(180);
    expect(whyStats('WR', 'A', log, [], 'last4')[0].value).toBe(100);
  });
  it('D/ST reads the opposing OFFENSE: turnover-prone offense ranks last', () => {
    const offense = [og('X', 1, { turnovers: 4, points: 10 }), og('Y', 1, { turnovers: 0, points: 30 })];
    const dst = whyStats('DEF', 'X', [], offense, 'season');
    expect(dst.map((s) => s.key)).toEqual(['turnovers', 'sacks_allowed', 'points']);
    expect(dst[0]).toMatchObject({ value: 4, rank: 2 });
    expect(dst[2]).toMatchObject({ value: 10, rank: 2 }); // fewer points scored = worse offense
  });
  it('unknown opponent → no stats', () => {
    expect(whyStats('RB', 'NOPE', defense, [], 'season')).toEqual([]);
  });
});
