/**
 * MyTeamProvider — route-scoped state for /myteam (mounted in
 * app/myteam/layout.tsx, so other tabs pay nothing).
 *
 * Prefs (username, user id, league, window) persist to
 * localStorage `pare:myteam` (lib/myteam/store.ts) after a hydration guard,
 * like FavoritesProvider. Data comes from our own API (/api/myteam/*), never
 * from Sleeper directly. Coming back to the tab after 10+ min quietly
 * re-fetches the league bundle (isDataStale, same rule as useRefreshOnReturn).
 * Switching leagues keeps the current roster on screen (dimmed, "Loading
 * {league}…") until the new one arrives (design-system §9.4).
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isDataStale } from '@/lib/hooks/useRefreshOnReturn';
import type { LeagueBundle, UserLookupResponse } from '@/lib/myteam/apiTypes';
import { DEFAULT_MY_TEAM, isValidUsername, loadMyTeam, saveMyTeam, unlinkAccount, type MyTeamState } from '@/lib/myteam/store';
import type { FantasyLeague, RatingWindow } from '@/lib/myteam/types';

/** Re-fetch on return once the bundle on screen is this old. */
const REFRESH_ON_RETURN_AFTER_MS = 10 * 60_000;

export type MyTeamPhase = 'boot' | 'entry' | 'lookup' | 'notfound' | 'noleagues' | 'pickleague' | 'loading' | 'ready' | 'error';

interface MyTeamContextValue {
  phase: MyTeamPhase;
  prefs: MyTeamState;
  leagues: FantasyLeague[];
  season: number | null;
  bundle: LeagueBundle | null;
  /** League id being switched to while the old roster stays on screen. */
  switching: string | null;
  /** Username the last lookup was for (notfound / noleagues copy). */
  lookedUp: string | null;
  error: string | null;
  submitUsername: (username: string) => void;
  selectLeague: (leagueId: string) => void;
  unlink: () => void;
  setWindow: (w: RatingWindow) => void;
  retry: () => void;
}

const MyTeamContext = createContext<MyTeamContextValue | null>(null);

async function getJson<T>(url: string): Promise<{ status: number; body: T | null }> {
  const res = await fetch(url, { cache: 'no-store' });
  const body = res.ok ? ((await res.json()) as T) : null;
  return { status: res.status, body };
}

/** Saved league if it's still in the list, else the only league; null = ask (pick-a-league state). */
function pickLeague(leagues: FantasyLeague[], saved: string | null): string | null {
  return leagues.find((l) => l.leagueId === saved)?.leagueId ?? (leagues.length === 1 ? leagues[0].leagueId : null);
}

