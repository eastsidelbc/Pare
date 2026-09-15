/**
 * ScheduleProvider — layout-persistent store for the schedule screen.
 *
 * MOUNTED IN layout.tsx (alongside ComparisonsProvider), so it survives
 * navigation between Home and Compare. That is what makes the schedule feel
 * "load once": weeks already fetched, the active week, the accordion, and the
 * scroll position all live here and are NOT thrown away when the Home route
 * unmounts. Coming back is instant with zero refetch.
 *
 * Owns:
 *  • a CONTIGUOUS window of loaded weeks (`weeks[min..max]`), lazy-extended as
 *    you scroll (append/prepend) or jumped (reset far, extend adjacent);
 *  • the active (in-view) week that drives the header label;
 *  • the shared NFL stats (fetched once here for every inline compare peek);
 *  • the single-open accordion id; and an in-memory scroll offset (a ref).
 *
 * No scroll DOM lives here — ScheduleScreen owns the scroller + refs and calls
 * these actions. Seeded from server-fetched initial data (see layout.tsx) so the
 * first paint is real content, not a skeleton.
 */

'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { MIN_WEEK, MAX_WEEK, type Matchup } from '@/lib/schedule';
import { useNflStats, type TeamData } from '@/lib/useNflStats';

/** Load state of a single week in the window. */
export type WeekStatus = 'loading' | 'ready' | 'empty';

export interface WeekEntry {
  week: number;
  status: WeekStatus;
  matchups: Matchup[];
}

/** Matchup as it arrives over JSON from `/api/schedule` (kickoff is a string). */
interface SerializedMatchup extends Omit<Matchup, 'kickoff'> {
  kickoff: string;
}

interface ScheduleStats {
  offenseData: TeamData[];
  defenseData: TeamData[];
  isLoading: boolean;
  isLoadingOffense: boolean;
  isLoadingDefense: boolean;
}

