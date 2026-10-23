/**
 * Pare formulas — player props + fantasy usage (pure). Values are per-game numbers in the
 * order played; inputs never carry Sleeper/ESPN shapes.
 */

import { FORMULA_CONFIG } from './config';
import { mean, normCdf, percentile, poissonAtLeast, ratio, shrink, stdev } from './stats';

/** Share of games where the stat went over the line. */
export function hitRate(values: readonly number[], line: number): number | null {
  if (values.length === 0 || !Number.isFinite(line)) return null;
  return values.filter((v) => v > line).length / values.length;
}

export interface PropOverInput {
  line: number;
  /** The player's per-game values (this season). */
  values: readonly number[];
  /** League/position average for the stat — what a small sample is pulled toward. */
  priorMean: number;
  /** Spread to use when the player has < 2 games (or no spread). */
  priorSd: number;
}

/**
 * Chance a yardage-type stat goes over the line: normal on the shrunk average.
 * P(over) = 1 − Φ((line − μ) / σ), μ = shrink(n, x̄, prior), σ = player's spread (else prior's).
 */
export function propOverProb({ line, values, priorMean, priorSd }: PropOverInput): number | null {
  const m = mean(values);
  const mu = shrink(values.length, m ?? priorMean, priorMean);
  const sd = stdev(values) || priorSd;
  if (mu === null || !Number.isFinite(sd) || sd <= 0 || !Number.isFinite(line)) return null;
  const below = normCdf((line - mu) / sd);
  return below === null ? null : 1 - below;
}

/** Chance a count stat (receptions, TDs) goes over a half-point line, Poisson at rate λ per game. */
export function countOverProb(line: number, lambda: number): number | null {
  if (!Number.isFinite(line) || line < 0) return null;
  return poissonAtLeast(Math.floor(line) + 1, lambda);
}

/** Anytime-TD chance from a TD rate λ per game: 1 − e^(−λ). */
export function anytimeTdProb(lambda: number): number | null {
  return poissonAtLeast(1, lambda);
}

/** Targets ÷ team targets. */
export function targetShare(targets: number, teamTargets: number): number | null {
  return ratio(targets, teamTargets);
}

/** Offensive snaps ÷ team offensive snaps (Sleeper `off_snp / tm_off_snp`). */
export function snapPct(snaps: number, teamSnaps: number): number | null {
  return ratio(snaps, teamSnaps);
}

/** Air yards ÷ team air yards. */
export function airYardsShare(airYards: number, teamAirYards: number): number | null {
  return ratio(airYards, teamAirYards);
}

/** WOPR = 1.5 × target share + 0.7 × air-yards share — a receiver's opportunity in one number. */
export function wopr(tgtShare: number, airShare: number): number | null {
  if (!Number.isFinite(tgtShare) || !Number.isFinite(airShare)) return null;
  const w = FORMULA_CONFIG.wopr;
  return w.targetShare * tgtShare + w.airYardsShare * airShare;
}

/**
 * Expected fantasy points: Σ opportunities × league-average points per opportunity
 * (e.g. { target: 8, carry: 3, rzTarget: 1 } × { target: 1.6, carry: 0.6, rzTarget: 2.4 }).
 * Opportunity types missing from `ptsPerOpp` count 0.
 */
export function xfp(opps: Readonly<Record<string, number>>, ptsPerOpp: Readonly<Record<string, number>>): number | null {
  const entries = Object.entries(opps);
  if (!entries.every(([, n]) => Number.isFinite(n))) return null;
  return entries.reduce((s, [k, n]) => s + n * (ptsPerOpp[k] ?? 0), 0);
}

/** Fantasy points over expected: + = "running hot" (likely to cool), − = "due". */
export function fpoe(actual: number, expected: number): number | null {
  return Number.isFinite(actual) && Number.isFinite(expected) ? actual - expected : null;
}

/** Share of ranked weeks finishing inside the boom rank (Sleeper uses 999 for unranked — skipped). */
export function boomRate(weeklyPosRanks: readonly number[], cutoff: number = FORMULA_CONFIG.boomRank): number | null {
  const ranked = weeklyPosRanks.filter((r) => Number.isFinite(r) && r > 0 && r < FORMULA_CONFIG.unrankedPosRank);
  if (ranked.length === 0) return null;
  return ranked.filter((r) => r <= cutoff).length / ranked.length;
}

/** Floor / ceiling = 10th / 90th percentile of weekly fantasy points. */
export function floorCeiling(weeklyPoints: readonly number[]): { floor: number; ceiling: number } | null {
  const floor = percentile(weeklyPoints, FORMULA_CONFIG.floorPercentile);
  const ceiling = percentile(weeklyPoints, FORMULA_CONFIG.ceilingPercentile);
  return floor === null || ceiling === null ? null : { floor, ceiling };
}

/** Chance a normal(μ, σ) value lands above the line: 1 − Φ((line − μ) / σ). */
export function normalOverProb(line: number, mu: number, sd: number): number | null {
  if (![line, mu, sd].every(Number.isFinite) || sd <= 0) return null;
  const below = normCdf((line - mu) / sd);
  return below === null ? null : 1 - below;
}
