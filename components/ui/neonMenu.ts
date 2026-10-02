/**
 * Shared look for Neon Frame (Round 5 "R") dropdown menus — the team picker and
 * the rank list. Deep gradient card, faint frame, hairline rows, gold header.
 * Style objects only (no logic) so both menus stay visually identical.
 */

import type { CSSProperties } from 'react';

/** Row height for compact menu lists (px). 40 ≈ 13–14 rows on an iPhone 14 Pro. */
export const MENU_ROW_H = 40;

/**
 * Viewport padding for Floating UI (flip/shift/size). The bottom keeps clear of
 * the floating bottom nav (40px pill + 12px gap + breathing room).
 */
export const MENU_VIEWPORT_PADDING = { top: 12, right: 12, bottom: 76, left: 12 };

/** Max menu height from Floating UI's availableHeight — grows with the screen. */
export function menuMaxHeight(availableHeight: number): number {
  return Math.max(220, Math.floor(availableHeight));
}

export const menuSurface: CSSProperties = {
  background: 'linear-gradient(160deg, var(--card-deep-a), var(--card-deep-mid) 55%, var(--card-deep-b))',
  border: '1px solid var(--frame-mid)',
  boxShadow: 'var(--shadow-pop), 0 0 24px color-mix(in srgb, var(--gold-bright) 10%, transparent)',
};

export const menuBackdrop: CSSProperties = {
  background: 'color-mix(in srgb, var(--bg-deep) 60%, transparent)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
};

export const menuHeader: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: 'var(--gold-bright)',
};

/** Row chrome: hairline divider; current row = gold edge + faint gold tint. */
export function menuRowStyle(index: number, isCurrent: boolean): CSSProperties {
  return {
    height: MENU_ROW_H,
    borderTop: index > 0 ? '1px solid var(--hairline)' : 'none',
    background: isCurrent ? 'color-mix(in srgb, var(--gold-bright) 8%, transparent)' : 'transparent',
    boxShadow: isCurrent ? 'inset 2px 0 0 0 var(--gold-bright)' : undefined,
  };
}
