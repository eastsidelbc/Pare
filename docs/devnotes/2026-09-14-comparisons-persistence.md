# Dev Note — 2026-09-14 — Persist comparisons (localStorage) (Vision Step 6)

> Rules live in `CLAUDE.md`; rationale only here. Builds on the Step-1 store.
> Vision: `VISION.md`.

## Context
Save open comparisons + active tab so they survive closing/reopening the app.
Must be SSR/hydration-safe (Next), robust to corrupt/old storage, and respect
`MAX_COMPARISONS`. Deep link still wins for what's active.

## Decisions
- **Client-only persistence module** `lib/comparisons/persist.ts` (pure, no
  React): `loadComparisons(max)` + `saveComparisons(state)`.
  - **Key:** `pare:comparisons`. **Schema `version`: 1** (stored in payload).
  - Every access guarded by `typeof window !== 'undefined'`; reads/parse wrapped
    in try/catch. Validates shape (id/teamA/teamB + settings string-arrays) and
    version; anything missing/corrupt/old → returns `null` → seed cleanly.
  - Trims to `max` on restore; repairs a dangling `activeId` to the first tab.
- **Hydration is post-mount (SSR-safe).** `ComparisonsProvider` initial state is
  the SEED on both server and first client render — NO localStorage in the
  `useState` initializer → zero hydration mismatch. A `useEffect` restores from
  storage after mount and flips a `hydrated` flag (exposed on the context).
- **Writes on any change, debounced 150ms**, gated on `hydrated` so the
  pre-hydration seed can't overwrite saved data before it's read. Covers
  add/remove/setActive/update (all mutate `comparisons`/`activeId`).
- **Deep link wins, on top of restored tabs.** `CompareWorkspace`'s deep-link
  effect now waits for `hydrated`, then dedupes to an existing tab for the same
  (unordered) pair (`setActive`) or `addComparison` (respects the cap) — instead
  of overwriting the active restored tab.

## Files
- New: `lib/comparisons/persist.ts`.
- Changed: `components/ComparisonsProvider.tsx` (hydrate post-mount + debounced
  save + `hydrated` on context), `components/compare/CompareWorkspace.tsx`
  (deep link gated on `hydrated`, find-or-create).

## Testing (cheap; no browser — Kobe checks persistence)
- `tsc --noEmit` + `eslint` clean on changed files.
- Compiled `persist.ts` + harness against a mock `window.localStorage`:
  - Round-trip: 2 comparisons + activeId restored (`key: pare:comparisons`,
    `version: 1`).
  - Corrupt JSON → `null`; wrong `version` → `null`; bad shape (missing
    `settings`) → `null` — all seed cleanly, never throw.
  - 12 saved + `loadComparisons(8)` → trimmed to 8, dangling `activeId` repaired
    to the first tab.
  - SSR guard: no `window` → `load` returns `null`, `save` is a no-op (no throw).
- Code inspection: initial render uses the seed (no SSR localStorage read);
  restore + writes are client, post-mount; `hydrated` gates both writes and the
  deep link.

## Follow-ups
- Fresh app (no saved data) + a `?home=&away=` deep link leaves the default seed
  as a stray tab alongside the deep-linked one (additive per spec). Could replace
  the untouched seed in that one case later if desired.

## Confirmation
I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.
