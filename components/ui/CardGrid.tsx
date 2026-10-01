/**
 * CardGrid — the app's standard responsive card wall.
 *
 * One rule, reused everywhere: lay out children as cards that are each between
 * `minCard` and `maxCard` wide, and fit as many per row as the viewport allows,
 * reflowing live on resize / rotate — no breakpoints, no JS device detection.
 * `maxCols` caps how many sit in a row (and nothing wider than that), so wide
 * monitors look intentional instead of endless. Cards are left-aligned so they
 * line up under section headers.
 *
 * This is the house pattern for any grid of cards (Standings, Leaders, and any
 * future tab): wrap the cards in <CardGrid> and pick a `maxCols`.
 *
 * Server- and client-safe (no hooks), so server pages and client sections can
 * both use it.
 */

import type { CSSProperties, ReactNode } from 'react';

interface CardGridProps {
  children: ReactNode;
  /** Smallest a card may get before the row drops to fewer columns (px). */
  minCard?: number;
  /** Largest a card may get — keeps card internals tight, never stretched (px). */
  maxCard?: number;
  /** Max cards per row (also caps the grid's overall width). */
  maxCols?: number;
  /** Gap between cards (px). */
  gap?: number;
  className?: string;
}

export default function CardGrid({
  children,
  minCard = 280,
  maxCard = 340,
  maxCols = 4,
  gap = 12,
  className = '',
}: CardGridProps) {
  const style: CSSProperties = {
    display: 'grid',
    gap,
    // auto-fit counts columns by the track's MAX when it's a definite length, so a
    // fixed px max (e.g. 340px) makes `minCard` irrelevant to packing. Using `1fr`
    // as the max makes the column COUNT driven by `minCard` (as intended) and lets
    // cards grow to fill the row; `maxCard` still caps card width via `maxWidth` below.
    gridTemplateColumns: `repeat(auto-fit, minmax(min(${minCard}px, 100%), 1fr))`,
    // Cap the row at `maxCols` cards: width = N cards + the gaps between them.
    maxWidth: maxCols * maxCard + (maxCols - 1) * gap,
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
