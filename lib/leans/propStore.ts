/**
 * Saved prop lines — on this device only (Leans DECISIONS §7: "Pare never sees
 * your sportsbook"). Nothing here talks to the network.
 *
 * `localStorage` key `pare:leans-props:v1` holds `{ v: 1, props: SavedProp[] }`.
 * Every read and write is wrapped in try/catch: private mode, a full quota, a
 * blocked storage accessor or corrupt JSON all degrade to "no saved props" (or a
 * failed save that returns false) — never a crash. Unknown / malformed entries are
 * dropped on read, so a future v2 can't break v1 screens.
 *
 * Pure functions take the Storage to use (tests pass a fake); the React hook
 * `useSavedProps` keeps every mounted screen in sync (same tab + other tabs).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PropPosition, PropSide, PropStat, SavedProp } from './types';

export const PROPS_STORAGE_KEY = 'pare:leans-props:v1';
const VERSION = 1;
const CHANGE_EVENT = 'pare:leans-props-change';

const STATS: readonly PropStat[] = ['rush_yd', 'rec_yd', 'rec', 'rush_rec_yd', 'anytime_td'];
const SIDES: readonly PropSide[] = ['over', 'under'];
const POSITIONS: readonly PropPosition[] = ['QB', 'RB', 'WR', 'TE'];

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** The browser's localStorage, or null when even touching it throws (Safari private mode, blocked). */
function browserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isSavedProp(v: unknown): v is SavedProp {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return (
    isStr(p.id) && isStr(p.gameId) && isNum(p.week) && isStr(p.playerId) && isStr(p.playerName) &&
    POSITIONS.includes(p.position as PropPosition) && isStr(p.team) && isStr(p.opp) && typeof p.home === 'boolean' &&
    STATS.includes(p.stat as PropStat) && SIDES.includes(p.side as PropSide) && isNum(p.line) && isStr(p.createdAt)
  );
}

/** Every valid saved prop (oldest first); [] on any storage or parse problem. */
export function readProps(storage: StorageLike | null = browserStorage()): SavedProp[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(PROPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || (parsed as { v?: unknown }).v !== VERSION) return [];
    const list = (parsed as { props?: unknown }).props;
    return Array.isArray(list) ? list.filter(isSavedProp) : [];
  } catch {
    return [];
  }
}

/** Replace the whole list. false = storage unavailable / full (the UI says so). */
export function writeProps(props: readonly SavedProp[], storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROPS_STORAGE_KEY, JSON.stringify({ v: VERSION, props }));
  } catch {
    return false;
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
  return true;
}

/** Insert or update by id (an edit keeps the id). */
export function saveProp(prop: SavedProp, storage: StorageLike | null = browserStorage()): boolean {
  const list = readProps(storage);
  const i = list.findIndex((p) => p.id === prop.id);
  const next = i >= 0 ? list.map((p) => (p.id === prop.id ? prop : p)) : [...list, prop];
  return writeProps(next, storage);
}

export function removeProp(id: string, storage: StorageLike | null = browserStorage()): boolean {
  return writeProps(readProps(storage).filter((p) => p.id !== id), storage);
}

/** Random id (not security-sensitive — it only names a row on this device). */
export function newPropId(): string {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null;
  return uuid ?? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/** Saved props, live: re-reads on save/remove here and on storage changes from other tabs. */
export function useSavedProps(): { props: SavedProp[]; hydrated: boolean } {
  const [props, setProps] = useState<SavedProp[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const refresh = useCallback(() => setProps(readProps()), []);
  useEffect(() => {
    refresh();
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === PROPS_STORAGE_KEY) refresh();
    };
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);
  return { props, hydrated };
}
