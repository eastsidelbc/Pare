/**
 * NflStatsProvider — ONE shared copy of the offense/defense stats for the app.
 *
 * Mounted once in the root layout (persists across routes), so Home's inline
 * peeks and the Compare workspace read the same data. Before (2026-10-03) the
 * Compare page called useNflStats() itself → every visit re-downloaded both
 * APIs and flashed the loading skeleton, even though Home already had them.
 *
 * Freshness: the server rebuilds stats every 10 min (route `revalidate`). When
 * the app comes back to the foreground and our copy is older than that, we
 * refresh in the background (useNflStats keeps showing the old numbers until
 * the new ones land — no skeleton, no error swap).
 */

'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useNflStats, type UseNflStatsReturn } from '@/lib/useNflStats';

/** Match the API routes' `revalidate = 600`. */
const STALE_AFTER_MS = 10 * 60 * 1000;

const NflStatsContext = createContext<UseNflStatsReturn | null>(null);

export function NflStatsProvider({ children }: { children: ReactNode }) {
  const stats = useNflStats();
  const { refreshData } = stats;

  // Stamp the first load; refresh on foreground when stale.
  const fetchedAtRef = useRef(Date.now());
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - fetchedAtRef.current < STALE_AFTER_MS) return;
      fetchedAtRef.current = Date.now();
      void refreshData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshData]);

  return <NflStatsContext.Provider value={stats}>{children}</NflStatsContext.Provider>;
}

/** Read the shared stats. Must be used under <NflStatsProvider>. */
export function useSharedNflStats(): UseNflStatsReturn {
  const ctx = useContext(NflStatsContext);
  if (!ctx) throw new Error('useSharedNflStats must be used within <NflStatsProvider>');
  return ctx;
}
