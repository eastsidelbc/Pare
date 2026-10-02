import { describe, it, expect } from 'vitest';
import { POWER_MIN, POWER_TOP, boltPoints, countTopRanks, isPowered } from '@/lib/powerSurge';

describe('power surge trigger', () => {
  it('uses top 5 and needs 3', () => {
    expect(POWER_TOP).toBe(5);
    expect(POWER_MIN).toBe(3);
  });
  it('counts only ranks 1..5 and ignores missing ranks', () => {
    expect(countTopRanks([1, 6, 5, 32, 3])).toBe(3);
    expect(countTopRanks([null, undefined, 2, 0])).toBe(1);
  });
  it('powers at exactly 3 top-5 ranks, not 2', () => {
    expect(isPowered([1, 5, 3, 14, 20])).toBe(true);
    expect(isPowered([1, 5, 6, 14, 20])).toBe(false);
  });
});

describe('boltPoints', () => {
  it('keeps both endpoints and doubles segments per depth', () => {
    const pts = boltPoints(0, 0, 0, 100, 20, 3, () => 0.5);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[pts.length - 1]).toEqual([0, 100]);
    expect(pts.length).toBe(2 ** 3 + 1);
  });
});
