# Dev Note — 2026-09-14 — Comparisons store (Vision Step 1)

> Rules live in `CLAUDE.md`; this note is implementation rationale only (no duplication).
> Decision record: `docs/adr/2026-09-14-comparisons-store.md`. Vision: `VISION.md`.

## Context
Vision Step 1 = **pure plumbing**. Replace the single global `selectedTeamA/B`
pair (local `useState` at `app/compare/page.tsx`) with a collection store that
can hold many comparisons + an `activeId`, then make the compare page read/write
the **active** comparison. No new UI — the app must look/behave identically.

## Decisions
- **Context store, not a library.** `components/ComparisonsProvider.tsx` +
  `useComparisons()`. Mounted in `app/layout.tsx` (wraps compare page now, home
  later). See ADR for the guardrail change vs CLAUDE.md.
- **Pure logic split out** to `lib/comparisons/store.ts` (no React / no app
  config) so the immutable list ops are unit-testable offline.
- **`Comparison = { id, teamA, teamB, settings }`**, `settings =
  { offenseMetrics, defenseMetrics }` (these metric lists were global page state,
  so per the prompt they move into per-comparison settings). Display mode stays
  per-panel (not global) → intentionally left out of settings for now.
- **Seed one default** (Minnesota Vikings vs Detroit Lions + default metrics) so
  `/compare` works exactly as today. `MAX_COMPARISONS = 8` in `config/constants.ts`,
  enforced in `addComparison`.
- **Deep link preserved.** `/compare?away=XXX&home=YYY` now sets the active
  comparison's teams via `updateComparison` (was the `useState` initializer).

## Implementation notes
- `app/compare/page.tsx`: removed 4 `useState`s (teams + 2 metric lists); now
  derives them from `activeComparison`. Team-change + metric-change handlers call
  `updateComparison(activeId, patch)`. Kept the deterministic-defaults + validation
  effect (now patches the store). Deep-link handling moved from init to a
  `useEffect` keyed on the URL params.
- Untouched: `useNflStats`, `useRanking`, `useBarCalculation`, display mode,
  Offense/Defense panels + rows, schedule. Reusable compare UI still renders off
  the active comparison.
- Incidental lint cleanup in the file I was already editing: removed unused
  `PWAInstallPrompt` import; typed the two `navigator as any` perf-hint casts.

## Testing (cheap; no browser)
- `npx tsc --noEmit` clean; `npx eslint` clean on all changed files.
- Compiled `lib/comparisons/store.ts` and ran a Node harness:
  - #2 initial state → `count:1, activeIdSet:true, Minnesota Vikings vs Detroit Lions, off:5/def:8 metrics`.
  - #3 deep link BAL/BUF → active holds `Buffalo Bills` (A) vs `Baltimore Ravens` (B).
  - #3b partial `settings` patch merges (defense list kept).
  - #4 `addToCollection` beyond `MAX (8)` → finalCount 8, 5 rejected.
  - #5 remove last → empty (provider re-seeds to keep ≥1 invariant).

## Follow-ups
- Step 2: swipeable multi-tab Compare shell rendering the existing compare per tab.
- localStorage persistence of tabs + active id (Vision, later step).
- Metric callbacks still pass full arrays (no functional updaters) — fine today.

## Confirmation
I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.
