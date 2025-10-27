'use client';

import React from 'react';
import type { ScoreboardGame } from '@/types/matchup';

export function useScoreboardMock(pollMs: number = 5000) {
  const [games, setGames] = React.useState<ScoreboardGame[] | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const startedAtRef = React.useRef<number>(Date.now());

  const fetchOnce = React.useCallback(async () => {
    try {
      const res = await fetch('/api/mock/scoreboard', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ScoreboardGame[] = await res.json();
      setGames(data);
      setError(null);
      setIsLoading(false);
    } catch (e) {
      console.warn('scoreboard fetch failed', e);
      setError(e);
      // keep isLoading true until first success
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetchOnce();
    const id = setInterval(() => {
      if (!cancelled) fetchOnce();
    }, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchOnce, pollMs]);

  const showSkeleton = isLoading && Date.now() - startedAtRef.current > 300;

  return { games, isLoading, error, showSkeleton } as const;
}


