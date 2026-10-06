/**
 * glassControl — the one style source for glass toggles (design-system §9 rule 7):
 * the bottom nav and the header capsules (Standings view, Fantasy TOT/PPG, Leaders
 * jump nav). Active = gold-bright 700 over an `ActivePill`; inactive = `--glass-off`
 * 500 (4.70:1 on `--nav-bg`). Font size stays per control (nav 12px, headers 11–11.5px).
 */

import type { CSSProperties, ReactNode } from 'react';

/** Label color for an item — gold-bright when active, the shared glass grey when not. */
export function glassColor(active: boolean): string {
  return active ? 'var(--gold-bright)' : 'var(--glass-off)';
}

/** Text/icon color fade on switch — same as the nav (≤ .2s, color only). */
export const GLASS_COLOR_TRANSITION = 'color .2s';

/** Header capsule (36px, 30px items inside). The nav keeps its own taller capsule. */
export const glassCapsule: CSSProperties = {
  height: 36,
  padding: 3,
  gap: 2,
  background: 'var(--nav-bg)',
  border: '1px solid var(--glass-edge)',
};

/**
 * A toggle label that sits above the pill. Reserves its bold (700) width with an
 * invisible copy, so switching 500 ↔ 700 never nudges the neighbouring items.
 */
export function GlassLabel({
  active,
  children,
  style,
}: {
  active: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      className="relative z-[1] inline-grid justify-items-center"
      style={{ ...style, color: glassColor(active), transition: GLASS_COLOR_TRANSITION }}
    >
      <span aria-hidden className="invisible col-start-1 row-start-1" style={{ fontWeight: 700 }}>
        {children}
      </span>
      <span className="col-start-1 row-start-1" style={{ fontWeight: active ? 700 : 500 }}>
        {children}
      </span>
    </span>
  );
}
