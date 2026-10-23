import { describe, expect, it } from 'vitest';
import { fitLogistic, predictLogistic, sigmoid, solveLinear } from '../logistic';

const OPTS = { l2: 0, maxIter: 50, tol: 1e-10 };

describe('logistic regression (ridge, IRLS)', () => {
  it('solveLinear: 2×2 system; singular → null', () => {
    expect(solveLinear([[2, 1], [1, 3]], [3, 5])?.map((v) => +v.toFixed(6))).toEqual([0.8, 1.4]);
    expect(solveLinear([[1, 2], [2, 4]], [1, 2])).toBeNull();
  });
  it('recovers the log-odds of grouped data exactly (no ridge)', () => {
    // x = 0: 1 of 4 over → logit(0.25); x = 1: 3 of 4 over → logit(0.75).
    const X = [[0], [0], [0], [0], [1], [1], [1], [1]];
    const y = [1, 0, 0, 0, 1, 1, 1, 0];
    const m = fitLogistic(X, y, OPTS);
    expect(m).not.toBeNull();
    expect(predictLogistic(m!, [0])).toBeCloseTo(0.25, 6);
    expect(predictLogistic(m!, [1])).toBeCloseTo(0.75, 6);
    expect(m!.intercept).toBeCloseTo(Math.log(1 / 3), 6);
  });
  it('separable data: ridge keeps the weights finite and converges', () => {
    const X = [[-2], [-1], [1], [2]];
    const y = [0, 0, 1, 1];
    const m = fitLogistic(X, y, { ...OPTS, l2: 1 });
    expect(m).not.toBeNull();
    expect(Number.isFinite(m!.weights[0])).toBe(true);
    expect(m!.weights[0]).toBeGreaterThan(0);
    expect(m!.iterations).toBeLessThan(OPTS.maxIter);
  });
  it('more ridge → smaller weights; same input → same model', () => {
    const X = [[0.5, 1], [1.5, -1], [-0.2, 0.3], [2.1, 0.8], [-1.3, -0.4], [0.9, 0.1]];
    const y = [1, 1, 0, 1, 0, 0];
    const lo = fitLogistic(X, y, { ...OPTS, l2: 0.1 })!;
    const hi = fitLogistic(X, y, { ...OPTS, l2: 10 })!;
    expect(Math.abs(hi.weights[0])).toBeLessThan(Math.abs(lo.weights[0]));
    expect(fitLogistic(X, y, { ...OPTS, l2: 0.1 })).toEqual(lo);
  });
  it('bad input → null; sigmoid(0) = 0.5', () => {
    expect(fitLogistic([], [], OPTS)).toBeNull();
    expect(fitLogistic([[1], [1, 2]], [0, 1], OPTS)).toBeNull();
    expect(fitLogistic([[1], [2]], [0, 2], OPTS)).toBeNull();
    expect(sigmoid(0)).toBe(0.5);
  });
});
