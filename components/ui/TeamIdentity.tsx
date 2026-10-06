/**
 * TeamIdentity — one team mark that is either the team logo or the surface's
 * existing abbreviation, per config/teamIdentity.ts.
 *
 *   logo mode:  [🏈]          fixed size×size box, lazy + async decode
 *   name mode:  {children}    the call site's original markup, untouched
 *
 * Name mode returns `children` as-is, so turning logos off is pixel-identical
 * to the pre-logo app by construction (each surface styles its abbreviation
 * differently — Home 24px team color, pills plain white, menus TeamMark…).
 * Unknown teams (e.g. "League Average") also fall back to `children`.
 *
 * No hooks → usable from server and client components.
 */

import type { ReactNode } from 'react';
import { resolveTeamByAbbr } from '@/lib/teams';
import {
  DARK_LOGOS,
  getTeamIdentityMode,
  teamLogoSrc,
  type TeamIdentitySurface,
} from '@/config/teamIdentity';

interface TeamIdentityProps {
  /** Team abbreviation (ESPN legacy aliases like WSH/JAC/LA are accepted). */
  abbr: string;
  surface: TeamIdentitySurface;
  /** Logo box in px (width = height). Keep it inside the surface's existing slot. */
  size: number;
  /**
   * Logo mode only: center the logo in a box this wide — the width the name
   * markup occupied — so columns next to it don't move (e.g. TeamMark 35px).
   */
  slot?: number;
  className?: string;
  /**
   * The parent already announces the team (e.g. a row button's aria-label) →
   * empty alt so screen readers don't read the name twice.
   */
  decorative?: boolean;
  /** Logo mode: keep the name markup too, right after the logo (logo + abbr). */
  withName?: boolean;
  /** Name-mode markup — exactly what the surface rendered before logos. */
  children: ReactNode;
}

export default function TeamIdentity({ abbr, surface, size, slot, className, decorative = false, withName = false, children }: TeamIdentityProps) {
  const team = resolveTeamByAbbr(abbr);
  if (getTeamIdentityMode(surface) === 'name' || !team) return <>{children}</>;

  const logo = (
    // Local SVG: next/image adds nothing for SVGs (no resize/format step), so a plain
    // <img> with explicit width/height (no layout shift) + lazy/async is the lighter path.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={teamLogoSrc(team.name)}
      alt={decorative ? '' : team.name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className}
      style={{
        width: size,
        height: size,
        flex: 'none',
        objectFit: 'contain',
        filter: DARK_LOGOS.has(team.abbr) ? 'var(--logo-halo)' : undefined,
      }}
    />
  );
  const mark = slot ? (
    <span className="inline-flex shrink-0 items-center justify-center" style={{ width: slot }}>
      {logo}
    </span>
  ) : logo;
  // Fragment → logo and name stay separate children of the caller's flex row (its gap applies).
  return withName ? <>{mark}{children}</> : mark;
}
