/**
 * LeansScreen — the Leans tab (/leans; A2-bets-list).
 *
 * Container only: picks the week (WeekControl, remembered for the session), reads
 * the week's games (shared schedule store), the book's prop lines for the week
 * (/api/leans/props), and the Leans bundle (team logs + FPA, plus the players of the
 * teams with lines), then hands plain props to <LeansListView>. Every lean is
 * computed here, client-side; the list shows the props that lean.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { MAX_WEEK, MIN_WEEK } from '@/lib/schedule';
import { useSchedule } from '@/components/schedule/ScheduleProvider';
import { buildGameProps, evaluateAutoProp, isLean, sortProps } from '@/lib/leans/autoProps';
import { useLeansBundle, useLeansWeek, useWeekPropLines } from '@/lib/leans/client';
import { leagueFormFor, leansForGame } from '@/lib/leans/evaluate';
import LeansHeader from './LeansHeader';
import LeansListView, { groupByDay } from './LeansListView';
import { LeansShell } from './LeansShell';
import { useWeekGames } from './useWeekGames';

const clamp = (w: number) => Math.min(MAX_WEEK, Math.max(MIN_WEEK, w));

/** Typed prop lines lived here until 2026-10-23 (retired: lines come from the book feed). */
const RETIRED_PROPS_KEY = 'pare:leans-props:v1';

export default function LeansScreen() {
  const { currentNflWeek } = useSchedule();
  const [week, setWeek] = useLeansWeek(currentNflWeek);
  const { status, matchups } = useWeekGames(week);
  const { lines, state: linesState } = useWeekPropLines(week);

  // Clean up the retired device-only store once (privacy: nothing left behind).
  useEffect(() => {
    try {
      window.localStorage.removeItem(RETIRED_PROPS_KEY);
    } catch {
      // storage blocked — nothing stored either
    }
  }, []);

  const teams = useMemo(
    () => matchups.filter((m) => lines?.[m.id]?.length).flatMap((m) => [m.away.abbr, m.home.abbr]),
    [matchups, lines],
  );
  const { bundle } = useLeansBundle(teams);

  const groups = useMemo(() => {
    const league = bundle ? leagueFormFor(bundle, week) : null;
    const items = matchups.map((m) => ({ matchup: m, leans: bundle && league ? leansForGame(bundle, m, league) : null }));
    return groupByDay(items);
  }, [bundle, matchups, week]);

  const leaning = useMemo(
    () => sortProps(matchups.flatMap((m) => buildGameProps(m, lines?.[m.id], bundle).map((p) => evaluateAutoProp(p, bundle))).filter(isLean)),
    [matchups, lines, bundle],
  );
  const propsState = linesState === 'error' ? 'error' : lines && bundle ? 'ready' : 'loading';

  return (
    <LeansShell header={<LeansHeader week={week} onStep={(d) => setWeek(clamp(week + d))} onJump={(w) => setWeek(clamp(w))} />}>
      <LeansListView week={week} status={status} groups={groups} props={leaning} propsState={propsState} />
    </LeansShell>
  );
}
