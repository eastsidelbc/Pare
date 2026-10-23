/**
 * GameScreen — /leans/[gameId] container (G2). Finds the game in its week (shared
 * schedule store), loads the Leans bundle for its two teams + the book's prop lines,
 * computes the three line leans + every prop's lean, and renders <GameView>. "Compare these teams"
 * drops today's Compare panels in place (same ComparePane, inline, no second hero).
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import ComparePane from '@/components/compare/ComparePane';
import { useSharedNflStats } from '@/components/NflStatsProvider';
import { DEFAULT_DEFENSE_METRICS, DEFAULT_OFFENSE_METRICS } from '@/lib/metricsConfig';
import { buildGameProps, evaluateAutoProp, sortProps } from '@/lib/leans/autoProps';
import { useGameMarket, useLeansBundle, useWeekPropLines, weekOfGameId } from '@/lib/leans/client';
import { leagueFormFor, leansForGame, propWhy } from '@/lib/leans/evaluate';
import MatchupCardSkeleton from '@/components/schedule/MatchupCardSkeleton';
import type { LineKind } from './GameLinesCard';
import GameView from './GameView';
import LeansFooter from './LeansFooter';
import { LeansShell, LeansTitleBar } from './LeansShell';
import { useWeekGames } from './useWeekGames';

export default function GameScreen({ gameId }: { gameId: string }) {
  const week = weekOfGameId(gameId);
  const { status, matchups } = useWeekGames(week);
  const matchup = matchups.find((m) => m.id === gameId) ?? null;
  const teams = useMemo(() => (matchup ? [matchup.away.abbr, matchup.home.abbr] : []), [matchup]);
  const { bundle } = useLeansBundle(teams);
  const market = useGameMarket(matchup?.espnEventId ?? null);
  const { lines, state: linesState } = useWeekPropLines(week);
  const stats = useSharedNflStats();

  const [statsOpen, setStatsOpen] = useState(false);
  const [openLine, setOpenLine] = useState<LineKind | null>(null);
  const [offMetrics, setOffMetrics] = useState<string[]>(DEFAULT_OFFENSE_METRICS);
  const [defMetrics, setDefMetrics] = useState<string[]>(DEFAULT_DEFENSE_METRICS);

  const league = useMemo(() => (bundle && week != null ? leagueFormFor(bundle, week) : null), [bundle, week]);
  const leans = useMemo(() => (bundle && matchup && league ? leansForGame(bundle, matchup, league) : null), [bundle, matchup, league]);
  const props = useMemo(
    () =>
      matchup && bundle
        ? sortProps(buildGameProps(matchup, lines?.[matchup.id], bundle).map((p) => evaluateAutoProp(p, bundle))).map((e) => ({ e, why: propWhy(e, bundle) }))
        : [],
    [matchup, lines, bundle],
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
        propsState={linesState === 'error' ? 'error' : lines && bundle ? 'ready' : 'loading'}
      />
    </LeansShell>
  );
}
