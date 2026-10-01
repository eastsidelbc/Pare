import { describe, it, expect } from 'vitest';
import {
  addToCollection,
  removeFromCollection,
  applyPatch,
  resolveActive,
  makeId,
  type Comparison,
} from '../store';

const mk = (id: string, teamA = 'A', teamB = 'B'): Comparison => ({
  id,
  teamA,
  teamB,
  settings: { offenseMetrics: [], defenseMetrics: [] },
});

describe('addToCollection', () => {
  it('appends while under the cap', () => {
    const r = addToCollection([mk('1')], mk('2'), 8);
    expect(r.added).toBe(true);
    expect(r.list).toHaveLength(2);
  });
  it('refuses (no-op) at the cap', () => {
    const list = [mk('1'), mk('2')];
    const r = addToCollection(list, mk('3'), 2);
    expect(r.added).toBe(false);
    expect(r.list).toBe(list); // unchanged reference
  });
});

describe('removeFromCollection', () => {
  it('removes the matching id', () => {
    expect(removeFromCollection([mk('1'), mk('2')], '1')).toHaveLength(1);
  });
  it('can empty the list (caller re-seeds)', () => {
    expect(removeFromCollection([mk('1')], '1')).toHaveLength(0);
  });
});

describe('applyPatch', () => {
  it('merges teams and partially merges settings', () => {
    const out = applyPatch([mk('1')], '1', {
      teamA: 'X',
      settings: { offenseMetrics: ['points'] },
    });
    expect(out[0].teamA).toBe('X');
    expect(out[0].teamB).toBe('B'); // untouched
    expect(out[0].settings.offenseMetrics).toEqual(['points']);
    expect(out[0].settings.defenseMetrics).toEqual([]); // untouched
  });
  it('leaves non-matching comparisons alone', () => {
    const list = [mk('1'), mk('2')];
    const out = applyPatch(list, '1', { teamA: 'X' });
    expect(out[1]).toBe(list[1]);
  });
});

describe('resolveActive', () => {
  it('returns the active comparison', () => {
    const list = [mk('1'), mk('2')];
    expect(resolveActive(list, '2')?.id).toBe('2');
  });
  it('falls back to the first on a stale id', () => {
    const list = [mk('1'), mk('2')];
    expect(resolveActive(list, 'nope')?.id).toBe('1');
  });
});

describe('makeId', () => {
  it('produces distinct ids', () => {
    expect(makeId()).not.toBe(makeId());
  });
});
