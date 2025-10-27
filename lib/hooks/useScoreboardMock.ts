'use client';

import { logDebug } from '@/lib/logger';
import React from 'react';
import type { ScoreboardGame } from '@/types/matchup';

export function useScoreboardMock(pollMs: number = 5000) {
  const [games, setGames] = React.useState<ScoreboardGame[] | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const startedAtRef = React.useRef<number>(Date.now());

  const fetchOnce = React.useCallback(async () => {
    const url = '/api/mock/scoreboard';
    const label = `[PollFetch] ${url}`;
    console.time(label);
    const t0 = performance.now();
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ScoreboardGame[] = await res.json();
      setGames(data);
      setError(null);
      setIsLoading(false);
      const durationMs = performance.now() - t0;
      logDebug('Polling/fetch', { url, count: data.length, durationMs: Math.round(durationMs) });
    } catch (e) {
      logDebug('Polling/fetchError', { url, error: String(e) });
      setError(e);
      // keep isLoading true until first success
    } finally {
      console.timeEnd(label);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetchOnce();
    const id = setInterval(() => {
      if (!cancelled) {
        logDebug('Polling/tick', { pollMs });
        fetchOnce();
      }
    }, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchOnce, pollMs]);

  const showSkeleton = isLoading && Date.now() - startedAtRef.current > 300;

  return { games, isLoading, error, showSkeleton } as const;
}


