/**
 * Last4StatsProvider — ONE shared copy of the Compare "L4" rows (each team's
 * last 4 games, summed; `g` = games in the window).
 *
 * Separate from NflStatsProvider so the season-stats hook stays untouched.
 * Prefetched when the browser is idle after first paint, so tapping L4 in any
 * panel is instant without slowing the first load. Same freshness rule as the
 * season stats: the route rebuilds every 10 min; on return to the foreground
 * an older copy is refreshed in the background (old rows stay until then).
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { APP_CONSTANTS } from '@/config/constants';
import type { TeamData } from '@/lib/useNflStats';
import type { TeamStats } from '@/lib/types';

/** Match the API route's `revalidate = 600`. */
const STALE_AFTER_MS = 10 * 60 * 1000;

interface Last4ApiResponse {
  offense: TeamStats[];
  defense: TeamStats[];
}

export interface Last4Stats {
  offense: TeamData[];
  defense: TeamData[];
  loading: boolean;
  error: string | null;
}

const EMPTY: TeamData[] = [];
const Last4StatsContext = createContext<Last4Stats | null>(null);

export function Last4StatsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Last4ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedAtRef = useRef(0);

  const load = useCallback(async () => {
    fetchedAtRef.current = Date.now();
    try {
      const res = await fetch(APP_CONSTANTS.API.ENDPOINTS.LAST4);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Last4ApiResponse;
      setData({ offense: json.offense ?? [], defense: json.defense ?? [] });
      setError(null);
    } catch (e) {
      // Keep the last good rows on a failed refresh; panels show "—" only if we never had any.
      setError(e instanceof Error ? e.message : 'Failed to fetch last-4 data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Idle prefetch (Safari has no requestIdleCallback → short timeout).
  useEffect(() => {
    const run = () => void load();
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - fetchedAtRef.current < STALE_AFTER_MS) return;
      void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const value = useMemo<Last4Stats>(
    () => ({ offense: data?.offense ?? EMPTY, defense: data?.defense ?? EMPTY, loading, error }),
    [data, loading, error],
  );

  return <Last4StatsContext.Provider value={value}>{children}</Last4StatsContext.Provider>;
}

/** Read the shared L4 rows. Must be used under <Last4StatsProvider>. */
export function useSharedLast4Stats(): Last4Stats {
  const ctx = useContext(Last4StatsContext);
  if (!ctx) throw new Error('useSharedLast4Stats must be used within <Last4StatsProvider>');
  return ctx;
}
