/**
 * Matchup rating — pure. FPA per game over a window → rank across teams →
 * tier + chip text. Ranking uses the shared core (lib/ranking.ts) and runs
 * client-side.
 *
 * Rank convention (same direction as Compare's defense ranks):
 * #1 = FEWEST fantasy points allowed per game to that position (toughest).
 * So a high rank (#27–32) = generous opponent = Great matchup for MY player.
 * Tier cut-offs are the P4 picks (2026-10-07, design-system §9.4) — change
 * TIER_CUTOFFS only.
 */

import { rankAll, type RankPosition } from '@/lib/ranking';
import { playedWeeks, type FpaTable } from './fpa';
import type { FantasyPosition, MatchupTier, RatingWindow } from './types';

/** Games in the "Last 4" window. */
export const LAST_N_GAMES = 4;

/** Ascending rank ceilings → tier. Ranks past the last ceiling fall in the last tier. */
export const TIER_CUTOFFS: ReadonlyArray<{ maxRank: number; tier: MatchupTier }> = [
  { maxRank: 5, tier: 'avoid' },
  { maxRank: 12, tier: 'tough' },
  { maxRank: 20, tier: 'avg' },
  { maxRank: 27, tier: 'good' },
  { maxRank: 32, tier: 'great' },
];

export const TIER_LABEL: Readonly<Record<MatchupTier, string>> = {
  great: 'Great',
  good: 'Good',
  avg: 'Avg',
  tough: 'Tough',
  avoid: 'Avoid',
};

/** Which of a team's played weeks count for the window (byes are never in `weeks`). */
export function windowWeeks(weeks: readonly number[], window: RatingWindow): number[] {
  const sorted = [...weeks].sort((a, b) => a - b);
  return window === 'last4' ? sorted.slice(-LAST_N_GAMES) : sorted;
}

/** FPA per game for one team/position over the window; null if no games yet. */
export function fpaPerGame(table: FpaTable, team: string, position: FantasyPosition, window: RatingWindow): number | null {
  const cells = table[team]?.[position];
  if (!cells) return null;
  let pts = 0;
  let games = 0;
  for (const week of windowWeeks(playedWeeks(table, team), window)) {
    const cell = cells[week];
    if (!cell) continue;
    pts += cell.pts;
    games += cell.games;
  }
  return games > 0 ? pts / games : null;
}

export interface FpaRank extends RankPosition {
  perGame: number;
}

/** Rank every team for one position: #1 = fewest points allowed per game. */
export function rankFpa(table: FpaTable, position: FantasyPosition, window: RatingWindow): Map<string, FpaRank> {
  const entries: Array<[string, number]> = [];
  for (const team of Object.keys(table)) {
    const perGame = fpaPerGame(table, team, position, window);
    if (perGame !== null) entries.push([team, perGame]);
  }
  const ranks = rankAll(entries, false);
  const perGameByTeam = new Map(entries);
  const out = new Map<string, FpaRank>();
  for (const [team, pos] of ranks) out.set(team, { ...pos, perGame: perGameByTeam.get(team) ?? 0 });
  return out;
}

export function tierForRank(rank: number): MatchupTier {
  for (const { maxRank, tier } of TIER_CUTOFFS) if (rank <= maxRank) return tier;
  return TIER_CUTOFFS[TIER_CUTOFFS.length - 1].tier;
}

/** Skeleton chip text: "Good · #24", tied "Good · T-24". */
export function chipText(tier: MatchupTier, rank: number, isTied: boolean): string {
  return `${TIER_LABEL[tier]} · ${isTied ? 'T-' : '#'}${rank}`;
}

export interface MatchupRating {
  tier: MatchupTier;
  label: string;
  rank: number;
  isTied: boolean;
  formattedRank: string;
  perGame: number;
  text: string;
}

/** Rating for a player at `position` facing `opponent`; null if the opponent has no games in the table. */
export function rateMatchup(ranks: ReadonlyMap<string, FpaRank>, opponent: string): MatchupRating | null {
  const r = ranks.get(opponent);
  if (!r) return null;
  const tier = tierForRank(r.rank);
  return {
    tier,
    label: TIER_LABEL[tier],
    rank: r.rank,
    isTied: r.isTied,
    formattedRank: r.formattedRank,
    perGame: r.perGame,
    text: chipText(tier, r.rank, r.isTied),
  };
}
