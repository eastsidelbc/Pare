/**
 * usePlayerVsDefense — the player-vs-defense view model (B1), shared by the player screen and
 * the prop screen's "Player vs <OPP>" dropdown (2026-10-23). Pure derivation from the Leans
 * bundle: tier + rank for the window, why-stats, next-N week cells, last-4 bars.
 */

'use client';

import { useMemo } from 'react';
import type { MatchupRating } from '@/lib/myteam/rating';
import type { WhyStat } from '@/lib/myteam/defenseProfile';
import type { RatingWindow } from '@/lib/myteam/types';
import { buildRanks, cellFor, type MatchupCell } from '@/lib/myteam/viewModel';
import { LEAN_CONFIG } from '@/lib/leans/config';
import { fpaBefore, gamesBefore, ratingFor, whyFor } from '@/lib/leans/evaluate';
import type { LeansBundle, LeansPlayer } from '@/lib/leans/types';
import { MAX_WEEK, type Matchup } from '@/lib/schedule';
import { circlePlayer } from './PropRow';

export interface PlayerVsDefenseModel {
  rating: MatchupRating | null;
  of: number;
  why: WhyStat[];
  cells: MatchupCell[];
  bars: { label: string; games: Array<{ week: number; value: number }> };
}

export function usePlayerVsDefense(
  bundle: LeansBundle | null,
  player: LeansPlayer | null,
  matchup: Matchup | null,
  week: number | null,
  window: RatingWindow,
): PlayerVsDefenseModel | null {
  return useMemo(() => {
    if (!bundle || !player || !matchup || week == null) return null;
    const opp = player.team === matchup.home.abbr ? matchup.away.abbr : matchup.home.abbr;
    const { rating, of } = ratingFor(bundle, player.position, opp, week, window);
    const ranks = buildRanks(fpaBefore(bundle.fpa, week), window);
    const rp = circlePlayer({ playerId: player.id, playerName: player.name, position: player.position, team: player.team }, player.injury);
    const cells: MatchupCell[] = Array.from({ length: LEAN_CONFIG.data.weekCells }, (_, i) => week + i)
      .filter((w) => w <= MAX_WEEK)
      .map((w) => cellFor(rp, w, bundle.schedule, ranks));
    const rushing = player.position === 'RB' || player.position === 'QB';
    const last = gamesBefore(player, week).slice(-LEAN_CONFIG.lastN);
    return {
      rating,
      of,
      why: whyFor(bundle, player.position, opp, week, window),
      cells,
      bars: { label: rushing ? 'rush yds' : 'rec yds', games: last.map((g) => ({ week: g.week, value: rushing ? g.rush_yd : g.rec_yd })) },
    };
  }, [bundle, player, matchup, week, window]);
}
