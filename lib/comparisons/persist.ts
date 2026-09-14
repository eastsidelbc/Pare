/**
 * localStorage persistence for the comparisons store (Vision Step 6).
 *
 * Client-only + defensive: every access is guarded by `typeof window`, reads are
 * wrapped in try/catch, and a schema `version` gates the payload — anything
 * missing/corrupt/old-shape is ignored so the store seeds cleanly instead of
 * crashing. Pure module (no React); the provider wires it up post-mount.
 */

import type { Comparison } from './store';

/** Bump when the persisted shape changes incompatibly → old data is discarded. */
export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'pare:comparisons';

interface PersistedState {
  version: number;
  activeId: string;
  comparisons: Comparison[];
}

export interface RestoredState {
  comparisons: Comparison[];
  activeId: string;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function isComparison(v: unknown): v is Comparison {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  const s = c.settings as Record<string, unknown> | undefined;
  return (
    typeof c.id === 'string' &&
    typeof c.teamA === 'string' &&
    typeof c.teamB === 'string' &&
    typeof s === 'object' && s !== null &&
    isStringArray(s.offenseMetrics) &&
    isStringArray(s.defenseMetrics)
  );
}

/**
 * Read + validate persisted state. Returns `null` when there's nothing usable
 * (SSR, empty, corrupt, wrong version) so the caller seeds the default.
 * Trims to `maxComparisons` and repairs `activeId` if it's dangling.
 */
export function loadComparisons(maxComparisons: number): RestoredState | null {
  if (typeof window === 'undefined') return null; // never read during SSR
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || parsed.version !== SCHEMA_VERSION) return null;
    if (!Array.isArray(parsed.comparisons)) return null;

    const valid = parsed.comparisons.filter(isComparison);
    if (valid.length === 0) return null;

    // Respect the cap on restore (trim extras if somehow over).
    const comparisons = valid.slice(0, Math.max(1, maxComparisons));

    // Repair activeId if missing / dangling after trim.
    const activeId =
      typeof parsed.activeId === 'string' && comparisons.some((c) => c.id === parsed.activeId)
        ? parsed.activeId
        : comparisons[0].id;

    return { comparisons, activeId };
  } catch {
    return null; // corrupt JSON / storage error → seed cleanly
  }
}

/** Persist state (client-only, best-effort — never throws). */
export function saveComparisons(state: RestoredState): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedState = {
      version: SCHEMA_VERSION,
      activeId: state.activeId,
      comparisons: state.comparisons,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / privacy mode / serialization — ignore, persistence is best-effort */
  }
}
