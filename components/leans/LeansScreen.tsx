/**
 * LeansScreen — the Leans tab (/leans; A2-bets-list, A2b-bets-list-saved).
 *
 * Container only: picks the week (WeekControl, remembered for the session), reads
 * the week's games (shared schedule store), the saved props (this device), and the
 * Leans bundle (team logs + FPA, plus the players of teams with saved props), then
 * hands plain props to <LeansListView>. Every lean is computed here, client-side.
 */

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_WEEK, MIN_WEEK } from '@/lib/schedule';
import { useSchedule } from '@/components/schedule/ScheduleProvider';
import { useLeansBundle, useLeansWeek } from '@/lib/leans/client';
import { evaluateProp, leagueFormFor, leansForGame } from '@/lib/leans/evaluate';
import { useSavedProps } from '@/lib/leans/propStore';
import GamePickSheet from './GamePickSheet';
import { gameHref } from './GameCard';
import LeansHeader from './LeansHeader';
import LeansListView, { groupByDay } from './LeansListView';
import { LeansShell } from './LeansShell';
import { useWeekGames } from './useWeekGames';

const clamp = (w: number) => Math.min(MAX_WEEK, Math.max(MIN_WEEK, w));

export default function LeansScreen() {
  const router = useRouter();
  const { currentNflWeek } = useSchedule();
  const [week, setWeek] = useLeansWeek(currentNflWeek);
  const [picking, setPicking] = useState(false);
  const { status, matchups } = useWeekGames(week);
  const { props: saved } = useSavedProps();

  const weekProps = useMemo(() => saved.filter((p) => p.week === week), [saved, week]);
  const { bundle } = useLeansBundle(useMemo(() => weekProps.map((p) => p.team), [weekProps]));

  const groups = useMemo(() => {
    const league = bundle ? leagueFormFor(bundle, week) : null;
    const items = matchups.map((m) => ({ matchup: m, leans: bundle && league ? leansForGame(bundle, m, league) : null }));
    return groupByDay(items);
  }, [bundle, matchups, week]);

  const props = useMemo(() => weekProps.map((p) => evaluateProp(p, bundle)), [weekProps, bundle]);

  return (
    <LeansShell header={<LeansHeader week={week} onStep={(d) => setWeek(clamp(week + d))} onJump={(w) => setWeek(clamp(w))} />}>
      <LeansListView week={week} status={status} groups={groups} props={props} onTrackProp={() => setPicking(true)} />
      <GamePickSheet
        open={picking}
        games={matchups}
        onClose={() => setPicking(false)}
        onPick={(id) => {
          setPicking(false);
          router.push(`${gameHref(id)}?add=1`);
        }}
      />
    </LeansShell>
  );
}
