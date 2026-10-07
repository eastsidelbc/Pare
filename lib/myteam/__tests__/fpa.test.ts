import { describe, it, expect } from 'vitest';
import { buildFpaTable, playedWeeks } from '../fpa';
import type { PlayerGameLine } from '../types';
import { loadFixture, toGameLines, type SleeperComLine } from './fixtures';

const RULES = { rush_yd: 0.1, rush_td: 6, rec: 1, rec_yd: 0.1, sack: 1, int: 2 };

/** Week 1: X vs Y. Week 2: Y vs Z (X on bye). */
const LINES: PlayerGameLine[] = [
  { playerId: 'a', position: 'RB', team: 'X', opponent: 'Y', week: 1, stats: { rush_yd: 100, rush_td: 1 } }, // 16
  { playerId: 'b', position: 'WR', team: 'X', opponent: 'Y', week: 1, stats: { rec: 5, rec_yd: 50 } }, // 10
  { playerId: 'c', position: 'RB', team: 'Y', opponent: 'X', week: 1, stats: { rush_yd: 40 } }, // 4
  { playerId: 'd', position: 'RB', team: 'Z', opponent: 'Y', week: 2, stats: { rush_yd: 60 } }, // 6
  { playerId: 'e', position: 'RB', team: 'Z', opponent: 'Y', week: 2, stats: { rush_yd: 15, rush_td: 1 } }, // 7.5
  { playerId: 'Z', position: 'DEF', team: 'Z', opponent: 'Y', week: 2, stats: { sack: 2, int: 1 } }, // 4 (Z's D vs Y's offense)
];

describe('buildFpaTable (hand-computed)', () => {
  const t = buildFpaTable(LINES, RULES);

  it('credits points to the team the player faced', () => {
    expect(t.Y.RB[1]).toEqual({ pts: 16, games: 1 });
    expect(t.Y.WR[1]).toEqual({ pts: 10, games: 1 });
    expect(t.X.RB[1]).toEqual({ pts: 4, games: 1 });
    expect(t.Y.RB[2]).toEqual({ pts: 13.5, games: 1 });
  });
  it('a played week with no lines at a position is a 0-point game, not missing', () => {
    expect(t.Y.TE[1]).toEqual({ pts: 0, games: 1 });
    expect(t.Z.RB[2]).toEqual({ pts: 0, games: 1 });
  });
  it('D/ST: DEF lines are credited to the OFFENSE they faced', () => {
    expect(t.Y.DEF[2]).toEqual({ pts: 4, games: 1 });
    expect(t.Z.DEF[2]).toEqual({ pts: 0, games: 1 });
  });
  it('byes leave no cell; playedWeeks lists only games', () => {
    expect(t.X.RB[2]).toBeUndefined();
    expect(playedWeeks(t, 'X')).toEqual([1]);
    expect(playedWeeks(t, 'Y')).toEqual([1, 2]);
    expect(playedWeeks(t, 'NOPE')).toEqual([]);
  });
});

describe('oracle: matches Sleeper fan_pts_allow_* on real week-4 lines', () => {
  const raw = loadFixture<SleeperComLine[]>('sleeper-com-stats-w4.json');
  // Score each line with Sleeper's own PPR total so the oracle tests aggregation only.
  const t = buildFpaTable(toGameLines(raw), { pts_ppr: 1 });
  const defLines = raw.filter((l) => l.player.position === 'DEF');

  it('every DEF line\'s fan_pts_allow_{qb,rb,wr,te,k} equals our table cell', () => {
    let compared = 0;
    for (const d of defLines) {
      for (const pos of ['QB', 'RB', 'WR', 'TE', 'K'] as const) {
        const expected = d.stats[`fan_pts_allow_${pos.toLowerCase()}`];
        if (expected === undefined) continue;
        expect(t[d.team][pos][d.week].pts).toBeCloseTo(expected, 2);
        compared++;
      }
    }
    expect(compared).toBe(160);
  });
  it('all 32 teams that played in week 4 have cells', () => {
    expect(Object.keys(t).length).toBe(defLines.length);
  });
});
