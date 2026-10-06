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
    // Column COUNT comes from the track minimum: at least `minCard` wide, and never
    // narrower than 1/maxCols of the row — so the row can't hold more than `maxCols`
    // (before, maxCols only capped the grid's width, and a wide screen still packed
    // 6 Leaders cards at 1194px). `auto-fill` (not auto-fit) keeps empty tracks, so a
    // section with fewer cards than columns keeps the same card width instead of
    // stretching 2 cards across the whole row. `maxCard` still caps width via maxWidth.
    gridTemplateColumns: `repeat(auto-fill, minmax(max(min(${minCard}px, 100%), calc((100% - ${(maxCols - 1) * gap}px) / ${maxCols})), 1fr))`,
    // An expanded card grows alone; its row-mates keep their own height.
    alignItems: 'start',
    // Cap the row at `maxCols` cards: width = N cards + the gaps between them.
    maxWidth: maxCols * maxCard + (maxCols - 1) * gap,
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
