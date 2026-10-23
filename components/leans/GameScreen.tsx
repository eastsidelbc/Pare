/**
 * GameScreen — /leans/[gameId] container (G2). Finds the game in its week (shared
 * schedule store), loads the Leans bundle for its two teams, computes the three line
 * leans + this game's saved props, and renders <GameView>. "Compare these teams"
 * drops today's Compare panels in place (same ComparePane, inline, no second hero).
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ComparePane from '@/components/compare/ComparePane';
import { useSharedNflStats } from '@/components/NflStatsProvider';
import { DEFAULT_DEFENSE_METRICS, DEFAULT_OFFENSE_METRICS } from '@/lib/metricsConfig';
import { useGameMarket, useLeansBundle, weekOfGameId } from '@/lib/leans/client';
import { evaluateProp, leagueFormFor, leansForGame, propWhy } from '@/lib/leans/evaluate';
import { useSavedProps } from '@/lib/leans/propStore';
import MatchupCardSkeleton from '@/components/schedule/MatchupCardSkeleton';
import AddLineSheet from './AddLineSheet';
import type { LineKind } from './GameLinesCard';
import PlayerPickerSheet from './PlayerPickerSheet';
import { propHref } from './PropRow';
import GameView from './GameView';
import LeansFooter from './LeansFooter';
import { LeansShell, LeansTitleBar } from './LeansShell';
import { useWeekGames } from './useWeekGames';

export type GameSheet = 'add' | 'pick' | null;

export default function GameScreen({
  gameId,
  initialSheet = null,
  initialPlayerId = null,
}: {
  gameId: string;
  initialSheet?: GameSheet;
  /** Preselected player for the add sheet (from the player screen's "Check a prop line"). */
  initialPlayerId?: string | null;
}) {
  const router = useRouter();
  const week = weekOfGameId(gameId);
  const { status, matchups } = useWeekGames(week);
  const matchup = matchups.find((m) => m.id === gameId) ?? null;
  const teams = useMemo(() => (matchup ? [matchup.away.abbr, matchup.home.abbr] : []), [matchup]);
  const { bundle } = useLeansBundle(teams);
  const market = useGameMarket(matchup?.espnEventId ?? null);
  const { props: saved } = useSavedProps();
  const stats = useSharedNflStats();

  const [statsOpen, setStatsOpen] = useState(false);
  const [openLine, setOpenLine] = useState<LineKind | null>(null);
  const [offMetrics, setOffMetrics] = useState<string[]>(DEFAULT_OFFENSE_METRICS);
  const [defMetrics, setDefMetrics] = useState<string[]>(DEFAULT_DEFENSE_METRICS);
  // Adding always starts by picking a player, unless one was passed in.
  const [sheet, setSheet] = useState<GameSheet>(initialSheet === 'add' && !initialPlayerId ? 'pick' : initialSheet);
  const [playerId, setPlayerId] = useState<string | null>(initialPlayerId);
  const player = bundle?.players.find((p) => p.id === playerId) ?? null;

  // Drop the ?add / ?pick query once the sheet opened, so Back / reload don't reopen it.
  useEffect(() => {
    if (initialSheet) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, [initialSheet]);

  const league = useMemo(() => (bundle && week != null ? leagueFormFor(bundle, week) : null), [bundle, week]);
  const leans = useMemo(() => (bundle && matchup && league ? leansForGame(bundle, matchup, league) : null), [bundle, matchup, league]);
  const props = useMemo(
    () =>
      saved
        .filter((p) => p.gameId === gameId)
        .map((p) => {
          const e = evaluateProp(p, bundle);
          return { e, why: propWhy(e, bundle) };
        }),
    [saved, gameId, bundle],
  );

  const title = matchup ? `${matchup.away.abbr} @ ${matchup.home.abbr}` : 'Game';
  const header = <LeansTitleBar title={title} sub={week != null ? `Week ${week}` : undefined} />;

  if (!matchup) {
    return (
      <LeansShell header={header}>
        <div className="flex flex-col px-3" style={{ gap: 8, paddingTop: 8 }}>
          {status === 'loading' ? (
            <MatchupCardSkeleton />
          ) : (
            <div className="text-center" style={{ padding: '40px 16px', fontSize: 13, color: 'var(--subtext)' }}>
              This game isn&apos;t on the schedule.{' '}
              <Link href="/leans" style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>
                Back to Leans
              </Link>
            </div>
          )}
          <LeansFooter />
        </div>
      </LeansShell>
    );
  }

  return (
    <LeansShell header={header}>
      <GameView
        market={market}
        matchup={matchup}
        leans={leans}
        league={league}
        openLine={openLine}
        onToggleLine={(k) => setOpenLine((cur) => (cur === k ? null : k))}
        statsOpen={statsOpen}
        onToggleStats={() => setStatsOpen((v) => !v)}
        compare={
          <ComparePane
            inline
            isMobile
            showHero={false}
            teamA={matchup.away.name}
            teamB={matchup.home.name}
            offenseData={stats.offenseData}
            defenseData={stats.defenseData}
            selectedOffenseMetrics={offMetrics}
            selectedDefenseMetrics={defMetrics}
            isLoading={stats.isLoading}
            isLoadingOffense={stats.isLoadingOffense}
            isLoadingDefense={stats.isLoadingDefense}
            onTeamAChange={() => {}}
            onTeamBChange={() => {}}
            onOffenseMetricsChange={setOffMetrics}
            onDefenseMetricsChange={setDefMetrics}
          />
        }
        props={props}
        onAddProp={() => setSheet('pick')}
      />
      <PlayerPickerSheet
        open={sheet === 'pick'}
        onClose={() => setSheet(null)}
        matchup={matchup}
        bundle={bundle}
        onPick={(p) => {
          setPlayerId(p.id);
          setSheet('add');
        }}
      />
      <AddLineSheet
        open={sheet === 'add'}
        onClose={() => setSheet(null)}
        matchup={matchup}
        player={player}
        onChangePlayer={() => setSheet('pick')}
        onSaved={(prop) => {
          setSheet(null);
          router.push(propHref(prop.id));
        }}
      />
    </LeansShell>
  );
}
