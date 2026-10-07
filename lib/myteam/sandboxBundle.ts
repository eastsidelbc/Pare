/**
 * Deterministic, fully synthetic LeagueBundle for /sandbox/my-team (dev-only)
 * and the view-model tests. Fake players and leagues — no real user data.
 *
 * Built so every UI state shows up at once: all five tiers this week, Q/D/O/IR
 * tags, a this-week BYE, IR + taxi players, and Season vs Last 4 giving
 * different ranks (week 1 is a blowout that reverses the order).
 */

import { NFL_TEAMS } from '@/lib/teams';
import type { LeagueBundle } from './apiTypes';
import type { DefenseGame, OffenseGame } from './defenseProfile';
import type { FpaTable } from './fpa';
import type { ScheduleEntry, TeamSchedule } from './schedule';
import { FANTASY_POSITIONS, type FantasyLeague, type InjuryTag, type RosterPlayer } from './types';

const SEASON = 2026;
const WEEK = 6;
const COMPLETED = [1, 2, 3, 4, 5];
const TEAMS = NFL_TEAMS.map((t) => t.abbr);

/** Team index i allows (32 − i) × 10 in week 1, then i + 1 per game → Season and Last 4 rank in opposite order. */
function sandboxFpa(): FpaTable {
  const table: FpaTable = {};
  TEAMS.forEach((team, i) => {
    table[team] = Object.fromEntries(
      FANTASY_POSITIONS.map((p) => [p, Object.fromEntries(COMPLETED.map((w) => [w, { pts: w === 1 ? (32 - i) * 10 : i + 1, games: 1 }]))]),
    ) as FpaTable[string];
  });
  return table;
}

function sandboxLogs(): { defenseLog: DefenseGame[]; offenseLog: OffenseGame[] } {
  const defenseLog: DefenseGame[] = [];
  const offenseLog: OffenseGame[] = [];
  TEAMS.forEach((team, i) => {
    for (const week of COMPLETED) {
      defenseLog.push({
        team, week,
        pass_yds: 180 + i * 3, rush_yds: 80 + ((i * 7) % 60), pass_td: 1 + (i % 3), rush_td: i % 2,
        int: (i + week) % 3, sacks: 1 + (i % 4), points: 14 + (i % 15), red_zone_att: 2 + (i % 3), drives: 11 + (i % 3),
      });
      offenseLog.push({ team, week, turnovers: i % 4, sacks_allowed: (i * 3) % 5, points: 30 - (i % 15) });
    }
  });
  return { defenseLog, offenseLog };
}

interface SandboxPlayer {
  name: string;
  position: RosterPlayer['position'];
  team: string;
  group: RosterPlayer['group'];
  slot: string | null;
  injury: InjuryTag | null;
  /** Opponent team index this week (rank under Season = 32 − index), or 'BYE'. */
  vs: number | 'BYE';
}

