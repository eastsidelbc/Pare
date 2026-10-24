/**
 * PlayerScreen — /leans/player/[playerId]?game=<Matchup id> container (B1). The game
 * gives the week, the opponent and the two teams to load; the Season / Last 4 toggle
 * re-ranks client-side (same tables as the prop card, cut to games before the week).
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { dateRangeText } from '@/components/myteam/style';
import type { RatingWindow } from '@/lib/myteam/types';
import { useLeansBundle, weekOfGameId } from '@/lib/leans/client';
import { gameHref } from './GameCard';
import LeansFooter from './LeansFooter';
import { LeansShell, LeansTitleBar } from './LeansShell';
import PlayerVsDefenseView from './PlayerVsDefenseView';
import { usePlayerVsDefense } from './usePlayerVsDefense';
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

  const view = usePlayerVsDefense(bundle, player, matchup, week, window);

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
        tables={bundle?.tables ?? null}
      />
    </LeansShell>
  );
}
