/**
 * ComparisonsProvider — collection store for head-to-head comparisons.
 *
 * Foundation for the multi-comparison "tabs" workspace (see VISION.md +
 * docs/adr/2026-09-14-comparisons-store.md). Supersedes the old
 * "props-only, single global A/B pair at ComparePage" rule from CLAUDE.md.
 *
 * Today the collection holds ONE comparison, so the app looks/behaves exactly
 * the same — this is pure plumbing. Later: tabs, home accordion, persistence.
 *
 * No data fetching / ranking / display-mode / bar math lives here — this store
 * only owns WHICH teams (+ per-comparison metric settings) are being compared.
 * The immutable list operations live in lib/comparisons/store.ts (unit-tested).
 */

'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_OFFENSE_METRICS, DEFAULT_DEFENSE_METRICS } from '@/lib/metricsConfig';
import { APP_CONSTANTS } from '@/config/constants';
import {
  addToCollection,
  applyPatch,
  makeId,
  removeFromCollection,
  resolveActive,
  type Comparison,
  type ComparisonPatch,
  type ComparisonSettings,
} from '@/lib/comparisons/store';
import { loadComparisons, saveComparisons } from '@/lib/comparisons/persist';

export type { Comparison, ComparisonPatch, ComparisonSettings };

export interface ComparisonsContextValue {
  comparisons: Comparison[];
  activeId: string;
  /** Convenience selector — always defined (store guarantees ≥1 comparison). */
  activeComparison: Comparison;
  /** True once localStorage hydration has run (client, post-mount). Consumers
   *  that must act "after restore" (e.g. deep links) should wait for this. */
  hydrated: boolean;
  /** Adds a comparison (respecting MAX_COMPARISONS) and activates it.
   *  Returns the new id, or `null` if the cap was hit. */
  addComparison: (teamA: string, teamB: string) => string | null;
  removeComparison: (id: string) => void;
  setActive: (id: string) => void;
  updateComparison: (id: string, patch: ComparisonPatch) => void;
}

/** Documented default matchup (CLAUDE.md “Key Facts”). */
const DEFAULT_MATCHUP = { teamA: 'Minnesota Vikings', teamB: 'Detroit Lions' } as const;

function defaultSettings(): ComparisonSettings {
  return {
    offenseMetrics: [...DEFAULT_OFFENSE_METRICS],
    defenseMetrics: [...DEFAULT_DEFENSE_METRICS],
  };
}

/** One seeded default comparison so /compare works exactly as it does today. */
function seedComparison(teamA: string = DEFAULT_MATCHUP.teamA, teamB: string = DEFAULT_MATCHUP.teamB): Comparison {
  return { id: makeId(), teamA, teamB, settings: defaultSettings() };
}

const ComparisonsContext = createContext<ComparisonsContextValue | null>(null);

export function ComparisonsProvider({ children }: { children: React.ReactNode }) {
  // NOTE: initial state is the SEED on both server and first client render (no
  // localStorage read here) → zero hydration mismatch. Restore happens in an
  // effect AFTER mount (see below).
  const [comparisons, setComparisons] = useState<Comparison[]>(() => [seedComparison()]);
  const [activeId, setActiveId] = useState<string>(() => comparisons[0].id);
  const [hydrated, setHydrated] = useState(false);

  // ── Hydrate from localStorage once, post-mount (client-only) ────────────────
  useEffect(() => {
    const restored = loadComparisons(APP_CONSTANTS.MAX_COMPARISONS);
    if (restored) {
      setComparisons(restored.comparisons);
      setActiveId(restored.activeId);
    }
    setHydrated(true);
  }, []);

  // ── Persist on any change (debounced), but only after hydration so the
  //    pre-hydration seed can't clobber saved data before it's read ────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveComparisons({ comparisons, activeId });
    }, 150);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, comparisons, activeId]);

  const addComparison = useCallback((teamA: string, teamB: string): string | null => {
    const created = seedComparison(teamA, teamB);
    let added = false;
    setComparisons((prev) => {
      const result = addToCollection(prev, created, APP_CONSTANTS.MAX_COMPARISONS);
      added = result.added;
      return result.list;
    });
    if (!added) {
      console.warn(
        `⚠️ [comparisons] cap reached (${APP_CONSTANTS.MAX_COMPARISONS}) — addComparison ignored`,
      );
      return null;
    }
    setActiveId(created.id);
    return created.id;
  }, []);

  const removeComparison = useCallback((id: string) => {
    setComparisons((prev) => {
      const next = removeFromCollection(prev, id);
      // Invariant: always keep at least one comparison.
      const ensured = next.length > 0 ? next : [seedComparison()];
      setActiveId((currentActive) =>
        ensured.some((c) => c.id === currentActive) ? currentActive : ensured[0].id,
      );
      return ensured;
    });
  }, []);

  const setActive = useCallback((id: string) => {
    setComparisons((prev) => {
      if (prev.some((c) => c.id === id)) setActiveId(id);
      return prev;
    });
  }, []);

  const updateComparison = useCallback((id: string, patch: ComparisonPatch) => {
    setComparisons((prev) => applyPatch(prev, id, patch));
  }, []);

  const activeComparison = useMemo(
    () => resolveActive(comparisons, activeId) ?? comparisons[0],
    [comparisons, activeId],
  );

  const value = useMemo<ComparisonsContextValue>(
    () => ({
      comparisons,
      activeId,
      activeComparison,
      hydrated,
      addComparison,
      removeComparison,
      setActive,
      updateComparison,
    }),
    [comparisons, activeId, activeComparison, hydrated, addComparison, removeComparison, setActive, updateComparison],
  );

  return <ComparisonsContext.Provider value={value}>{children}</ComparisonsContext.Provider>;
}

/** Access the comparisons store. Must be used under <ComparisonsProvider>. */
export function useComparisons(): ComparisonsContextValue {
  const ctx = useContext(ComparisonsContext);
  if (!ctx) {
    throw new Error('useComparisons must be used within a <ComparisonsProvider>');
  }
  return ctx;
}
