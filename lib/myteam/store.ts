/**
 * My Team — pure state + localStorage persistence (device only, no accounts).
 *
 * Mirrors lib/favorites/store.ts: no React here; the route-scoped
 * MyTeamProvider (P3) loads post-mount behind a hydration guard.
 * One Sleeper username per device in v1. Unit-tested in
 * lib/myteam/__tests__/store.test.ts.
 */

import type { ProviderId, RatingWindow } from './types';

export const STORAGE_KEY = 'pare:myteam';
export const SCHEMA_VERSION = 1;

export interface MyTeamState {
  provider: ProviderId;
  username: string | null;
  userId: string | null;
  leagueId: string | null;
  window: RatingWindow;
  /** IR/Taxi group expanded. */
  irOpen: boolean;
}

export const DEFAULT_MY_TEAM: MyTeamState = {
  provider: 'sleeper',
  username: null,
  userId: null,
  leagueId: null,
  window: 'season',
  irOpen: false,
};

/** Sleeper usernames: letters, digits, underscore; 1–20 chars (also the API route's input rule). */
export function isValidUsername(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_]{1,20}$/.test(v);
}

/** Sleeper ids are numeric strings. */
export function isValidId(v: unknown): v is string {
  return typeof v === 'string' && /^\d{1,24}$/.test(v);
}

/** Validate an unknown (parsed) value into a state, field by field. */
export function sanitizeMyTeam(v: unknown): MyTeamState {
  const p = (v && typeof v === 'object' ? v : {}) as Partial<Record<keyof MyTeamState, unknown>>;
  const username = isValidUsername(p.username) ? p.username : null;
  return {
    provider: 'sleeper',
    username,
    // A user/league id without a username is meaningless — drop them together.
    userId: username && isValidId(p.userId) ? p.userId : null,
    leagueId: username && isValidId(p.leagueId) ? p.leagueId : null,
    window: p.window === 'last4' ? 'last4' : 'season',
    irOpen: p.irOpen === true,
  };
}

/** Read persisted state. `null` = nothing usable (SSR, empty, corrupt, other version). */
export function loadMyTeam(): MyTeamState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { version?: number } | null;
    if (!p || p.version !== SCHEMA_VERSION) return null;
    return sanitizeMyTeam(p);
  } catch {
    return null;
  }
}

/** Persist (best-effort, never throws). */
export function saveMyTeam(state: MyTeamState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, ...state }));
  } catch {
    /* quota / privacy mode — persistence is best-effort */
  }
}

/** Forget the linked account (keeps view prefs). */
export function unlinkAccount(state: MyTeamState): MyTeamState {
  return { ...state, username: null, userId: null, leagueId: null };
}
