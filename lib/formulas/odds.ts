/**
 * Pare formulas — betting-line math (pure). Inputs are plain numbers (American odds,
 * point lines); parsing ESPN strings stays in lib/espnScoreboard.ts (parseAmericanOdds,
 * parseSpreadDetails). Display copy rules for any of this: design-system §9.5.
 */

import { FORMULA_CONFIG } from './config';
import { normCdf } from './stats';

const validAmerican = (a: number) => Number.isFinite(a) && Math.abs(a) >= 100;

/** American odds → implied win chance incl. the book's cut. −110 → 0.524, +150 → 0.4. */
export function impliedProb(american: number): number | null {
  if (!validAmerican(american)) return null;
  return american > 0 ? 100 / (american + 100) : -american / (-american + 100);
}

/** Remove the book's cut from a two-way market: each side's share of the total implied chance. */
export function noVig(pA: number, pB: number): { a: number; b: number } | null {
  if (!Number.isFinite(pA) || !Number.isFinite(pB) || pA < 0 || pB < 0 || pA + pB === 0) return null;
  const sum = pA + pB;
  return { a: pA / sum, b: pB / sum };
}

/** American → decimal odds (stake included): −110 → 1.909, +150 → 2.5. */
export function americanToDecimal(american: number): number | null {
  if (!validAmerican(american)) return null;
  return american > 0 ? 1 + american / 100 : 1 + 100 / -american;
}

/** Decimal → American odds: 2.5 → +150, 1.909 → −110. */
export function decimalToAmerican(decimal: number): number | null {
  if (!Number.isFinite(decimal) || decimal <= 1) return null;
  return decimal >= 2 ? (decimal - 1) * 100 : -100 / (decimal - 1);
}

/** Hit rate needed to break even at a price (−110 → 52.4%). Same as the implied chance. */
export function breakevenProb(american: number = FORMULA_CONFIG.standardPrice): number | null {
  return impliedProb(american);
}

/** Win chance from a projected margin (team's points minus opponent's). +3 → ~59%. */
export function spreadWinProb(projMargin: number): number | null {
  return normCdf(projMargin / FORMULA_CONFIG.marginSd);
}

/**
 * Cover chance for a team at its line (e.g. −3 = favored by 3): covers when
 * margin + line > 0, so P = Φ((projMargin + line) / sd).
 */
export function coverProb(projMargin: number, teamLine: number): number | null {
  return normCdf((projMargin + teamLine) / FORMULA_CONFIG.marginSd);
}

/** Over chance from a projected total vs the posted total. */
export function totalOverProb(projTotal: number, line: number): number | null {
  return normCdf((projTotal - line) / FORMULA_CONFIG.totalSd);
}

export type KeyNumberHit = 'on' | 'near' | 'none';

/** Is a line sitting on (or half a point from) a number games land on often (3, 7 / 44, 47 …)? */
export function nearKeyNumber(line: number, kind: 'spread' | 'total'): KeyNumberHit {
  if (!Number.isFinite(line)) return 'none';
  const keys = FORMULA_CONFIG.keyNumbers[kind];
  const v = Math.abs(line);
  if (keys.includes(v)) return 'on';
  return keys.some((k) => Math.abs(v - k) <= FORMULA_CONFIG.nearKeyWithin) ? 'near' : 'none';
}

/** Pare's number minus the line (positive = Pare expects more than the line). */
export function edge(projection: number, line: number): number | null {
  if (!Number.isFinite(projection) || !Number.isFinite(line)) return null;
  return projection - line;
}

/** Expected profit per 1 unit staked, given a win chance and a price. > 0 = the price is generous. */
export function expectedValue(winProb: number, american: number = FORMULA_CONFIG.standardPrice): number | null {
  const dec = americanToDecimal(american);
  if (dec === null || !Number.isFinite(winProb) || winProb < 0 || winProb > 1) return null;
  return winProb * (dec - 1) - (1 - winProb);
}
