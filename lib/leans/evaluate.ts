/**
 * Bundle → per-screen lean inputs (pure). Everything is cut to games BEFORE the
 * week being looked at, so a past week reads the way it did before kickoff —
 * hit rates, game logs AND the matchup tier.
 */

import { whyStats, type WhyStat } from '@/lib/myteam/defenseProfile';
import type { FpaTable } from '@/lib/myteam/fpa';
import { rankFpa, rateMatchup, type MatchupRating } from '@/lib/myteam/rating';
import type { RatingWindow } from '@/lib/myteam/types';
import { LEAN_CONFIG } from './config';
import { gameLeans, leagueForm, type GameLeans, type LeagueForm } from './gameLean';
import { propLean, type PropLeanResult } from './propLean';
import type { LeansBundle, LeansPlayer, PropPosition, SavedProp } from './types';
import type { Matchup } from '@/lib/schedule';

/** The FPA table with only weeks before `week`. */
export function fpaBefore(table: FpaTable, week: number): FpaTable {
  const out: FpaTable = {};
  for (const [team, byPos] of Object.entries(table)) {
    const cut = Object.fromEntries(
      Object.entries(byPos).map(([pos, weeks]) => [pos, Object.fromEntries(Object.entries(weeks).filter(([w]) => Number(w) < week))]),
    ) as FpaTable[string];
    out[team] = cut;
  }
  return out;
}

/** Opponent's rating for a position, before `week` (null = no games yet / unknown team) + how many teams were ranked. */
export function ratingFor(
  bundle: Pick<LeansBundle, 'fpa'>,
  position: PropPosition,
  opp: string,
  week: number,
  window: RatingWindow,
): { rating: MatchupRating | null; of: number } {
  const ranks = rankFpa(fpaBefore(bundle.fpa, week), position, window);
  return { rating: rateMatchup(ranks, opp), of: ranks.size };
}

/** Opponent why-stats (rush / pass yds allowed …) for a position, before `week`. */
export function whyFor(bundle: Pick<LeansBundle, 'defenseLog'>, position: PropPosition, opp: string, week: number, window: RatingWindow): WhyStat[] {
  return whyStats(position, opp, bundle.defenseLog.filter((g) => g.week < week), [], window);
}

export function gamesBefore(player: LeansPlayer, week: number) {
  return player.games.filter((g) => g.week < week);
}

export interface EvaluatedProp {
  prop: SavedProp;
  player: LeansPlayer | null;
  rating: MatchupRating | null;
  /** Teams in the rating's ranking (for "allows the 3rd-most"). */
  ratingOf: number;
  lean: PropLeanResult | null;
}

export function evaluateProp(prop: SavedProp, bundle: LeansBundle | null): EvaluatedProp {
  const player = bundle?.players.find((p) => p.id === prop.playerId) ?? null;
  if (!bundle || !player) return { prop, player, rating: null, ratingOf: 0, lean: null };
  const { rating, of } = ratingFor(bundle, prop.position, prop.opp, prop.week, LEAN_CONFIG.prop.tierWindow);
  const lean = propLean({
    games: gamesBefore(player, prop.week),
    stat: prop.stat,
    line: prop.line,
    side: prop.side,
    position: prop.position,
    rating,
  });
  return { prop, player, rating, ratingOf: of, lean };
}

/** Lean form for one week (shared by every card in that week). */
export function leagueFormFor(bundle: Pick<LeansBundle, 'teamLog'>, week: number): LeagueForm {
  return leagueForm(bundle.teamLog, week);
}

export function leansForGame(bundle: Pick<LeansBundle, 'teamLog'>, m: Matchup, league?: LeagueForm): GameLeans {
  return gameLeans(
    bundle.teamLog,
    {
      awayTeam: m.away.abbr,
      homeTeam: m.home.abbr,
      week: m.week,
      total: m.odds?.overUnder ?? null,
      spreadLine: m.odds?.spreadLine ?? null,
      hasSpread: !!m.odds,
      hasMoneyline: !!m.odds?.moneyline,
    },
    league ?? leagueForm(bundle.teamLog, m.week),
  );
}
