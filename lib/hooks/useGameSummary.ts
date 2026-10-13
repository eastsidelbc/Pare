/**
 * useGameSummary — post-game box score for a finished matchup, from our own
 * `/api/live/summary?event=ID` (the browser never calls ESPN). The server
 * fetches ESPN's summary, parses it (`lib/gameSummary.ts`) and shares one copy
 * (6h for a final game — lib/espnLive.ts). Fetched lazily on first open and
 * cached here by event id.
 */

'use client';

import { useEffect, useState } from 'react';
import type { GameSummary } from '@/lib/gameSummary';

export type { PlayerLine, TeamBox, GameSummary } from '@/lib/gameSummary';

const FETCH_TIMEOUT_MS = 8_000;

const cache = new Map<string, GameSummary>();

interface UseGameSummaryResult {
  data: GameSummary | null;
  loading: boolean;
  error: boolean;
}

export function useGameSummary(eventId: string | null): UseGameSummaryResult {
  const [data, setData] = useState<GameSummary | null>(() =>
    eventId ? cache.get(eventId) ?? null : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    const cached = cache.get(eventId);
    if (cached) {
      setData(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    setLoading(true);
    setError(false);

    fetch(`/api/live/summary?event=${eventId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((parsed: GameSummary) => {
        if (cancelled) return;
        cache.set(eventId, parsed);
        setData(parsed);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eventId]);

  return { data, loading, error };
}
