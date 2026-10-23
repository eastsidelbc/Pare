/**
 * Pare formulas — every constant, in ONE place (plan docs/plans/2026-10-23-formula-library.md).
 * Change a number here, never in a formula file (lib/formulas/__tests__/literals.test.ts fails
 * on numeric literals elsewhere). These are NFL-average assumptions; the Leans backtest tunes them.
 */

export const FORMULA_CONFIG = {
  /** Pythagorean expectation exponent for the NFL (Football Outsiders' 2.37). */
  pythagExponent: 2.37,
  /** Standard deviation of an NFL final margin vs the spread (points). */
  marginSd: 13.5,
  /** Standard deviation of an NFL game total vs the posted total (points). */
  totalSd: 10,
  /** Home-field advantage in points (post-2020 NFL average). */
  homeField: 1.5,
  /** Shrinkage strength: how many "league-average games" a small sample is blended with. */
  shrinkGames: 4,
  /** Lines where NFL margins / totals land most often. */
  keyNumbers: {
    spread: [3, 7, 10, 6, 14] as readonly number[],
    total: [41, 44, 47, 51] as readonly number[],
  },
  /** A line within this many points of a key number is "near" it. */
  nearKeyWithin: 0.5,
  /** Assumed price when a book shows a line without one (standard juice). */
  standardPrice: -110,
  /** A one-score game = final margin at most this (TD + 2-pt). */
  oneScoreMargin: 8,
  /** Weighted Opportunity Rating (WOPR) weights. */
  wopr: { targetShare: 1.5, airYardsShare: 0.7 },
  /** Pare Rating = weighted z-scores (weights sum to 1). */
  pareRating: { netYardsPerPlay: 0.3, pointsPerDrive: 0.3, turnoverDiffPerGame: 0.15, thirdDownPct: 0.1, redZoneTdPct: 0.15 },
  /** Projection blend of season form vs last-4 form (sum to 1). */
  projection: { seasonWeight: 0.6, last4Weight: 0.4 },
  /** Fantasy: a "boom" week = finished inside this positional rank. */
  boomRank: 12,
  /** Sleeper's `pos_rank_*` value for an unranked week. */
  unrankedPosRank: 999,
  /** Fantasy floor / ceiling percentiles of weekly points. */
  floorPercentile: 10,
  ceilingPercentile: 90,
  /** Abramowitz & Stegun 7.1.26 erf approximation (max error 1.5e-7). */
  erf: { p: 0.3275911, a: [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429] as readonly number[] },
} as const;

export type FormulaConfig = typeof FORMULA_CONFIG;