// Season ranks: index 29 → #3 Avoid, 23 → #9 Tough, 16 → #16 Avg, 8 → #24 Good, 2 → #30 Great.
const PLAYERS: SandboxPlayer[] = [
  { name: 'Jordan Hale', position: 'QB', team: 'KC', group: 'starter', slot: 'QB', injury: null, vs: 2 },
  { name: 'Marcus Reed', position: 'RB', team: 'DET', group: 'starter', slot: 'RB', injury: 'Q', vs: 8 },
  { name: 'Devon Price', position: 'RB', team: 'SF', group: 'starter', slot: 'RB', injury: null, vs: 29 },
  { name: 'Tyler Brooks', position: 'WR', team: 'MIA', group: 'starter', slot: 'WR', injury: 'D', vs: 16 },
  { name: 'Christopher Montgomery-Wallace', position: 'WR', team: 'CIN', group: 'starter', slot: 'WR', injury: null, vs: 23 },
  { name: 'Sam Ortiz', position: 'TE', team: 'LAC', group: 'starter', slot: 'TE', injury: null, vs: 2 },
  { name: 'Andre Lewis', position: 'WR', team: 'PHI', group: 'starter', slot: 'FLEX', injury: null, vs: 8 },
  { name: 'Ryan Foster', position: 'QB', team: 'BUF', group: 'starter', slot: 'SUPER_FLEX', injury: null, vs: 29 },
  { name: 'Eli Grant', position: 'K', team: 'DAL', group: 'starter', slot: 'K', injury: null, vs: 16 },
  { name: 'Houston Texans', position: 'DEF', team: 'HOU', group: 'starter', slot: 'DEF', injury: null, vs: 23 },
  { name: 'Chris Nolan', position: 'RB', team: 'GB', group: 'bench', slot: null, injury: 'O', vs: 'BYE' },
  { name: 'Leo Santos', position: 'WR', team: 'SEA', group: 'bench', slot: null, injury: null, vs: 8 },
  { name: 'Ben Walker', position: 'TE', team: 'MIN', group: 'bench', slot: null, injury: null, vs: 29 },
  { name: 'Isaiah Cole', position: 'RB', team: 'NYJ', group: 'ir', slot: null, injury: 'IR', vs: 16 },
  { name: 'Mason Hart', position: 'WR', team: 'CHI', group: 'taxi', slot: null, injury: null, vs: 2 },
];

/** Opponent for a roster team in a given week (deterministic, never itself). */
function opponentFor(team: string, week: number): string {
  const i = TEAMS.indexOf(team);
  let j = (i + week * 5) % TEAMS.length;
  if (j === i) j = (j + 1) % TEAMS.length;
  return TEAMS[j];
}

function sandboxSchedule(): TeamSchedule {
  const schedule: TeamSchedule = {};
  PLAYERS.forEach((p, n) => {
    const weeks: Record<number, ScheduleEntry | 'BYE'> = schedule[p.team] ?? {};
    const byeWeek = 7 + (n % 4); // strip byes in weeks 7–10
    for (let w = 1; w <= 18; w++) {
      if (w === WEEK) {
        weeks[w] = p.vs === 'BYE' ? 'BYE' : { opp: TEAMS[p.vs], home: n % 2 === 0, kickoff: '2026-10-11T17:00:00.000Z', eventId: null };
      } else if (w === byeWeek && p.vs !== 'BYE') {
        weeks[w] = 'BYE';
      } else {
        weeks[w] = { opp: opponentFor(p.team, w), home: (n + w) % 2 === 0, kickoff: '2026-10-11T17:00:00.000Z', eventId: null };
      }
    }
    schedule[p.team] = weeks;
  });
  return schedule;
}

export const SANDBOX_LEAGUES: FantasyLeague[] = [
  { provider: 'sleeper', leagueId: '900000000000000301', name: 'Sandbox League', season: SEASON, status: 'in_season', totalRosters: 10 },
  { provider: 'sleeper', leagueId: '900000000000000302', name: 'Second Sandbox League', season: SEASON, status: 'in_season', totalRosters: 12 },
];

export function buildSandboxBundle(): LeagueBundle {
  const { defenseLog, offenseLog } = sandboxLogs();
  return {
    season: SEASON,
    week: WEEK,
    completedWeeks: COMPLETED,
    league: {
      ...SANDBOX_LEAGUES[0],
      scoringHash: 'sandbox0',
      rosterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DEF'],
      playoffWeekStart: 15,
      format: 'ppr',
    },
    roster: {
      rosterId: 1,
      preDraft: false,
      players: PLAYERS.map((p, n) => ({
        playerId: `sb${n + 1}`,
        name: p.name,
        position: p.position,
        nflTeam: p.team,
        group: p.group,
        slot: p.slot,
        injury: p.injury,
      })),
    },
    schedule: sandboxSchedule(),
    fpa: sandboxFpa(),
    defenseLog,
    offenseLog,
    injurySource: 'sleeper',
    generatedAt: '2026-10-07T00:00:00.000Z',
  };
}
