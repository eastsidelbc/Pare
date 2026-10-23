/**
 * Leans track record — measured, not claimed (npm run backtest:leans; full reports in
 * docs/devnotes/2026-10-23-leans-backtest/). Props graded on the book's opening line, only
 * players the app would have listed that week (live lineup cap), inactive weeks voided;
 * game lines on the closing line. `roi` = units won per unit staked at the book's prices —
 * a winning W-L can still lose money (prop unders are often priced −130 or worse).
 * Update these numbers when the backtest is rerun.
 */

import { signed } from './format';

export interface SeasonRecord {
  season: number;
  wins: number;
  losses: number;
  /** Return per unit staked at the book's prices (−0.027 = −2.7%). */
  roi: number;
}

export const LEANS_RECORD = {
  props: [
    { season: 2025, wins: 317, losses: 273, roi: -0.027 },
    { season: 2024, wins: 439, losses: 355, roi: -0.056 },
  ] as readonly SeasonRecord[],
  moneyline: [
    { season: 2025, wins: 30, losses: 6, roi: 0.032 },
    { season: 2024, wins: 28, losses: 4, roi: 0.144 },
  ] as readonly SeasonRecord[],
} as const;

const roiText = (r: number) => `${signed(Math.round(r * 1000) / 10)}%`;

/** "2025 317–273 (−2.7%) · 2024 439–355 (−5.6%)" */
export function recordText(rows: readonly SeasonRecord[]): string {
  return rows.map((r) => `${r.season} ${r.wins}–${r.losses} (${roiText(r.roi)})`).join(' · ');
}
