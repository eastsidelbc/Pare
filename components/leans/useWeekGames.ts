/**
 * A week's games for Leans. Reads the shared schedule store first (ScheduleProvider —
 * same objects Home shows, live-patched by the 5s poll); a week the store hasn't
 * loaded is fetched once from /api/schedule (lib/leans/client.ts keeps the copy).
 */

'use client';

import { useEffect, useState } from 'react';
import { useSchedule } from '@/components/schedule/ScheduleProvider';
import { fetchWeekMatchups } from '@/lib/leans/client';
import type { Matchup } from '@/lib/schedule';

export type WeekGamesStatus = 'loading' | 'ready' | 'empty';

export function useWeekGames(week: number | null): { status: WeekGamesStatus; matchups: Matchup[] } {
  const { weeks } = useSchedule();
  const entry = week != null ? weeks[week] : undefined;
  const fromStore = entry?.status === 'ready' ? entry.matchups : null;
  const [fetched, setFetched] = useState<{ week: number; matchups: Matchup[] } | null>(null);

  useEffect(() => {
    if (week == null || fromStore) return;
    let alive = true;
    fetchWeekMatchups(week)
      .then((matchups) => alive && setFetched({ week, matchups }))
      .catch(() => alive && setFetched({ week, matchups: [] }));
    return () => {
      alive = false;
    };
  }, [week, fromStore]);

  if (week == null) return { status: 'empty', matchups: [] };
  if (fromStore) return { status: 'ready', matchups: fromStore };
  if (fetched?.week === week) return { status: fetched.matchups.length > 0 ? 'ready' : 'empty', matchups: fetched.matchups };
  return { status: 'loading', matchups: [] };
}
