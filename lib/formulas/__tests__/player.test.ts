import { describe, expect, it } from 'vitest';
import {
  airYardsShare,
  anytimeTdProb,
  boomRate,
  countOverProb,
  floorCeiling,
  fpoe,
  hitRate,
  propOverProb,
  snapPct,
  targetShare,
  wopr,
  xfp,
} from '@/lib/formulas/player';

describe('player — props', () => {
  it('hit rate', () => {
    expect(hitRate([70, 50, 90, 65], 64.5)).toBe(0.75);
  });
  it('P(over): line at the shrunk mean → 50%', () => {
    // 4 games averaging 80 with prior 60, k = 4 → μ = 70
    const values = [70, 90, 75, 85];
    expect(propOverProb({ line: 70, values, priorMean: 60, priorSd: 25 })).toBeCloseTo(0.5, 7);
    expect(propOverProb({ line: 60, values, priorMean: 60, priorSd: 25 })).toBeGreaterThan(0.5);
  });
  it('P(over) with no games falls back to the prior', () => {
    expect(propOverProb({ line: 60, values: [], priorMean: 60, priorSd: 25 })).toBeCloseTo(0.5, 7);
  });
  it('count props (Poisson)', () => {
    // over 4.5 catches at 5 per game = P(X ≥ 5 | λ 5) ≈ 0.5595
    expect(countOverProb(4.5, 5)).toBeCloseTo(0.5595, 3);
    expect(anytimeTdProb(0.5)).toBeCloseTo(0.3935, 4);
  });
});

describe('player — usage', () => {
  it('shares + WOPR', () => {
    expect(targetShare(9, 36)).toBe(0.25);
    expect(snapPct(60, 64)).toBeCloseTo(0.9375, 10);
    expect(airYardsShare(90, 300)).toBeCloseTo(0.3, 10);
    expect(wopr(0.25, 0.3)).toBeCloseTo(0.585, 10);
  });
  it('xFP + FPOE', () => {
    const exp = xfp({ target: 8, carry: 3, rzTarget: 1 }, { target: 1.5, carry: 0.5, rzTarget: 2.5 });
    expect(exp).toBeCloseTo(16, 10);
    expect(fpoe(21, 16)).toBe(5);
  });
  it('boom rate skips unranked (999) weeks', () => {
    expect(boomRate([5, 20, 999, 12, 30])).toBe(0.5);
  });
  it('floor / ceiling', () => {
    const fc = floorCeiling([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(fc).toEqual({ floor: 10, ceiling: 90 });
  });
});

describe('player — null guards', () => {
  it('bad input → null', () => {
    expect(hitRate([], 10)).toBeNull();
    expect(propOverProb({ line: 10, values: [5], priorMean: 5, priorSd: 0 })).toBeNull();
    expect(countOverProb(-1, 2)).toBeNull();
    expect(targetShare(3, 0)).toBeNull();
    expect(wopr(Number.NaN, 0.2)).toBeNull();
    expect(boomRate([999])).toBeNull();
    expect(floorCeiling([])).toBeNull();
  });
});
