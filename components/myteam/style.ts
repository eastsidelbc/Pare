/**
 * My Team style + format helpers (design-system §9.4). Colors are token
 * references only — the values live in app/globals.css :root.
 */

import type { CSSProperties } from 'react';
import type { LeagueBundle } from '@/lib/myteam/apiTypes';
import type { FantasyLeague, FantasyPosition, InjuryTag, MatchupTier } from '@/lib/myteam/types';

/** Tier → meter level 1 (Avoid) … 5 (Great) → `--matchup-{n}`. */
export const TIER_LEVEL: Readonly<Record<MatchupTier, 1 | 2 | 3 | 4 | 5>> = { avoid: 1, tough: 2, avg: 3, good: 4, great: 5 };

export function tierColor(tier: MatchupTier): string {
  return `var(--matchup-${TIER_LEVEL[tier]})`;
}

/** Position circle colors; K / DEF / unrated use the neutral `--pos-other`. */
export function posColors(position: FantasyPosition | null): { fg: string; bg: string } {
  const key = position === 'QB' || position === 'RB' || position === 'WR' || position === 'TE' ? position.toLowerCase() : 'other';
  return { fg: `var(--pos-${key})`, bg: `var(--pos-${key}-bg)` };
}

export const INJURY_COLOR: Readonly<Record<InjuryTag, string>> = {
  Q: 'var(--inj-q)',
  D: 'var(--inj-d)',
  O: 'var(--inj-o)',
  IR: 'var(--inj-ir)',
};

export const INJURY_LABEL: Readonly<Record<InjuryTag, string>> = { Q: 'Questionable', D: 'Doubtful', O: 'Out', IR: 'Injured reserve' };

/** "QBs" — mockup copy ("allows to QBs", "START / SIT · QBS"). */
export function positionPlural(position: FantasyPosition): string {
  return `${position}s`;
}

/** Start / Sit hint: "vs 1 other QB" / "vs 2 other QBs". */
export function startSitHint(position: FantasyPosition, others: number): string {
  return `vs ${others} other ${others === 1 ? position : positionPlural(position)}`;
}

/** "#28", tied "T-14" (mockup rank style — never "28th"). */
export function rankText(rank: number, isTied: boolean): string {
  return `${isTied ? 'T-' : '#'}${rank}`;
}

export function scoringLabel(format: LeagueBundle['league']['format']): string {
  if (format === 'ppr') return 'PPR';
  if (format === 'half') return 'Half-PPR';
  if (format === 'std') return 'Standard';
  return 'League-scoring';
}

/** Format line for the current league ("PPR · Superflex · 10 teams"). */
export function leagueFormatLine(league: LeagueBundle['league']): string {
  const superflex = league.rosterSlots.includes('SUPER_FLEX');
  return [scoringLabel(league.format), superflex ? 'Superflex' : null, `${league.totalRosters} teams`].filter(Boolean).join(' · ');
}

/** Format line for a league we only have the list entry for. */
export function leagueListLine(league: FantasyLeague): string {
  return `${league.totalRosters} teams · ${league.status === 'in_season' ? 'In season' : league.status === 'pre_draft' ? 'Pre-draft' : league.status === 'drafting' ? 'Drafting' : 'Complete'}`;
}

/** "Sun 1:00 PM" in the viewer's time zone. */
export function kickoffText(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-US', { weekday: 'short' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ');
  return `${day} ${time}`;
}

/** "Oct 1 – Oct 5" (mockup: month on both ends). */
export function dateRangeText(range: { first: string; last: string } | null): string | null {
  if (!range) return null;
  const a = new Date(range.first);
  const b = new Date(range.last);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  const start = `${month(a)} ${a.getDate()}`;
  if (a.toDateString() === b.toDateString()) return start;
  return `${start} – ${month(b)} ${b.getDate()}`;
}

/** Deep list card (§9.2 recipe): one card per roster section. */
export const LIST_CARD: CSSProperties = {
  background: 'linear-gradient(135deg, var(--card-deep-a) 0%, var(--card-deep-mid) 55%, var(--card-deep-b) 100%)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-lg)',
};

/** Gold-ring glass button (Continue, Start / Sit back, …) — same ring as ActivePill. */
export const GOLD_RING_BUTTON: CSSProperties = {
  border: '1.5px solid var(--gold-bright)',
  background: 'color-mix(in srgb, var(--gold-bright) 8%, transparent)',
  boxShadow: '0 0 12px color-mix(in srgb, var(--gold-bright) 35%, transparent)',
  color: 'var(--gold-bright)',
  fontWeight: 800,
};

/** 48px action button inside an expanded card (mockup: 14/800, radius 10). Kept on the darker build surface. */
export const ACTION_BUTTON: CSSProperties = {
  height: 48,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--frame-mid)',
  background: 'var(--nav-bg)',
  color: 'var(--text)',
  fontSize: 14,
  fontWeight: 800,
};
