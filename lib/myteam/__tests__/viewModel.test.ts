import { describe, it, expect } from 'vitest';
import { buildRosterView, lookaheadWeeks, matchupText, slotLabel, weekKickoffRange, LOOKAHEAD_WEEKS } from '../viewModel';
import { buildSandboxBundle } from '../sandboxBundle';

describe('lookaheadWeeks', () => {
  it('the next LOOKAHEAD_WEEKS weeks, capped at week 18', () => {
    expect(LOOKAHEAD_WEEKS).toBe(5);
    expect(lookaheadWeeks(5)).toEqual([6, 7, 8, 9, 10]);
    expect(lookaheadWeeks(16)).toEqual([17, 18]);
    expect(lookaheadWeeks(18)).toEqual([]);
  });
});

describe('buildRosterView (sandbox bundle)', () => {
  const bundle = buildSandboxBundle();
  const vm = buildRosterView(bundle, 'season');

  it('groups starters / bench / reserve (IR + taxi)', () => {
    expect(vm.starters.length).toBeGreaterThan(0);
    expect(vm.bench.length).toBeGreaterThan(0);
    expect(vm.reserve.map((r) => r.player.group).sort()).toEqual(['ir', 'taxi']);
  });
  it('this-week chips cover all five tiers', () => {
    const tiers = new Set([...vm.starters, ...vm.bench, ...vm.reserve].map((r) => r.thisWeek.rating?.tier).filter(Boolean));
    expect([...tiers].sort()).toEqual(['avg', 'avoid', 'good', 'great', 'tough']);
  });
  it('byes and unknown weeks carry no rating', () => {
    const cells = [...vm.starters, ...vm.bench].flatMap((r) => [r.thisWeek, ...r.strip]);
    expect(cells.some((c) => c.kind === 'bye')).toBe(true);
    expect(cells.filter((c) => c.kind !== 'game').every((c) => c.rating === null)).toBe(true);
  });
  it('each strip holds the next 5 weeks', () => {
    expect(vm.week).toBe(6);
    expect(vm.starters[0].strip.map((c) => c.week)).toEqual([7, 8, 9, 10, 11]);
  });
  it('the window changes ratings (Season vs Last 4)', () => {
    const last4 = buildRosterView(bundle, 'last4');
    const a = vm.starters.map((r) => r.thisWeek.rating?.text).join('|');
    const b = last4.starters.map((r) => r.thisWeek.rating?.text).join('|');
    expect(a).not.toBe(b);
  });
});

describe('labels', () => {
  it('slot + matchup text', () => {
    expect([slotLabel('SUPER_FLEX'), slotLabel('FLEX'), slotLabel('WRRB_FLEX'), slotLabel('RB'), slotLabel(null)]).toEqual([
      'SFLX', 'FLEX', 'FLEX', null, null,
    ]);
    const game = { week: 5, kind: 'game', opp: 'KC', kickoff: null, rating: null } as const;
    expect(matchupText({ ...game, home: false })).toBe('@ KC');
    expect(matchupText({ ...game, home: true })).toBe('vs KC');
    expect(matchupText({ week: 5, kind: 'bye', opp: null, home: false, kickoff: null, rating: null })).toBe('BYE');
  });
  it('week kickoff range skips byes and unknown weeks', () => {
    const k = (kickoff: string) => ({ opp: 'X', home: true, kickoff, eventId: null });
    const schedule = { A: { 6: k('2026-10-09T00:15:00Z') }, B: { 6: k('2026-10-13T00:15:00Z') }, C: { 6: 'BYE' as const }, D: {} };
    expect(weekKickoffRange(schedule, 6)).toEqual({ first: '2026-10-09T00:15:00Z', last: '2026-10-13T00:15:00Z' });
    expect(weekKickoffRange(schedule, 7)).toBeNull();
  });
});
