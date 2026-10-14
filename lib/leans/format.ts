/**
 * Leans text helpers (pure). One minus sign everywhere: U+2212 "−", like the
 * mockups ("LV −1.5", "−125"), so numbers line up in tabular figures.
 */

import type { PropSide, PropStat } from './types';

const MINUS = '−';

/** 2.5 → "+2.5", −1.8 → "−1.8", 0 → "0" (one decimal unless whole). */
export function signed(n: number, digits = 1): string {
  const abs = Math.abs(n);
  const body = Number.isInteger(abs) ? String(abs) : abs.toFixed(digits);
  if (n > 0) return `+${body}`;
  if (n < 0) return `${MINUS}${body}`;
  return body;
}

/** Line number with a real minus: −1.5, 44.5. */
export function num(n: number): string {
  return n < 0 ? `${MINUS}${Math.abs(n)}` : String(n);
}

/** American odds: −125 / +105. */
export function moneylineText(n: number): string {
  return n > 0 ? `+${n}` : `${MINUS}${Math.abs(n)}`;
}

/** "#24", tied "T-24" (the My Team rank style — never "24th"). */
export function rankLabel(rank: number, isTied = false): string {
  return `${isTied ? 'T-' : '#'}${rank}`;
}

/** Per-game average with one decimal. */
export function avg1(n: number): string {
  return n.toFixed(1);
}

/** 0.667 → "67%". */
export function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export const PROP_STAT_LABEL: Readonly<Record<PropStat, string>> = {
  rush_yd: 'Rush yds',
  rec_yd: 'Rec yds',
  rec: 'Receptions',
  rush_rec_yd: 'Rush + rec yds',
  anytime_td: 'Anytime TD',
};

/** Lowercase stat words for the compact line: "o85.5 rush yds". */
export const PROP_STAT_SHORT: Readonly<Record<PropStat, string>> = {
  rush_yd: 'rush yds',
  rec_yd: 'rec yds',
  rec: 'receptions',
  rush_rec_yd: 'rush + rec yds',
  anytime_td: 'anytime TD',
};

/** "o85.5" / "u6.5"; anytime TD reads "Yes" / "No". */
export function lineShort(side: PropSide, line: number, stat: PropStat): string {
  if (stat === 'anytime_td') return side === 'over' ? 'TD yes' : 'TD no';
  return `${side === 'over' ? 'o' : 'u'}${line}`;
}
