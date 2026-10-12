/**
 * My Team screen view model — pure. Bundle + window → roster rows with a
 * this-week matchup cell and a look-ahead strip. Ranks are computed once per
 * position per window (client-side ranking).
 */

import type { LeagueBundle } from './apiTypes';
import { rankFpa, rateMatchup, type FpaRank, type MatchupRating } from './rating';
import { FANTASY_POSITIONS, type FantasyPosition, type RatingWindow, type RosterPlayer } from './types';

/** Weeks shown after "this week" (P4 pick 2026-10-07: stays 5). */
export const LOOKAHEAD_WEEKS = 5;
const LAST_WEEK = 18;

export type PositionRanks = Record<FantasyPosition, Map<string, FpaRank>>;

export interface MatchupCell {
  week: number;
  kind: 'game' | 'bye' | 'unknown';
  opp: string | null;
  home: boolean;
  /** ISO kickoff for games, else null. */
  kickoff: string | null;
  /** null for byes, unknown weeks, unrated positions, or opponents without games yet. */
  rating: MatchupRating | null;
}

export interface RosterRow {
  player: RosterPlayer;
  thisWeek: MatchupCell;
  strip: MatchupCell[];
}

export interface RosterView {
  week: number;
  window: RatingWindow;
  starters: RosterRow[];
  bench: RosterRow[];
  /** IR + taxi (always-open section). */
  reserve: RosterRow[];
  preDraft: boolean;
}

export function buildRanks(fpa: LeagueBundle['fpa'], window: RatingWindow): PositionRanks {
  return Object.fromEntries(FANTASY_POSITIONS.map((p) => [p, rankFpa(fpa, p, window)])) as PositionRanks;
}

export function cellFor(player: RosterPlayer, week: number, schedule: LeagueBundle['schedule'], ranks: PositionRanks): MatchupCell {
  const entry = player.nflTeam ? schedule[player.nflTeam]?.[week] : undefined;
  if (entry === 'BYE') return { week, kind: 'bye', opp: null, home: false, kickoff: null, rating: null };
  if (!entry) return { week, kind: 'unknown', opp: null, home: false, kickoff: null, rating: null };
  const rating = player.position ? rateMatchup(ranks[player.position], entry.opp) : null;
  return { week, kind: 'game', opp: entry.opp, home: entry.home, kickoff: entry.kickoff, rating };
}

export function lookaheadWeeks(week: number, count = LOOKAHEAD_WEEKS): number[] {
  const out: number[] = [];
  for (let w = week + 1; w <= Math.min(LAST_WEEK, week + count); w++) out.push(w);
  return out;
}

export function buildRosterView(
  bundle: Pick<LeagueBundle, 'week' | 'roster' | 'schedule' | 'fpa'>,
  window: RatingWindow,
): RosterView {
  const ranks = buildRanks(bundle.fpa, window);
  const weeks = lookaheadWeeks(bundle.week);
  const row = (player: RosterPlayer): RosterRow => ({
    player,
    thisWeek: cellFor(player, bundle.week, bundle.schedule, ranks),
    strip: weeks.map((w) => cellFor(player, w, bundle.schedule, ranks)),
  });
  const players = bundle.roster.players;
  return {
    week: bundle.week,
    window,
    starters: players.filter((p) => p.group === 'starter').map(row),
    bench: players.filter((p) => p.group === 'bench').map(row),
    reserve: players.filter((p) => p.group === 'ir' || p.group === 'taxi').map(row),
    preDraft: bundle.roster.preDraft,
  };
}

/** Flex slot label for the position circle: "SFLX" for super flex, "FLEX" for any other flex, else null. */
export function slotLabel(slot: string | null): string | null {
  if (!slot) return null;
  if (slot === 'SUPER_FLEX') return 'SFLX';
  if (slot.includes('FLEX')) return 'FLEX';
  return null;
}

/** First and last kickoff of `week` across the schedule (the week bar's date range); null if none. */
export function weekKickoffRange(schedule: LeagueBundle['schedule'], week: number): { first: string; last: string } | null {
  let first: string | null = null;
  let last: string | null = null;
  for (const weeks of Object.values(schedule)) {
    const entry = weeks[week];
    if (!entry || entry === 'BYE') continue;
    if (first === null || entry.kickoff < first) first = entry.kickoff;
    if (last === null || entry.kickoff > last) last = entry.kickoff;
  }
  return first && last ? { first, last } : null;
}

/** "vs KC" / "@ KC" / "BYE" / "—". */
export function matchupText(cell: MatchupCell): string {
  if (cell.kind === 'bye') return 'BYE';
  if (cell.kind === 'unknown' || !cell.opp) return '—';
  return `${cell.home ? 'vs' : '@'} ${cell.opp}`;
}
