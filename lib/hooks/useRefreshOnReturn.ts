/**
 * useRefreshOnReturn — re-render a server page when the user comes back to it.
 *
 * Server pages (e.g. Standings) render once per visit. If the app sits open or
 * in the background while a game ends, the screen would stay on the old data
 * until the user navigates away and back. Sports apps refresh when you return
 * to them — this does the same: when the tab/app becomes visible again (or
 * Safari restores it from its back/forward cache) and our data is older than
 * `maxAgeMs`, call `router.refresh()`.
 *
 * `router.refresh()` re-runs the server component and swaps in the new data
 * WITHOUT a loading skeleton and WITHOUT resetting client state (the chosen
 * Division / Conf / Playoffs view and scroll position stay put).
 *
 * Pass the page's data as `dataKey`: when new data arrives the age clock resets.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/** Pure: should a returning user trigger a refresh? */
export function isDataStale(loadedAtMs: number, nowMs: number, maxAgeMs: number): boolean {
  return nowMs - loadedAtMs >= maxAgeMs;
}

export function useRefreshOnReturn(dataKey: unknown, maxAgeMs: number): void {
  const router = useRouter();
  const loadedAtRef = useRef(Date.now());

  // New data from the server → restart the age clock.
  useEffect(() => {
    loadedAtRef.current = Date.now();
  }, [dataKey]);

  useEffect(() => {
    const maybeRefresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (!isDataStale(loadedAtRef.current, Date.now(), maxAgeMs)) return;
      loadedAtRef.current = Date.now(); // one refresh per return, not one per event
      router.refresh();
    };
    // `pageshow` covers iOS Safari restoring the page from its back/forward cache.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) maybeRefresh();
    };
    document.addEventListener('visibilitychange', maybeRefresh);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', maybeRefresh);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [router, maxAgeMs]);
}