export interface ScheduleContextValue {
  weeks: Record<number, WeekEntry>;
  /** Ordered [min..max] loaded week numbers. */
  orderedWeeks: number[];
  min: number;
  max: number;
  activeWeek: number;
  currentNflWeek: number;
  /** Every loaded matchup, ordered — used to gate the live-score poll. */
  allMatchups: Matchup[];
  stats: ScheduleStats;
  /** Single-open accordion row (persists across navigation). */
  openId: string | null;
  toggleOpen: (id: string) => void;
  /** In-memory scroll offset of the scroller, preserved across navigation. */
  scrollTopRef: MutableRefObject<number>;
  /** A week ScheduleScreen should scroll to once it's loaded+rendered. */
  pendingScrollWeek: number | null;
  clearPendingScroll: () => void;
  setActiveWeek: (w: number) => void;
  /** Load the next week (max+1) at the bottom of the window. */
  appendWeek: () => void;
  /** Load the previous week (min-1) at the top of the window. */
  prependWeek: () => void;
  /** Go to a week: extend if adjacent, reset the window if far. */
  jumpToWeek: (w: number) => void;
  /** Merge live scoreboard data into the window (by matchup id). */
  patchLiveMatchups: (live: Matchup[]) => void;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

/** Fields the live poll is allowed to change — true if any differ. */
function differsLive(a: Matchup, b: Matchup): boolean {
  return (
    a.state !== b.state ||
    a.completed !== b.completed ||
    a.statusDetail !== b.statusDetail ||
    a.awayScore !== b.awayScore ||
    a.homeScore !== b.homeScore ||
    a.winner !== b.winner ||
    (a.odds?.spread ?? null) !== (b.odds?.spread ?? null) ||
    (a.odds?.overUnder ?? null) !== (b.odds?.overUnder ?? null)
  );
}

/** Fetch + revive one week's matchups from the schedule API. */
async function fetchWeekMatchups(week: number): Promise<Matchup[]> {
  const res = await fetch(`/api/schedule?week=${week}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { week: number; matchups: SerializedMatchup[] };
  return data.matchups.map((m) => ({ ...m, kickoff: new Date(m.kickoff) }));
}

function clampWeek(w: number): number {
  return Math.min(MAX_WEEK, Math.max(MIN_WEEK, Math.trunc(w)));
}

export interface ScheduleProviderProps {
  initialWeek: number;
  initialMatchups: Matchup[];
  currentNflWeek: number;
  children: React.ReactNode;
}

export function ScheduleProvider({
  initialWeek,
  initialMatchups,
  currentNflWeek,
  children,
}: ScheduleProviderProps) {
  const seedWeek = clampWeek(initialWeek);

  const [weeks, setWeeks] = useState<Record<number, WeekEntry>>(() => ({
    [seedWeek]: {
      week: seedWeek,
      status: initialMatchups.length > 0 ? 'ready' : 'empty',
      matchups: initialMatchups,
    },
  }));
  const [min, setMin] = useState(seedWeek);
  const [max, setMax] = useState(seedWeek);
  const [activeWeek, setActiveWeek] = useState(seedWeek);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingScrollWeek, setPendingScrollWeek] = useState<number | null>(null);

  // Latest-value refs so callbacks don't need to re-create on every change.
  const minRef = useRef(min);
  minRef.current = min;
  const maxRef = useRef(max);
  maxRef.current = max;
  const loadingTopRef = useRef(false);
  const loadingBottomRef = useRef(false);

  // In-memory scroll offset — a ref so it survives navigation without re-render.
  const scrollTopRef = useRef(0);

  // Shared NFL stats for every inline compare peek — fetched ONCE here.
  const {
    offenseData,
    defenseData,
    isLoading,
    isLoadingOffense,
    isLoadingDefense,
  } = useNflStats();

  const toggleOpen = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const clearPendingScroll = useCallback(() => setPendingScrollWeek(null), []);

  const appendWeek = useCallback(() => {
    if (loadingBottomRef.current) return;
    const target = maxRef.current + 1;
    if (target > MAX_WEEK) return;
    loadingBottomRef.current = true;
    setWeeks((prev) => ({ ...prev, [target]: { week: target, status: 'loading', matchups: [] } }));
    setMax(target);
    fetchWeekMatchups(target)
      .then((ms) =>
        setWeeks((prev) => ({
          ...prev,
          [target]: { week: target, status: ms.length > 0 ? 'ready' : 'empty', matchups: ms },
        })),
      )
      .catch(() =>
        setWeeks((prev) => ({ ...prev, [target]: { week: target, status: 'empty', matchups: [] } })),
      )
      .finally(() => {
        loadingBottomRef.current = false;
      });
  }, []);

  const prependWeek = useCallback(() => {
    if (loadingTopRef.current) return;
    const target = minRef.current - 1;
    if (target < MIN_WEEK) return;
    loadingTopRef.current = true;
    // Insert the loading (skeleton) entry immediately so ScheduleScreen can
    // anchor the scroll the moment the new section takes up space.
    setWeeks((prev) => ({ ...prev, [target]: { week: target, status: 'loading', matchups: [] } }));
    setMin(target);
    fetchWeekMatchups(target)
      .then((ms) =>
        setWeeks((prev) => ({
          ...prev,
          [target]: { week: target, status: ms.length > 0 ? 'ready' : 'empty', matchups: ms },
        })),
      )
      .catch(() =>
        setWeeks((prev) => ({ ...prev, [target]: { week: target, status: 'empty', matchups: [] } })),
      )
      .finally(() => {
        loadingTopRef.current = false;
      });
  }, []);

  const resetTo = useCallback((w: number) => {
    loadingTopRef.current = false;
    loadingBottomRef.current = false;
    setWeeks({ [w]: { week: w, status: 'loading', matchups: [] } });
    setMin(w);
    setMax(w);
    setActiveWeek(w);
    setPendingScrollWeek(w);
    fetchWeekMatchups(w)
      .then((ms) =>
        setWeeks({ [w]: { week: w, status: ms.length > 0 ? 'ready' : 'empty', matchups: ms } }),
      )
      .catch(() => setWeeks({ [w]: { week: w, status: 'empty', matchups: [] } }));
  }, []);

  const jumpToWeek = useCallback(
    (wRaw: number) => {
      const w = clampWeek(wRaw);
      const curMin = minRef.current;
      const curMax = maxRef.current;
      if (w >= curMin && w <= curMax) {
        setActiveWeek(w);
        setPendingScrollWeek(w);
        return;
      }
      if (w === curMin - 1) {
        prependWeek();
        setActiveWeek(w);
        setPendingScrollWeek(w);
        return;
      }
      if (w === curMax + 1) {
        appendWeek();
        setActiveWeek(w);
        setPendingScrollWeek(w);
        return;
      }
      resetTo(w);
    },
    [appendWeek, prependWeek, resetTo],
  );

  const patchLiveMatchups = useCallback((live: Matchup[]) => {
    if (live.length === 0) return;
    const byId = new Map(live.map((m) => [m.id, m]));
    setWeeks((prev) => {
      let changed = false;
      const next: Record<number, WeekEntry> = {};
      for (const key of Object.keys(prev)) {
        const wk = Number(key);
        const entry = prev[wk];
        let entryChanged = false;
        const newMatchups = entry.matchups.map((m) => {
          const l = byId.get(m.id);
          if (!l || !differsLive(m, l)) return m;
          entryChanged = true;
          changed = true;
          return {
            ...m,
            state: l.state,
            completed: l.completed,
            statusDetail: l.statusDetail,
            awayScore: l.awayScore,
            homeScore: l.homeScore,
            winner: l.winner,
            odds: l.odds,
          };
        });
        next[wk] = entryChanged ? { ...entry, matchups: newMatchups } : entry;
      }
      return changed ? next : prev;
    });
  }, []);

  const orderedWeeks = useMemo(() => {
    const out: number[] = [];
    for (let w = min; w <= max; w++) out.push(w);
    return out;
  }, [min, max]);

  const allMatchups = useMemo(() => {
    const out: Matchup[] = [];
    for (const w of orderedWeeks) {
      const entry = weeks[w];
      if (entry) out.push(...entry.matchups);
    }
    return out;
  }, [orderedWeeks, weeks]);

  const stats = useMemo<ScheduleStats>(
    () => ({ offenseData, defenseData, isLoading, isLoadingOffense, isLoadingDefense }),
    [offenseData, defenseData, isLoading, isLoadingOffense, isLoadingDefense],
  );

  const value = useMemo<ScheduleContextValue>(
    () => ({
      weeks,
      orderedWeeks,
      min,
      max,
      activeWeek,
      currentNflWeek,
      allMatchups,
      stats,
      openId,
      toggleOpen,
      scrollTopRef,
      pendingScrollWeek,
      clearPendingScroll,
      setActiveWeek,
      appendWeek,
      prependWeek,
      jumpToWeek,
      patchLiveMatchups,
    }),
    [
      weeks,
      orderedWeeks,
      min,
      max,
      activeWeek,
      currentNflWeek,
      allMatchups,
      stats,
      openId,
      toggleOpen,
      pendingScrollWeek,
      clearPendingScroll,
      appendWeek,
      prependWeek,
      jumpToWeek,
      patchLiveMatchups,
    ],
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule(): ScheduleContextValue {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error('useSchedule must be used within a <ScheduleProvider>');
  }
  return ctx;
}
