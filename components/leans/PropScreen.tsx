/**
 * PropScreen — /leans/prop/[propId] container. The id names game · player · stat
 * (`propIdOf`); the line comes from the book feed for that week (/api/leans/props),
 * the Leans bundle (the player's team) supplies his games + the opponent's tier.
 * Under the card, two tap-to-open rows keep you on the page (Kobe 2026-10-23): "<Player> vs <OPP>"
 * (the player screen's matchup view, embedded) and "<AWAY> vs <HOME> · team compare" (the game
 * screen's inline Compare pane).
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import ComparePane from '@/components/compare/ComparePane';
import { useSharedNflStats } from '@/components/NflStatsProvider';
import { dateRangeText } from '@/components/myteam/style';
import type { RatingWindow } from '@/lib/myteam/types';
import { DEFAULT_DEFENSE_METRICS, DEFAULT_OFFENSE_METRICS } from '@/lib/metricsConfig';
import { buildGameProps, evaluateAutoProp } from '@/lib/leans/autoProps';
import { useLeansBundle, useWeekPropLines, weekOfGameId } from '@/lib/leans/client';
import { propWhy } from '@/lib/leans/evaluate';
import { PROP_STAT_LABEL } from '@/lib/leans/format';
import { propMatchupData } from '@/lib/leans/matchupData';
import { parsePropId } from '@/lib/leans/propLines';
import LeansFooter from './LeansFooter';
import { LeansShell, LeansTitleBar } from './LeansShell';
import ExpandRow from './ExpandRow';
import { gameHref } from './GameCard';
import PlayerVsDefenseView from './PlayerVsDefenseView';
import PropDetailView from './PropDetailView';
import { usePlayerVsDefense } from './usePlayerVsDefense';
import { useWeekGames } from './useWeekGames';

export default function PropScreen({ propId }: { propId: string }) {
  const ref = useMemo(() => parsePropId(propId), [propId]);
  const week = ref ? weekOfGameId(ref.gameId) : null;
  const { matchups, status } = useWeekGames(week);
  const matchup = matchups.find((m) => m.id === ref?.gameId) ?? null;
  const { lines, state: linesState } = useWeekPropLines(week);
  const { bundle, state } = useLeansBundle(useMemo(() => (matchup ? [matchup.away.abbr, matchup.home.abbr] : []), [matchup]));

  const prop = useMemo(
    () => (ref && matchup ? buildGameProps(matchup, lines?.[matchup.id], bundle).find((p) => p.playerId === ref.playerId && p.stat === ref.stat) ?? null : null),
    [ref, matchup, lines, bundle],
  );
  const e = useMemo(() => (prop ? evaluateAutoProp(prop, bundle) : null), [prop, bundle]);
  const why = useMemo(() => (e ? propWhy(e, bundle) : []), [e, bundle]);
  const data = useMemo(() => (e ? propMatchupData(e, bundle, matchup?.odds ?? null) : null), [e, bundle, matchup]);

  const [playerOpen, setPlayerOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [window, setWindow] = useState<RatingWindow>('season');
  const [offMetrics, setOffMetrics] = useState<string[]>(DEFAULT_OFFENSE_METRICS);
  const [defMetrics, setDefMetrics] = useState<string[]>(DEFAULT_DEFENSE_METRICS);
  const stats = useSharedNflStats();
  const player = e?.player ?? null;
  const pvd = usePlayerVsDefense(bundle, player, matchup, week, window);
  const weekRange = useMemo(() => {
    if (matchups.length === 0) return null;
    const times = matchups.map((m) => m.kickoff.toISOString()).sort();
    return dateRangeText({ first: times[0], last: times[times.length - 1] });
  }, [matchups]);

  const first = prop?.playerName.split(/\s+/)[0] ?? 'Prop';
  const header = <LeansTitleBar title={prop ? `${first} · ${PROP_STAT_LABEL[prop.stat]}` : 'Prop'} sub={week != null ? `Week ${week}` : undefined} />;
  const loading = !!ref && (status === 'loading' || linesState === 'loading' || state === 'loading');

  if (!prop || !e) {
    return (
      <LeansShell header={header}>
        <div className="flex flex-col px-3" style={{ gap: 8, paddingTop: 8 }}>
          <div className="text-center" style={{ padding: '40px 16px', fontSize: 13, color: 'var(--subtext)' }}>
            {loading ? (
              'Loading…'
            ) : (
              <>
                This prop line isn&apos;t posted any more.{' '}
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
      <PropDetailView
        e={e}
        why={why}
        loading={state === 'loading'}
        data={data}
        below={
          matchup && (
            <>
              {player && pvd && (
                <ExpandRow id="player-vs-defense" title={`${player.name} vs ${prop.opp}`} note="player vs defense" open={playerOpen} onToggle={() => setPlayerOpen((v) => !v)}>
                  <PlayerVsDefenseView
                    embedded
                    player={player}
                    matchup={matchup}
                    window={window}
                    onWindow={setWindow}
                    rating={pvd.rating}
                    of={pvd.of}
                    why={pvd.why}
                    cells={pvd.cells}
                    weekRange={weekRange}
                    bars={pvd.bars}
                    propsHref={`${gameHref(matchup.id)}#props`}
                    tables={bundle?.tables ?? null}
                  />
                </ExpandRow>
              )}
              <ExpandRow id="team-compare" title={`${matchup.away.abbr} vs ${matchup.home.abbr}`} note="team compare" open={compareOpen} onToggle={() => setCompareOpen((v) => !v)}>
                <div data-team-stats style={{ margin: '0 -12px' }}>
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
                </div>
              </ExpandRow>
            </>
          )
        }
      />
    </LeansShell>
  );
}
