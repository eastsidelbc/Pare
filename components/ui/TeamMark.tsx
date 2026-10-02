/**
 * TeamMark — 2–3 letter team abbreviation in the Compare wordmark style
 * (Inter 900, outlined in the team's color with a soft glow). Replaces logo
 * artwork in pickers and lists (licensing: no logos, names as text).
 *
 *   [ KC ]  [ BUF ]  [ SF ]
 *
 * Fixed width so names line up in a list. Unknown teams (League Average)
 * render a muted "AVG". Purely visual → aria-hidden (rows announce the name).
 */

'use client';

import { memo } from 'react';
import { getTeamByName } from '@/lib/teams';
import { getTeamPalette } from '@/lib/teamColors';

interface TeamMarkProps {
  teamName: string;
  /** Letter size in px (default 15 — fits a 40px row). */
  size?: number;
  className?: string;
}

function TeamMark({ teamName, size = 15, className }: TeamMarkProps) {
  const abbr = getTeamByName(teamName)?.abbr ?? 'AVG';
  const pal = getTeamPalette(teamName);
  const stroke = Math.max(0.9, size / 14);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap ${className ?? ''}`}
      style={{
        width: Math.round(size * 2.5),
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: '0.02em',
        color: pal ? `rgba(${pal.rgb}, 0.22)` : 'transparent',
        WebkitTextStroke: `${stroke}px ${pal ? pal.line : 'var(--muted)'}`,
        textShadow: pal ? `0 0 ${Math.round(size * 0.8)}px rgba(${pal.rgb}, 0.6)` : undefined,
      }}
    >
      {abbr}
    </span>
  );
}

export default memo(TeamMark);
