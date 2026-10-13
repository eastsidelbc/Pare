/**
 * useGameSummary — post-game box score for a finished matchup, from ESPN's
 * public `summary` endpoint (CORS-open, browser-side, free). Parsing lives in
 * `lib/gameSummary.ts`. Fetched lazily on first open and cached by event id.
 */

'use client';

import { useEffect, useState } from 'react';
import { parseSummary, type EspnSummary, type GameSummary } from '@/lib/gameSummary';

export type { PlayerLine, TeamBox, GameSummary } from '@/lib/gameSummary';

const SUMMARY_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';
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

    fetch(`${SUMMARY_URL}?event=${eventId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: EspnSummary) => {
        if (cancelled) return;
        const parsed = parseSummary(json);
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
