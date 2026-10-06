/**
 * FavoritesProvider — "Your teams" (up to 3 favorite teams) + their display
 * settings, persisted to localStorage (`pare:favorites`).
 *
 * Mounted once in the root layout, so every screen shares one copy:
 *   • Home pins favorite games to the top of each week + outer team aura (A2)
 *   • the Home header star opens the picker sheet (openSheet)
 *   • the Compare team picker + Standings rows can star a team directly
 *   • /teams manages order, removal and the pin / glow switches
 *   • a one-time first-launch screen asks "Who do you root for?"
 *
 * Same hydration pattern as ComparisonsProvider: first render uses the default
 * (server == client, no mismatch), then a post-mount effect restores storage.
 * Pure list logic lives in lib/favorites/store.ts (unit-tested).
 *
 * UI overlays (sheet, quick menu, onboarding, toast) render from
 * <FavoritesOverlays>, which reads the open/closed flags kept here.
 */

'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_FAVORITES,
  MAX_FAVORITES,
  loadFavorites,
  moveTeam,
  saveFavorites,
  toggleTeam,
  type FavoritesState,
  type ToggleResult,
} from '@/lib/favorites/store';
import { getTeamByAbbr } from '@/lib/teams';

export interface FavoritesContextValue {
  /** Favorite team abbreviations, in pin order. */
  teams: string[];
  pin: boolean;
  glow: boolean;
  onboarded: boolean;
  /** True once localStorage has been read (client, post-mount). */
  hydrated: boolean;
  isFavorite: (abbr: string) => boolean;
  /** Add/remove; returns what happened ('full' = cap reached, nothing changed). Shows a toast. */
  toggleFavorite: (abbr: string) => ToggleResult;
  moveFavorite: (abbr: string, dir: -1 | 1) => void;
  setPin: (v: boolean) => void;
  setGlow: (v: boolean) => void;
  finishOnboarding: () => void;
  /** Home-header picker sheet. */
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  /** Standings quick menu for one team (abbr), or null. */
  quickTeam: string | null;
  openQuickMenu: (abbr: string) => void;
  closeQuickMenu: () => void;
  /** Short confirmation toast text, or null. */
  notice: string | null;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const NOTICE_MS = 2200;

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FavoritesState>(DEFAULT_FAVORITES);
  const [hydrated, setHydrated] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quickTeam, setQuickTeam] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Restore once, post-mount.
  useEffect(() => {
    const restored = loadFavorites();
    if (restored) setState(restored);
    setHydrated(true);
  }, []);

  // Persist after hydration (so the default can't clobber saved data).
  useEffect(() => {
    if (hydrated) saveFavorites(state);
  }, [hydrated, state]);

  // Latest list for synchronous answers from toggleFavorite.
  const teamsRef = useRef(state.teams);
  teamsRef.current = state.teams;

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const toggleFavorite = useCallback(
    (abbr: string): ToggleResult => {
      const { teams, result } = toggleTeam(teamsRef.current, abbr);
      const nick = getTeamByAbbr(abbr)?.nickname ?? abbr;
      if (result === 'full') {
        notify(`Max ${MAX_FAVORITES} teams — remove one first`);
        return result;
      }
      teamsRef.current = teams;
      setState((s) => ({ ...s, teams }));
      notify(result === 'added' ? `★ ${nick} added to Your teams` : `${nick} removed from Your teams`);
      return result;
    },
    [notify],
  );

  const moveFavorite = useCallback((abbr: string, dir: -1 | 1) => {
    setState((s) => ({ ...s, teams: moveTeam(s.teams, abbr, dir) }));
  }, []);

  const setPin = useCallback((pin: boolean) => setState((s) => ({ ...s, pin })), []);
  const setGlow = useCallback((glow: boolean) => setState((s) => ({ ...s, glow })), []);
  const finishOnboarding = useCallback(() => setState((s) => ({ ...s, onboarded: true })), []);

  const isFavorite = useCallback((abbr: string) => state.teams.includes(abbr), [state.teams]);

  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const openQuickMenu = useCallback((abbr: string) => setQuickTeam(abbr), []);
  const closeQuickMenu = useCallback(() => setQuickTeam(null), []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      teams: state.teams,
      pin: state.pin,
      glow: state.glow,
      onboarded: state.onboarded,
      hydrated,
      isFavorite,
      toggleFavorite,
      moveFavorite,
      setPin,
      setGlow,
      finishOnboarding,
      sheetOpen,
      openSheet,
      closeSheet,
      quickTeam,
      openQuickMenu,
      closeQuickMenu,
      notice,
    }),
    [state, hydrated, isFavorite, toggleFavorite, moveFavorite, setPin, setGlow, finishOnboarding, sheetOpen, openSheet, closeSheet, quickTeam, openQuickMenu, closeQuickMenu, notice],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a <FavoritesProvider>');
  return ctx;
}
