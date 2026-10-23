/**
 * Leans client data — fetch + hooks for /api/leans/data, /api/leans/market and /api/schedule.
 *
 * One in-memory copy per request key for `data.cacheTtlMs` (10 min, the server's
 * window), shared by every Leans screen in the session: list → game → prop →
 * back never refetches. A failed fetch is not cached (the next mount retries).
 * Only team abbreviations, event ids and week numbers go over the wire — no user data.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { reviveMatchups, type SerializedMatchup } from '@/lib/liveClient';
import type { Matchup } from '@/lib/schedule';
import { LEAN_CONFIG } from './config';
import type { GameMarket } from './market';
import type { GamePropLine } from './propLines';
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
const markets = memo<GameMarket | null>();
const propWeeks = memo<Record<string, GamePropLine[]>>();

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

export function fetchGameMarket(eventId: string): Promise<GameMarket | null> {
  return markets(eventId, () => json<GameMarket | null>(`/api/leans/market?event=${encodeURIComponent(eventId)}`));
}

/** Market facts for one game (lib/leans/market.ts); null while loading, on failure, or with no ESPN event. */
export function useGameMarket(eventId: string | null): GameMarket | null {
  const [loaded, setLoaded] = useState<{ id: string; market: GameMarket | null } | null>(null);
  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    fetchGameMarket(eventId)
      .then((market) => alive && setLoaded({ id: eventId, market }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [eventId]);
  return loaded && loaded.id === eventId ? loaded.market : null;
}

export function fetchWeekPropLines(week: number): Promise<Record<string, GamePropLine[]>> {
  return propWeeks(String(week), async () => (await json<{ games: Record<string, GamePropLine[]> }>(`/api/leans/props?week=${week}`)).games);
}

/** The book's prop lines for every game of a week, keyed by Matchup id. */
export function useWeekPropLines(week: number | null): { lines: Record<string, GamePropLine[]> | null; state: LoadState } {
  const [loaded, setLoaded] = useState<{ week: number; lines: Record<string, GamePropLine[]> } | null>(null);
  const [failed, setFailed] = useState<number | null>(null);
  useEffect(() => {
    if (week == null) return;
    let alive = true;
    fetchWeekPropLines(week)
      .then((lines) => alive && setLoaded({ week, lines }))
      .catch(() => alive && setFailed(week));
    return () => {
      alive = false;
    };
  }, [week]);
  const lines = loaded && loaded.week === week ? loaded.lines : null;
  return { lines, state: lines ? 'ready' : failed === week ? 'error' : 'loading' };
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
