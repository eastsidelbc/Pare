import { describe, it, expect } from 'vitest';
import { compareStartSit, easierWeek, goodWeeks, likelySwap, startSitCandidates } from '../startSit';
import { tierForRank, TIER_LABEL } from '../rating';
import type { FantasyPosition, RosterGroup } from '../types';
import type { MatchupCell, RosterRow } from '../viewModel';

/** A game cell rated at `rank` (higher = more points allowed = easier). */
function game(week: number, rank: number): MatchupCell {
  const tier = tierForRank(rank);
  return {
    week, kind: 'game', opp: 'OPP', home: true, kickoff: null,
    rating: { tier, label: TIER_LABEL[tier], rank, isTied: false, formattedRank: `#${rank}`, perGame: rank, text: `${TIER_LABEL[tier]} · #${rank}` },
  };
}
const bye = (week: number): MatchupCell => ({ week, kind: 'bye', opp: null, home: false, kickoff: null, rating: null });
const unknown = (week: number): MatchupCell => ({ week, kind: 'unknown', opp: null, home: false, kickoff: null, rating: null });

function row(id: string, position: FantasyPosition | null, group: RosterGroup, thisWeek: MatchupCell = game(6, 16), strip: MatchupCell[] = []): RosterRow {
  return { player: { playerId: id, name: id, position, nflTeam: 'KC', group, slot: null, injury: null }, thisWeek, strip };
}

describe('likelySwap', () => {
  const rows = [
    row('rb1', 'RB', 'starter'),
    row('rb2', 'RB', 'starter'),
    row('wr1', 'WR', 'starter'),
    row('rbTaxi', 'RB', 'taxi'),
    row('rbBench', 'RB', 'bench'),
    row('rbIr', 'RB', 'ir'),
  ];
  const id = (r: RosterRow | null) => r?.player.playerId ?? null;

  it('starter → first bench player at that position (skipping other starters and reserve)', () => {
    expect(id(likelySwap(rows[0], rows))).toBe('rbBench');
  });
  it('bench → first starter at that position', () => {
    expect(id(likelySwap(rows[4], rows))).toBe('rb1');
  });
  it('IR and taxi → first starter at that position', () => {
    expect(id(likelySwap(rows[5], rows))).toBe('rb1');
    expect(id(likelySwap(rows[3], rows))).toBe('rb1');
  });
  it('starter with no bench at the position → the first reserve player, else another starter', () => {
    const noBench = rows.filter((r) => r.player.playerId !== 'rbBench');
    expect(id(likelySwap(noBench[0], noBench))).toBe('rbTaxi');
    const startersOnly = [row('a', 'QB', 'starter'), row('b', 'QB', 'starter')];
    expect(id(likelySwap(startersOnly[0], startersOnly))).toBe('b');
  });
  it('nobody else at the position, or an unrated position → null', () => {
    expect(likelySwap(rows[2], rows)).toBeNull();
    const idp = [row('x', null, 'starter'), row('y', null, 'bench')];
    expect(likelySwap(idp[0], idp)).toBeNull();
    expect(startSitCandidates(rows[0], rows).map((r) => r.player.playerId)).toEqual(['rb2', 'rbTaxi', 'rbBench', 'rbIr']);
  });
});

describe('easierWeek (higher rank = easier)', () => {
  it('higher FPA rank wins', () => {
    expect(easierWeek(game(6, 28), game(6, 9))).toBe('a');
    expect(easierWeek(game(6, 3), game(6, 21))).toBe('b');
  });
  it('equal ranks (incl. tied ranks) are a tie', () => {
    expect(easierWeek(game(6, 14), game(6, 14))).toBe('tie');
  });
  it('a game beats a bye; two byes are no call', () => {
    expect(easierWeek(bye(6), game(6, 2))).toBe('b');
    expect(easierWeek(game(6, 2), bye(6))).toBe('a');
    expect(easierWeek(bye(6), bye(6))).toBe('none');
  });
  it('unknown or unrated weeks are no call', () => {
    expect(easierWeek(unknown(6), game(6, 20))).toBe('none');
    expect(easierWeek(bye(6), unknown(6))).toBe('none');
    expect(easierWeek({ ...game(6, 20), rating: null }, game(6, 20))).toBe('none');
  });
});

describe('next-5 good weeks', () => {
  it('counts Good (21–27) and Great (28–32) only; byes and unrated weeks never count', () => {
    expect(goodWeeks([game(7, 21), game(8, 27), game(9, 28), game(10, 20), bye(11)])).toBe(3);
    expect(goodWeeks([unknown(7), { ...game(8, 30), rating: null }])).toBe(0);
  });
  it('compareStartSit: this week decides; the next 5 break a tie', () => {
    const a = row('a', 'RB', 'starter', game(6, 10), [game(7, 30), game(8, 30), game(9, 5), bye(10), game(11, 22)]);
    const b = row('b', 'RB', 'bench', game(6, 25), [game(7, 2), game(8, 15), game(9, 29), game(10, 1), game(11, 1)]);
    expect(compareStartSit(a, b)).toEqual({ thisWeek: 'b', next: { verdict: 'a', a: 3, b: 1 }, easier: 'b' });
    const tieNow = { ...b, thisWeek: game(6, 10) };
    expect(compareStartSit(a, tieNow).easier).toBe('a');
    const even = { ...a, strip: b.strip };
    expect(compareStartSit(even, tieNow)).toEqual({ thisWeek: 'tie', next: { verdict: 'tie', a: 1, b: 1 }, easier: 'tie' });
  });
});
