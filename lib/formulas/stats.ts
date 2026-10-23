/**
 * Pare formulas — general statistics (pure). Bad input (empty list, zero spread, NaN)
 * returns null so the UI can show "—"; nothing here throws.
 */

import { FORMULA_CONFIG } from './config';

const isNum = (x: number) => Number.isFinite(x);

/** Average. */
export function mean(xs: readonly number[]): number | null {
  if (xs.length === 0 || !xs.every(isNum)) return null;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Sample standard deviation (n − 1). Needs 2+ values. */
export function stdev(xs: readonly number[]): number | null {
  const m = mean(xs);
  if (m === null || xs.length < 2) return null;
  const ss = xs.reduce((s, x) => s + (x - m) ** 2, 0);
  return Math.sqrt(ss / (xs.length - 1));
}

/** Percentile (0–100) with linear interpolation between ranks. */
export function percentile(xs: readonly number[], p: number): number | null {
  if (xs.length === 0 || !xs.every(isNum) || !isNum(p) || p < 0 || p > 100) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** z = (x − mean) / sd for each value — "how many standard deviations from the league". */
export function zScores(xs: readonly number[]): number[] | null {
  const m = mean(xs);
  const sd = stdev(xs);
  if (m === null || sd === null || sd === 0) return null;
  return xs.map((x) => (x - m) / sd);
}

/** Error function (Abramowitz & Stegun 7.1.26). */
export function erf(x: number): number {
  const { p, a } = FORMULA_CONFIG.erf;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const poly = a.reduceRight((acc, coef) => acc * t + coef, 0) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

/** Standard normal CDF Φ(x): the chance a normal value lands below x standard deviations. */
export function normCdf(x: number): number | null {
  if (!isNum(x)) return null;
  return (1 + erf(x * Math.SQRT1_2)) / 2;
}

/** Poisson P(X = k) for a rate λ (e.g. TDs per game). */
export function poissonPmf(k: number, lambda: number): number | null {
  if (!Number.isInteger(k) || k < 0 || !isNum(lambda) || lambda < 0) return null;
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-lambda) * lambda ** k) / fact;
}

/** Poisson P(X ≥ k): e.g. k = 1 → the chance of at least one TD. */
export function poissonAtLeast(k: number, lambda: number): number | null {
  if (!Number.isInteger(k) || k < 0) return null;
  let below = 0;
  for (let i = 0; i < k; i++) {
    const p = poissonPmf(i, lambda);
    if (p === null) return null;
    below += p;
  }
  return Math.max(0, 1 - below);
}

/**
 * Small-sample shrinkage: blend a player's/team's average with the league's,
 * weighted by games. est = (n·x̄ + k·prior) / (n + k). 2 hot games barely move it; 12 do.
 */
export function shrink(n: number, sampleMean: number, prior: number, k: number = FORMULA_CONFIG.shrinkGames): number | null {
  if (![n, sampleMean, prior, k].every(isNum) || n < 0 || k < 0 || n + k === 0) return null;
  return (n * sampleMean + k * prior) / (n + k);
}

/** Coefficient of variation σ / μ — lower = steadier week to week. */
export function coefVar(xs: readonly number[]): number | null {
  const m = mean(xs);
  const sd = stdev(xs);
  if (m === null || sd === null || m === 0) return null;
  return sd / Math.abs(m);
}

/** a / b, or null when b is 0 or either side isn't a number. */
export function ratio(a: number, b: number): number | null {
  if (!isNum(a) || !isNum(b) || b === 0) return null;
  return a / b;
}
