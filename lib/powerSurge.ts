/**
 * Power Surge — the "this team is loaded" card effect (storm crackle, B·9).
 *
 * A team's half of a Compare card (Offense or Defense) is POWERED when it ranks
 * top POWER_TOP in at least POWER_MIN of that card's metrics. Ranks come from
 * the same client-side ranking the badges show (useRanking) — no new data.
 *
 * Pure helpers only (no React) — unit-tested in lib/__tests__/powerSurge.test.ts.
 */

/** Rank cutoff that counts as "elite" (matches the gold rank-badge tier). */
export const POWER_TOP = 5;
/** How many elite metrics on one card switch the effect on. */
export const POWER_MIN = 3;

/** Number of ranks at or inside the top cutoff. Missing ranks (null) never count. */
export function countTopRanks(ranks: ReadonlyArray<number | null | undefined>, top = POWER_TOP): number {
  return ranks.filter((r): r is number => typeof r === 'number' && r >= 1 && r <= top).length;
}

export function isPowered(ranks: ReadonlyArray<number | null | undefined>): boolean {
  return countTopRanks(ranks) >= POWER_MIN;
}

// ---------------------------------------------------------------- drawing math

export type Point = [number, number];

/**
 * Jagged lightning path between two points (midpoint displacement).
 * `rand` is injectable so tests are deterministic.
 */
export function boltPoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  displacement: number,
  depth: number,
  rand: () => number = Math.random,
): Point[] {
  let pts: Point[] = [[x0, y0], [x1, y1]];
  let disp = displacement;
  for (let i = 0; i < depth; i++) {
    const next: Point[] = [pts[0]];
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k];
      const [bx, by] = pts[k + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const off = (rand() - 0.5) * disp;
      next.push([(ax + bx) / 2 - (dy / len) * off, (ay + by) / 2 + (dx / len) * off], [bx, by]);
    }
    pts = next;
    disp /= 2;
  }
  return pts;
}
