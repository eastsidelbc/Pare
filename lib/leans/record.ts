/**
 * Leans track record — measured, not claimed (npm run backtest:leans; full reports in
 * docs/devnotes/2026-10-23-leans-backtest/). Props graded on the book's opening line,
 * game lines on the closing line. Update these numbers when the backtest is rerun.
 */

export interface SeasonRecord {
  season: number;
  wins: number;
  losses: number;
}

export const LEANS_RECORD = {
  props: [
    { season: 2025, wins: 112, losses: 113 },
    { season: 2024, wins: 225, losses: 175 },
  ] as readonly SeasonRecord[],
  moneyline: [
    { season: 2025, wins: 30, losses: 6 },
    { season: 2024, wins: 28, losses: 4 },
  ] as readonly SeasonRecord[],
} as const;

/** "2025 112–113 · 2024 225–175" */
export function recordText(rows: readonly SeasonRecord[]): string {
  return rows.map((r) => `${r.season} ${r.wins}–${r.losses}`).join(' · ');
}