export function MyTeamProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<MyTeamState>(DEFAULT_MY_TEAM);
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<MyTeamPhase>('boot');
  const [leagues, setLeagues] = useState<FantasyLeague[]>([]);
  const [season, setSeason] = useState<number | null>(null);
  const [bundle, setBundle] = useState<LeagueBundle | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [lookedUp, setLookedUp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedAt = useRef(0);
  // Drops responses from superseded requests (fast league switches, unlink mid-load).
  const requestId = useRef(0);

  /** mode: 'load' = loading state · 'switch' = keep the roster on screen · 'refresh' = silent, keeps it on failure too. */
  const loadBundle = useCallback(async (leagueId: string, userId: string, mode: 'load' | 'switch' | 'refresh' = 'load') => {
    const id = ++requestId.current;
    if (mode === 'load') setPhase('loading');
    if (mode === 'switch') setSwitching(leagueId);
    try {
      const { status, body } = await getJson<LeagueBundle>(
        `/api/myteam/league?id=${encodeURIComponent(leagueId)}&uid=${encodeURIComponent(userId)}`,
      );
      if (id !== requestId.current) return;
      if (status === 404) throw new Error("You don't have a roster in this league.");
      if (!body) throw new Error("Couldn't load your league from Sleeper.");
      setBundle(body);
      loadedAt.current = Date.now();
      setSwitching(null);
      setPhase('ready');
    } catch (err) {
      if (id !== requestId.current || mode === 'refresh') return; // a failed silent refresh keeps what's on screen
      setSwitching(null);
      setError(err instanceof Error ? err.message : "Couldn't load your league.");
      setPhase('error');
    }
  }, []);

  const lookup = useCallback(
    async (username: string, savedLeagueId: string | null) => {
      const id = ++requestId.current;
      setPhase('lookup');
      setLookedUp(username);
      try {
        const { status, body } = await getJson<UserLookupResponse>(`/api/myteam/user?u=${encodeURIComponent(username)}`);
        if (id !== requestId.current) return;
        if (status === 404 || status === 400) {
          setPhase('notfound');
          return;
        }
        if (!body) throw new Error("Couldn't reach Sleeper.");
        setLeagues(body.leagues);
        setSeason(body.season);
        const leagueId = pickLeague(body.leagues, savedLeagueId);
        setPrefs((p) => ({ ...p, username: body.user.username || username, userId: body.user.userId, leagueId }));
        if (!leagueId) {
          setPhase(body.leagues.length === 0 ? 'noleagues' : 'pickleague');
          return;
        }
        await loadBundle(leagueId, body.user.userId);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Couldn't reach Sleeper.");
        setPhase('error');
      }
    },
    [loadBundle],
  );

  // Hydrate from localStorage after mount (server + first client render use defaults).
  useEffect(() => {
    const saved = loadMyTeam();
    if (saved) setPrefs(saved);
    setHydrated(true);
    if (saved?.username) void lookup(saved.username, saved.leagueId);
    else setPhase('entry');
  }, [lookup]);

  useEffect(() => {
    if (hydrated) saveMyTeam(prefs);
  }, [hydrated, prefs]);

  // Refresh on return (tab/app back in front) once the bundle is 10+ min old.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || phase !== 'ready') return;
      if (prefs.leagueId && prefs.userId && isDataStale(loadedAt.current, Date.now(), REFRESH_ON_RETURN_AFTER_MS)) {
        void loadBundle(prefs.leagueId, prefs.userId, 'refresh');
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [phase, prefs.leagueId, prefs.userId, loadBundle]);

  const submitUsername = useCallback(
    (username: string) => {
      if (!isValidUsername(username)) {
        setLookedUp(username);
        setPhase('notfound');
        return;
      }
      void lookup(username, null);
    },
    [lookup],
  );

  const selectLeague = useCallback(
    (leagueId: string) => {
      setPrefs((p) => ({ ...p, leagueId }));
      // From the roster → switch in place; from pick-a-league → normal load.
      if (prefs.userId) void loadBundle(leagueId, prefs.userId, phase === 'ready' && bundle ? 'switch' : 'load');
    },
    [prefs.userId, loadBundle, phase, bundle],
  );

  const unlink = useCallback(() => {
    requestId.current++;
    setPrefs((p) => unlinkAccount(p));
    setLeagues([]);
    setBundle(null);
    setSwitching(null);
    setLookedUp(null);
    setError(null);
    setPhase('entry');
  }, []);

  const retry = useCallback(() => {
    setError(null);
    if (prefs.username) void lookup(prefs.username, prefs.leagueId);
    else setPhase('entry');
  }, [prefs.username, prefs.leagueId, lookup]);

  const setWindow = useCallback((window: RatingWindow) => setPrefs((p) => ({ ...p, window })), []);

  const value = useMemo<MyTeamContextValue>(
    () => ({ phase, prefs, leagues, season, bundle, switching, lookedUp, error, submitUsername, selectLeague, unlink, setWindow, retry }),
    [phase, prefs, leagues, season, bundle, switching, lookedUp, error, submitUsername, selectLeague, unlink, setWindow, retry],
  );

  return <MyTeamContext.Provider value={value}>{children}</MyTeamContext.Provider>;
}

export function useMyTeam(): MyTeamContextValue {
  const ctx = useContext(MyTeamContext);
  if (!ctx) throw new Error('useMyTeam must be used inside <MyTeamProvider>');
  return ctx;
}
