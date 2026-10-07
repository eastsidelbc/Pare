import { describe, it, expect } from 'vitest';
import { buildTeamSchedule, MIN_GAMES_FOR_BYES, pickTeams, type ScheduleGame } from '../schedule';

/** 32 teams T1..T32. A week where `bye` teams sit out; everyone else is paired. */
const TEAMS = Array.from({ length: 32 }, (_, i) => `T${i + 1}`);
function week(w: number, bye: string[] = []): ScheduleGame[] {
  const playing = TEAMS.filter((t) => !bye.includes(t));
  const games: ScheduleGame[] = [];
  for (let i = 0; i < playing.length; i += 2) {
    games.push({ week: w, home: playing[i], away: playing[i + 1], kickoff: `2026-10-0${w}T17:00:00.000Z`, eventId: `e${w}-${i}` });
  }
  return games;
}

describe('buildTeamSchedule — bye detection', () => {
  it('opponents both ways, home/away, kickoff and event id', () => {
    const s = buildTeamSchedule([{ week: 1, games: week(1) }], TEAMS);
    expect(s.T1[1]).toEqual({ opp: 'T2', home: true, kickoff: '2026-10-01T17:00:00.000Z', eventId: 'e1-0' });
    expect(s.T2[1]).toMatchObject({ opp: 'T1', home: false });
  });

  it('a team absent from a complete week is on BYE', () => {
    const s = buildTeamSchedule([{ week: 7, games: week(7, ['T1', 'T2', 'T3', 'T4']) }], TEAMS);
    expect(week(7, ['T1', 'T2', 'T3', 'T4'])).toHaveLength(14);
    expect([s.T1[7], s.T2[7], s.T3[7], s.T4[7]]).toEqual(['BYE', 'BYE', 'BYE', 'BYE']);
    expect(s.T5[7]).not.toBe('BYE');
  });

  it('six byes (13 games) still counts as a complete week', () => {
    const six = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    expect(week(9, six)).toHaveLength(MIN_GAMES_FOR_BYES);
    expect(buildTeamSchedule([{ week: 9, games: week(9, six) }], TEAMS).T6[9]).toBe('BYE');
  });

  it('a FAILED week (games: null) is unknown, never a bye', () => {
    const s = buildTeamSchedule([{ week: 5, games: null }], TEAMS);
    expect(s.T1[5]).toBeUndefined();
  });

  it('a PARTIAL week (too few games) marks known games but no byes', () => {
    const partial = week(6).slice(0, 5);
    const s = buildTeamSchedule([{ week: 6, games: partial }], TEAMS);
    expect(s.T1[6]).toMatchObject({ opp: 'T2' });
    expect(s.T32[6]).toBeUndefined();
  });

  it('pickTeams trims to the roster teams', () => {
    const s = buildTeamSchedule([{ week: 1, games: week(1) }], TEAMS);
    expect(Object.keys(pickTeams(s, ['T3', 'T9', 'NOPE']))).toEqual(['T3', 'T9']);
  });
});
