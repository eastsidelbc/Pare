/**
 * Start / Sit — pure. Compares two of MY players at the same position by
 * matchup only: this week's FPA rank, then how many of the next 5 weeks are
 * Good/Great. Not a projection (design-system §9.4 — the UI says so).
 *
 * Rank convention (lib/myteam/rating.ts): #1 = fewest points allowed, so a
 * HIGHER rank = a more generous defense = the easier matchup.
 */

import type { MatchupTier } from './types';
import type { MatchupCell, RosterRow } from './viewModel';

export type Side = 'a' | 'b';
/** `none` = not enough information to call it (both on bye, or an unrated/unknown week). */
export type Verdict = Side | 'tie' | 'none';

const GOOD_TIERS: ReadonlySet<MatchupTier> = new Set(['good', 'great']);

/** My other players at the same position, in roster order. Unrated positions get none. */
export function startSitCandidates(row: RosterRow, rows: readonly RosterRow[]): RosterRow[] {
  const pos = row.player.position;
  if (!pos) return [];
  return rows.filter((r) => r.player.position === pos && r.player.playerId !== row.player.playerId);
}

/**
 * The swap the user most likely means: a starter → the first bench player at
 * that position (then IR / taxi); a bench / IR / taxi player → the first
 * starter. Falls back to the first candidate; null when there is none.
 */
export function likelySwap(row: RosterRow, rows: readonly RosterRow[]): RosterRow | null {
  const candidates = startSitCandidates(row, rows);
  if (candidates.length === 0) return null;
  const preferred =
    row.player.group === 'starter'
      ? (candidates.find((r) => r.player.group === 'bench') ?? candidates.find((r) => r.player.group !== 'starter'))
      : candidates.find((r) => r.player.group === 'starter');
  return preferred ?? candidates[0];
}

/** Easier matchup in one week. A game beats a bye; equal ranks (incl. T- ties) are a tie. */
export function easierWeek(a: MatchupCell, b: MatchupCell): Verdict {
  const aBye = a.kind === 'bye';
  const bBye = b.kind === 'bye';
  if (aBye && bBye) return 'none';
  if (aBye) return b.kind === 'game' ? 'b' : 'none';
  if (bBye) return a.kind === 'game' ? 'a' : 'none';
  if (!a.rating || !b.rating) return 'none';
  if (a.rating.rank === b.rating.rank) return 'tie';
  return a.rating.rank > b.rating.rank ? 'a' : 'b';
}

/** Weeks rated Good or Great. Byes and unrated weeks don't count. */
export function goodWeeks(cells: readonly MatchupCell[]): number {
  return cells.filter((c) => c.rating && GOOD_TIERS.has(c.rating.tier)).length;
}

export interface StartSitResult {
  thisWeek: Verdict;
  next: { verdict: Verdict; a: number; b: number };
  /** The side the UI highlights: this week decides; the next 5 break a tie / no-call. */
  easier: Verdict;
}

export function compareStartSit(a: RosterRow, b: RosterRow): StartSitResult {
  const thisWeek = easierWeek(a.thisWeek, b.thisWeek);
  const aGood = goodWeeks(a.strip);
  const bGood = goodWeeks(b.strip);
  const nextVerdict: Verdict = aGood === bGood ? 'tie' : aGood > bGood ? 'a' : 'b';
  const easier = thisWeek === 'a' || thisWeek === 'b' ? thisWeek : nextVerdict;
  return { thisWeek, next: { verdict: nextVerdict, a: aGood, b: bGood }, easier };
}
