/**
 * Pure, dependency-free collection logic for the comparisons store.
 *
 * Kept free of React and of app config so it stays trivially unit-testable
 * (the React binding + defaults live in components/ComparisonsProvider.tsx).
 * See docs/adr/2026-09-14-comparisons-store.md.
 */

/** Per-comparison settings (metric selections that used to be global). */
export interface ComparisonSettings {
  offenseMetrics: string[];
  defenseMetrics: string[];
}

/** A single head-to-head comparison (one future tab). */
export interface Comparison {
  id: string;
  teamA: string;
  teamB: string;
  settings: ComparisonSettings;
}

/** Patch shape for updateComparison — teams and/or a partial settings merge. */
export type ComparisonPatch = Partial<Pick<Comparison, 'teamA' | 'teamB'>> & {
  settings?: Partial<ComparisonSettings>;
};

/** Collision-resistant id for a comparison. */
export function makeId(): string {
  return `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Append a comparison, enforcing the cap. `added:false` = cap reached (no-op). */
export function addToCollection(
  list: Comparison[],
  comparison: Comparison,
  max: number,
): { list: Comparison[]; added: boolean } {
  if (list.length >= max) return { list, added: false };
  return { list: [...list, comparison], added: true };
}

/** Remove a comparison by id (may return an empty list — caller re-seeds). */
export function removeFromCollection(list: Comparison[], id: string): Comparison[] {
  return list.filter((c) => c.id !== id);
}

/** Immutably merge a patch into the matching comparison (settings merge partially). */
export function applyPatch(list: Comparison[], id: string, patch: ComparisonPatch): Comparison[] {
  return list.map((c) =>
    c.id === id
      ? {
          ...c,
          ...patch,
          settings: patch.settings ? { ...c.settings, ...patch.settings } : c.settings,
        }
      : c,
  );
}

/** Resolve the active comparison, falling back to the first if the id is stale. */
export function resolveActive(list: Comparison[], activeId: string): Comparison | undefined {
  return list.find((c) => c.id === activeId) ?? list[0];
}
