/**
 * Leans client data — fetch + hooks for /api/leans/data and /api/schedule.
 *
 * One in-memory copy per request key for `data.cacheTtlMs` (10 min, the server's
 * window), shared by every Leans screen in the session: list → game → prop →
 * back never refetches. A failed fetch is not cached (the next mount retries).
 * Only team abbreviations go over the wire — never a prop line.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { reviveMatchups, type SerializedMatchup } from '@/lib/liveClient';
import type { Matchup } from '@/lib/schedule';
import { LEAN_CONFIG } from './config';
import type { LeansBundle } from './types';

interface Entry<T> {
  at: number;
  promise: Promise<T>;
}

function memo<T>() {
  const map = new Map<string, Entry<T>>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = map.get(key);
    if (hit && Date.now() - hit.at < LEAN_CONFIG.data.cacheTtlMs) return hit.promise;
    const promise = load().catch((err: unknown) => {
      map.delete(key);
      throw err;
    });
    map.set(key, { at: Date.now(), promise });
    return promise;
  };
}

const bundles = memo<LeansBundle>();
const weeks = memo<Matchup[]>();

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Stable request key: unique, sorted team abbreviations. */
export function teamsKey(teams: readonly string[]): string {
  return [...new Set(teams)].sort().join(',');
}

export function fetchLeansBundle(teams: readonly string[]): Promise<LeansBundle> {
  const key = teamsKey(teams);
  return bundles(key, () => json<LeansBundle>(`/api/leans/data?teams=${encodeURIComponent(key)}`));
}

export function fetchWeekMatchups(week: number): Promise<Matchup[]> {
  return weeks(String(week), async () => reviveMatchups((await json<{ matchups: SerializedMatchup[] }>(`/api/schedule?week=${week}`)).matchups));
}

export type LoadState = 'loading' | 'ready' | 'error';

/**
 * The bundle for these teams. While a new team set loads, the previous bundle stays
 * on screen (league-wide parts are identical; only the players differ).
 */
export function useLeansBundle(teams: readonly string[]): { bundle: LeansBundle | null; state: LoadState } {
  const key = teamsKey(teams);
  const [loaded, setLoaded] = useState<{ key: string; bundle: LeansBundle } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetchLeansBundle(key ? key.split(',') : [])
      .then((bundle) => alive && setLoaded({ key, bundle }))
      .catch(() => alive && setFailedKey(key));
    return () => {
      alive = false;
    };
  }, [key]);
  const state: LoadState = loaded?.key === key ? 'ready' : failedKey === key ? 'error' : 'loading';
  return { bundle: loaded?.bundle ?? null, state };
}

/** The week a Matchup id belongs to ("2026-w7-ATL-LV" → 7), or null. */
export function weekOfGameId(id: string): number | null {
  const m = /^\d{4}-w(\d{1,2})-[A-Z]{2,3}-[A-Z]{2,3}$/.exec(id);
  return m ? Number(m[1]) : null;
}

/** Remembered Leans week for this session (list ↔ game screen keeps its place). */
let rememberedWeek: number | null = null;

export function useLeansWeek(fallback: number): [number, (w: number) => void] {
  const [week, setWeek] = useState(() => rememberedWeek ?? fallback);
  const set = useMemo(
    () => (w: number) => {
      rememberedWeek = w;
      setWeek(w);
    },
    [],
  );
  return [week, set];
}
