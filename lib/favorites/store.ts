/**
 * Favorites ("Your teams") — pure state + localStorage persistence.
 *
 * The list is team ABBREVIATIONS (lib/teams), in pin order (index 0 pins
 * first on Home). Capped at MAX_FAVORITES. No React here — the provider
 * (components/FavoritesProvider) wires it up post-mount, exactly like the
 * comparisons store. Unit-tested in lib/favorites/__tests__/store.test.ts.
 */

import { getTeamByAbbr } from '@/lib/teams';

export const MAX_FAVORITES = 3;
export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'pare:favorites';

export interface FavoritesState {
  /** Team abbreviations in pin order. */
  teams: string[];
  /** Show the "Your teams" section at the top of each Home week. */
  pin: boolean;
  /** Team-color outer aura on favorite cards. */
  glow: boolean;
  /** First-launch "Who do you root for?" screen has been finished or skipped. */
  onboarded: boolean;
}

export const DEFAULT_FAVORITES: FavoritesState = { teams: [], pin: true, glow: true, onboarded: false };

export type ToggleResult = 'added' | 'removed' | 'full';

/** Add or remove a team. Adding past the cap is refused ('full'). */
export function toggleTeam(teams: string[], abbr: string): { teams: string[]; result: ToggleResult } {
  if (teams.includes(abbr)) return { teams: teams.filter((t) => t !== abbr), result: 'removed' };
  if (teams.length >= MAX_FAVORITES) return { teams, result: 'full' };
  return { teams: [...teams, abbr], result: 'added' };
}

/** Move a team one slot up (-1) or down (+1). Out-of-range moves are no-ops. */
export function moveTeam(teams: string[], abbr: string, dir: -1 | 1): string[] {
  const i = teams.indexOf(abbr);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= teams.length) return teams;
  const next = [...teams];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Keep only known, unique abbreviations, capped. */
export function sanitizeTeams(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== 'string' || !getTeamByAbbr(x) || out.includes(x)) continue;
    out.push(x);
    if (out.length >= MAX_FAVORITES) break;
  }
  return out;
}

/** Read persisted favorites. `null` = nothing usable (SSR, empty, corrupt, old). */
export function loadFavorites(): FavoritesState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<FavoritesState> & { version?: number };
    if (!p || p.version !== SCHEMA_VERSION) return null;
    return {
      teams: sanitizeTeams(p.teams),
      pin: typeof p.pin === 'boolean' ? p.pin : DEFAULT_FAVORITES.pin,
      glow: typeof p.glow === 'boolean' ? p.glow : DEFAULT_FAVORITES.glow,
      onboarded: p.onboarded === true,
    };
  } catch {
    return null;
  }
}

/** Persist (best-effort, never throws). */
export function saveFavorites(state: FavoritesState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, ...state }));
  } catch {
    /* quota / privacy mode — persistence is best-effort */
  }
}
