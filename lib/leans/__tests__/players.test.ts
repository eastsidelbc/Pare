import { describe, expect, it } from 'vitest';
import type { PlayerGameLine } from '@/lib/myteam/types';
import { lineupCapSet } from '../backtest';
import { playedGame, selectPlayers } from '../players';

const line = (playerId: string, week: number, stats: Record<string, number>, position: PlayerGameLine['position'] = 'RB', team = 'ATL'): PlayerGameLine => ({
  playerId, position, team, opponent: 'LV', week, stats,
});

describe('playedGame (inactive weeks are not 0-stat games)', () => {
  it('gp > 0 → played; Sleeper\'s empty inactive row → not', () => {
    expect(playedGame(line('a', 1, { gp: 1, rush_yd: 0 }))).toBe(true);
    expect(playedGame(line('a', 2, {}))).toBe(false);
  });
  it('the rare row without gp but with real usage counts', () => {
    expect(playedGame(line('a', 3, { rush_att: 4, rush_yd: 12 }))).toBe(true);
  });
  it('selectPlayers keeps only played weeks; never-played players are dropped', () => {
    const players = selectPlayers(
      [line('a', 1, { gp: 1, rush_yd: 80, pts_ppr: 8 }), line('a', 2, {}), line('a', 3, { gp: 1, rush_yd: 60, pts_ppr: 6 }), line('b', 1, {}), line('b', 2, {})],
      { a: { name: 'A Back', team: 'ATL' }, b: { name: 'B Hurt', team: 'ATL' } },
    );
    expect(players.map((p) => p.id)).toEqual(['a']);
    expect(players[0].games.map((g) => g.week)).toEqual([1, 3]);
  });
});

describe('lineupCapSet (who the live app would have listed that week)', () => {
  it('top playersPerTeam by PPR before the week, team-at-week; week 1 = nobody', () => {
    const lines = ['r1', 'r2', 'r3', 'r4'].flatMap((id, i) => [
      line(id, 1, { gp: 1, pts_ppr: 20 - i * 5 }),
      line(id, 2, { gp: 1, pts_ppr: 1 }),
    ]);
    const cap = lineupCapSet(lines);
    expect([...cap].filter((k) => k.endsWith('|1'))).toEqual([]);
    expect([...cap].filter((k) => k.endsWith('|2')).sort()).toEqual(['r1|2', 'r2|2', 'r3|2']);
  });
});
