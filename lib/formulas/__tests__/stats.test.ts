import { describe, expect, it } from 'vitest';
import { coefVar, mean, normCdf, percentile, poissonAtLeast, poissonPmf, ratio, shrink, stdev, zScores } from '@/lib/formulas/stats';

describe('stats — basics', () => {
  it('mean / stdev (sample)', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(stdev([2, 4, 6])).toBeCloseTo(2, 10);
  });
  it('percentile interpolates between ranks', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([10, 20], 25)).toBe(12.5);
    expect(percentile([7], 90)).toBe(7);
  });
  it('zScores', () => {
    expect(zScores([2, 4, 6])).toEqual([-1, 0, 1]);
  });
  it('coefVar + ratio', () => {
    expect(coefVar([2, 4, 6])).toBeCloseTo(0.5, 10);
    expect(ratio(3, 4)).toBe(0.75);
  });
});

describe('stats — distributions', () => {
  it('normCdf matches the table', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 7);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 4);
    expect(normCdf(-1)).toBeCloseTo(0.158655, 5);
  });
  it('poisson: at least one TD at λ = 0.5', () => {
    expect(poissonAtLeast(1, 0.5)).toBeCloseTo(0.393469, 5);
    expect(poissonAtLeast(0, 0.5)).toBe(1);
    expect(poissonPmf(2, 1)).toBeCloseTo(0.18394, 5);
  });
  it('shrink: 2 games at 10 vs a prior of 4 with k = 4 → 6', () => {
    expect(shrink(2, 10, 4, 4)).toBe(6);
    expect(shrink(0, 99, 4)).toBe(4);
  });
});

describe('stats — null guards', () => {
  it('empty / zero spread / NaN → null', () => {
    expect(mean([])).toBeNull();
    expect(stdev([5])).toBeNull();
    expect(zScores([3, 3, 3])).toBeNull();
    expect(percentile([], 50)).toBeNull();
    expect(normCdf(Number.NaN)).toBeNull();
    expect(poissonPmf(-1, 1)).toBeNull();
    expect(coefVar([0, 0])).toBeNull();
    expect(ratio(1, 0)).toBeNull();
    expect(shrink(0, 1, 1, 0)).toBeNull();
  });
});
