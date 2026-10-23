/**
 * PlayerScreen — /leans/player/[playerId]?game=<Matchup id> container (B1). The game
 * gives the week, the opponent and the two teams to load; the Season / Last 4 toggle
 * re-ranks client-side (same tables as the prop card, cut to games before the week).
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { dateRangeText } from '@/components/myteam/style';
import { buildRanks, cellFor, type MatchupCell } from '@/lib/myteam/viewModel';
import type { RatingWindow } from '@/lib/myteam/types';
import { LEAN_CONFIG } from '@/lib/leans/config';
import { MAX_WEEK } from '@/lib/schedule';
import { useLeansBundle, weekOfGameId } from '@/lib/leans/client';
import { fpaBefore, gamesBefore, ratingFor, whyFor } from '@/lib/leans/evaluate';
import { gameHref } from './GameCard';
import LeansFooter from './LeansFooter';
import { LeansShell, LeansTitleBar } from './LeansShell';
import PlayerVsDefenseView from './PlayerVsDefenseView';
import { circlePlayer } from './PropRow';
import { useWeekGames } from './useWeekGames';

/** "2026-w7-ATL-LV" → ['ATL', 'LV']. */
const teamsOfGameId = (id: string): string[] => /^\d{4}-w\d{1,2}-([A-Z]{2,3})-([A-Z]{2,3})$/.exec(id)?.slice(1) ?? [];

export default function PlayerScreen({ playerId, gameId }: { playerId: string; gameId: string }) {
  const week = weekOfGameId(gameId);
  const { status, matchups } = useWeekGames(week);
  const matchup = matchups.find((m) => m.id === gameId) ?? null;
  const { bundle, state } = useLeansBundle(useMemo(() => teamsOfGameId(gameId), [gameId]));
  const [window, setWindow] = useState<RatingWindow>('season');

  const player = bundle?.players.find((p) => p.id === playerId) ?? null;
  const home = player && matchup ? player.team === matchup.home.abbr : false;
  const opp = matchup ? (home ? matchup.away.abbr : matchup.home.abbr) : '';

  const view = useMemo(() => {
    if (!bundle || !player || !matchup || week == null) return null;
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
  }, [bundle, player, matchup, week, opp, window]);

  const weekRange = useMemo(() => {
    if (matchups.length === 0) return null;
    const times = matchups.map((m) => m.kickoff.toISOString()).sort();
    return dateRangeText({ first: times[0], last: times[times.length - 1] });
  }, [matchups]);

  const header = <LeansTitleBar title={player?.name ?? 'Player'} sub={opp ? `vs ${opp}` : undefined} />;

  if (!player || !matchup || !view) {
    const loading = status === 'loading' || state === 'loading';
    return (
      <LeansShell header={header}>
        <div className="flex flex-col px-3" style={{ gap: 8, paddingTop: 8 }}>
          <div className="text-center" style={{ padding: '40px 16px', fontSize: 13, color: 'var(--subtext)' }}>
            {loading ? (
              'Loading…'
            ) : (
              <>
                No data for this player in this game.{' '}
                <Link href="/leans" style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>
                  Back to Leans
                </Link>
              </>
            )}
          </div>
          <LeansFooter />
        </div>
      </LeansShell>
    );
  }

  return (
    <LeansShell header={header}>
      <PlayerVsDefenseView
        player={player}
        matchup={matchup}
        window={window}
        onWindow={setWindow}
        rating={view.rating}
        of={view.of}
        why={view.why}
        cells={view.cells}
        weekRange={weekRange}
        bars={view.bars}
        propsHref={`${gameHref(gameId)}#props`}
      />
    </LeansShell>
  );
}
