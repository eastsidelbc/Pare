import { describe, it, expect } from 'vitest';
import { toFantasyLeague, toFantasyUser, toGameLines, toLeagueDetail, type SleeperLeagueRaw } from '../sleeper/map';
import { toDefenseLog, toOffenseLog } from '../gameLog';
import type { TeamGameLine } from '@/lib/espnBoxscore';
import { loadFixture } from './fixtures';

describe('Sleeper → normalized (anonymized P0a fixtures)', () => {
  it('user: whitelisted fields only; Sleeper null → not found', () => {
    const user = toFantasyUser(loadFixture('sleeper-user.json'));
    expect(user).toEqual({ provider: 'sleeper', userId: '100000000000000003', username: 'user_2', displayName: 'user_1' });
    expect(toFantasyUser(null)).toBeNull();
    expect(toFantasyUser(loadFixture('sleeper-user-notfound.json'))).toBeNull();
  });

  it('leagues: id, name, season, status, size', () => {
    const leagues = loadFixture<SleeperLeagueRaw[]>('sleeper-leagues.json').map(toFantasyLeague);
    expect(leagues).toHaveLength(2);
    expect(leagues[0]).toMatchObject({ provider: 'sleeper', name: 'League A', season: 2026, status: 'in_season', totalRosters: 10 });
  });

  it('league detail: scoring rules + hash, starter slots without BN, playoff start', () => {
    const d = toLeagueDetail(loadFixture<SleeperLeagueRaw>('sleeper-league.json'));
    expect(d?.scoring.rec).toBe(1);
    expect(d?.scoringHash).toMatch(/^[0-9a-f]{8}$/);
    expect(d?.rosterSlots).toEqual(['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'FLEX', 'SUPER_FLEX']);
    expect(d?.playoffWeekStart).toBe(15);
  });

  it('weekly lines: rated positions only, aliases applied, numbers only', () => {
    const lines = toGameLines([
      { player_id: '1', week: 4, team: 'LA', opponent: 'JAC', player: { position: 'WR' }, stats: { rec: 3, note: 'x' } },
      { player_id: '2', week: 4, team: 'KC', opponent: 'BUF', player: { position: 'LB' }, stats: { tkl: 9 } },
      { player_id: '3', week: 4, team: null, opponent: 'BUF', player: { position: 'RB' }, stats: {} },
    ]);
    expect(lines).toEqual([{ playerId: '1', position: 'WR', team: 'LAR', opponent: 'JAX', week: 4, stats: { rec: 3 } }]);
  });
});

describe('ESPN team game lines → defense / offense logs', () => {
  const line: TeamGameLine = {
    team: 'PIT', opponent: 'CLE', week: 4, eventId: 'e', points: 24, pointsAllowed: 27, totalYards: 361, passYds: 269, rushYds: 92,
    passTd: 3, rushTd: 0, interceptions: 2, sacks: 5, fumblesLost: 0, turnovers: 2, redZoneAtt: 3, drives: 12,
  };
  it("a team's offense line is its OPPONENT's defense game", () => {
    expect(toDefenseLog([line])).toEqual([
      { team: 'CLE', week: 4, pass_yds: 269, rush_yds: 92, pass_td: 3, rush_td: 0, int: 2, sacks: 5, points: 24, red_zone_att: 3, drives: 12 },
    ]);
  });
  it("…and its own offense game (D/ST matchups)", () => {
    expect(toOffenseLog([line])).toEqual([{ team: 'PIT', week: 4, turnovers: 2, sacks_allowed: 5, points: 24 }]);
  });
});
