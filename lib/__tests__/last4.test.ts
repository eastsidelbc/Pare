import { describe, it, expect } from 'vitest';
import { buildLast4Rows } from '../last4';
import type { TeamGameLine } from '../espnBoxscore';

const TEAMS = [
  { abbr: 'AAA', name: 'Alpha' },
  { abbr: 'BBB', name: 'Bravo' },
  { abbr: 'CCC', name: 'Charlie' },
];

/** One team's line; every counting field = `v` so window sums are easy to read. */
function line(team: string, opponent: string, week: number, v: number, td3: [number, number] = [5, 10]): TeamGameLine {
  return {
    team, opponent, week, eventId: `e${week}`, // both teams in a game share the event id
    points: v, pointsAllowed: 0, totalYards: v, passYds: v, rushYds: v, passTd: v, rushTd: v,
    interceptions: v, sacks: 0, fumblesLost: v, turnovers: v, redZoneAtt: 0, drives: 0,
    td3Conv: td3[0], td3Att: td3[1], firstDowns: v, passCmp: v, passAtt: v, rushAtt: v, plays: v,
  };
}

// AAA plays weeks 1,2,3,5,6,7 (bye W4) with output = week number. BBB is every opponent.
const lines: TeamGameLine[] = [1, 2, 3, 5, 6, 7].flatMap((w) => [
  { ...line('AAA', 'BBB', w, w, w === 7 ? [1, 10] : [5, 10]), pointsAllowed: 100 + w },
  { ...line('BBB', 'AAA', w, 100 + w, [2, 4]), pointsAllowed: w },
]);

describe('buildLast4Rows', () => {
  const { offense, defense } = buildLast4Rows(lines, TEAMS);
  const off = (n: string) => offense.find((r) => r.team === n);
  const def = (n: string) => defense.find((r) => r.team === n);

  it('window = last 4 games played, skipping the bye (weeks 3,5,6,7)', () => {
    expect(off('Alpha')).toMatchObject({ g: '4', points: '21', total_yards: '21', pass_yds: '21', rush_yds: '21' });
  });
  it('maps every offense field Compare shows', () => {
    expect(off('Alpha')).toMatchObject({
      pass_cmp: '21', pass_att: '21', pass_td: '21', pass_int: '21', plays_offense: '21',
      first_down: '21', rush_att: '21', rush_td: '21', fumbles_lost: '21', turnovers: '21',
    });
  });
  it('third-down % is attempts-weighted over the window', () => {
    // (5+5+5+1) / (10+10+10+10) = 40%
    expect(off('Alpha')?.third_down_pct).toBe('40');
  });
  it('defense = the opponents’ lines in that team’s window', () => {
    // Opponent BBB in weeks 3,5,6,7 → 103+105+106+107 = 421; its 3rd downs 8/16 = 50%.
    expect(def('Alpha')).toEqual({
      team: 'Alpha', g: '4', points: '421', total_yards: '421', pass_yds: '421', rush_yds: '421', third_down_pct: '50',
    });
  });
  it('fewer than 4 games → all of them', () => {
    const short = buildLast4Rows(lines.filter((l) => l.week <= 2), TEAMS);
    expect(short.offense.find((r) => r.team === 'Alpha')).toMatchObject({ g: '2', points: '3' });
  });
  it('a team with no games (or unknown abbr) is omitted', () => {
    expect(off('Charlie')).toBeUndefined();
    expect(def('Charlie')).toBeUndefined();
    const withUnknown = buildLast4Rows([...lines, line('ZZZ', 'AAA', 8, 1)], TEAMS);
    expect(withUnknown.offense).toHaveLength(2);
  });
  it('no third-down attempts → field left out (UI shows "—")', () => {
    const none = buildLast4Rows([line('AAA', 'BBB', 1, 1, [0, 0])], TEAMS);
    expect(none.offense[0].third_down_pct).toBeUndefined();
  });
});
