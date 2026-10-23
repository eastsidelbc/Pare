/**
 * Pare formulas — team metrics (pure). Inputs are plain season / game numbers, never
 * provider shapes, so a licensed-data swap doesn't touch this file.
 */

import { FORMULA_CONFIG } from './config';
import { ratio } from './stats';

const ok = (...xs: number[]) => xs.every((x) => Number.isFinite(x));

/** Pythagorean win % = PF^e / (PF^e + PA^e) — the record a team's scoring "deserves". */
export function pythagWinPct(pointsFor: number, pointsAgainst: number): number | null {
  if (!ok(pointsFor, pointsAgainst) || pointsFor < 0 || pointsAgainst < 0) return null;
  const e = FORMULA_CONFIG.pythagExponent;
  const pf = pointsFor ** e;
  return ratio(pf, pf + pointsAgainst ** e);
}

/** Expected wins from points scored and allowed. */
export function pythagWins(pointsFor: number, pointsAgainst: number, games: number): number | null {
  const pct = pythagWinPct(pointsFor, pointsAgainst);
  return pct === null || !ok(games) ? null : pct * games;
}

/** Luck = actual wins (ties count half) − Pythagorean wins. +2 = won ~2 more than the scoring says. */
export function pythagLuck(wins: number, games: number, pointsFor: number, pointsAgainst: number, ties = 0): number | null {
  const exp = pythagWins(pointsFor, pointsAgainst, games);
  return exp === null || !ok(wins, ties) ? null : wins + ties / 2 - exp;
}

/** Points per drive — the best single number for how good an offense is (or a defense allows). */
export function pointsPerDrive(points: number, drives: number): number | null {
  return ratio(points, drives);
}

/** Share of plays that went for a big gain (ESPN `passingBigPlays` + `rushingBigPlays`). */
export function explosiveRate(bigPassPlays: number, bigRushPlays: number, plays: number): number | null {
  return ratio(bigPassPlays + bigRushPlays, plays);
}

/** Seconds of possession per offensive play — lower = faster tempo. */
export function secondsPerPlay(possessionSeconds: number, plays: number): number | null {
  return ratio(possessionSeconds, plays);
}

/** Share of all fumbles (both teams' in this team's games) this team recovered. Tends back to ~50%. */
export function fumbleRecoveryRate(recovered: number, totalFumbles: number): number | null {
  return ratio(recovered, totalFumbles);
}

/** Takeaways − giveaways. */
export function turnoverDiff(takeaways: number, giveaways: number): number | null {
  return ok(takeaways, giveaways) ? takeaways - giveaways : null;
}

/**
 * Offense vs defense edge in standard deviations. `offZ` = the offense's z (higher = better),
 * `defAllowedZ` = the defense's "allowed" z (higher = allows more = worse). Positive favors the offense.
 */
export function matchupEdgeZ(offZ: number, defAllowedZ: number): number | null {
  return ok(offZ, defAllowedZ) ? offZ + defAllowedZ : null;
}

/** Strength-of-schedule adjust: remove how much easier (or harder) the opponents faced were than average. */
export function sosAdjust(stat: number, oppAllowedAvg: number, leagueAvg: number): number | null {
  return ok(stat, oppAllowedAvg, leagueAvg) ? stat - (oppAllowedAvg - leagueAvg) : null;
}

/** Season form blended with last-4 form (weights in config). */
export function blendForm(season: number, last4: number): number | null {
  const { seasonWeight, last4Weight } = FORMULA_CONFIG.projection;
  return ok(season, last4) ? season * seasonWeight + last4 * last4Weight : null;
}

export type Venue = 'home' | 'away' | 'neutral';

/**
 * Projected margin for team A vs B. Ratings are "points better than an average team per game"
 * (point differential per game, ideally SOS-adjusted): margin = ratingA − ratingB ± home field.
 */
export function projectedMargin(ratingA: number, ratingB: number, venueA: Venue): number | null {
  if (!ok(ratingA, ratingB)) return null;
  const hf = FORMULA_CONFIG.homeField;
  const venue = venueA === 'home' ? hf : venueA === 'away' ? -hf : 0;
  return ratingA - ratingB + venue;
}

/** Tempo multiplier: both teams' plays per game vs the league's. 1 = average pace. */
export function paceFactor(aPlaysPerGame: number, bPlaysPerGame: number, leaguePlaysPerGame: number): number | null {
  return ratio(aPlaysPerGame + bPlaysPerGame, 2 * leaguePlaysPerGame);
}

/**
 * Projected game total: each offense's scoring averaged with what the other defense allows,
 * scaled by pace. ((A ppg + B allowed)/2 + (B ppg + A allowed)/2) × pace.
 */
export function projectedTotal(aPpg: number, aAllowed: number, bPpg: number, bAllowed: number, pace = 1): number | null {
  if (!ok(aPpg, aAllowed, bPpg, bAllowed, pace)) return null;
  return ((aPpg + bAllowed) / 2 + (bPpg + aAllowed) / 2) * pace;
}

export interface PareRatingInputs {
  /** Each is a z-score where higher = better (flip "allowed" stats before passing them). */
  netYardsPerPlay: number;
  pointsPerDrive: number;
  turnoverDiffPerGame: number;
  thirdDownPct: number;
  redZoneTdPct: number;
}

/** Pare Rating: weighted z-scores (weights in config). 0 = league average, +1 = a standard deviation better. */
export function pareRating(z: PareRatingInputs): number | null {
  const w = FORMULA_CONFIG.pareRating;
  const keys = Object.keys(w) as (keyof PareRatingInputs)[];
  if (!keys.every((k) => Number.isFinite(z[k]))) return null;
  return keys.reduce((s, k) => s + w[k] * z[k], 0);
}

/** Record in one-score games (final margin within a TD + 2-pt). Margins = team's points − opponent's. */
export function oneScoreRecord(margins: readonly number[]): { wins: number; losses: number; ties: number } {
  const close = margins.filter((m) => Number.isFinite(m) && Math.abs(m) <= FORMULA_CONFIG.oneScoreMargin);
  return {
    wins: close.filter((m) => m > 0).length,
    losses: close.filter((m) => m < 0).length,
    ties: close.filter((m) => m === 0).length,
  };
}
