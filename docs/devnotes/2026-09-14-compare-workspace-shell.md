# Dev Note — 2026-09-14 — Compare workspace shell (Vision Step 2)

> Rules live in `CLAUDE.md`; implementation rationale only here. Builds on the
> Step-1 store (`docs/adr/2026-09-14-comparisons-store.md` /
> `docs/devnotes/2026-09-14-comparisons-store.md`). Vision: `VISION.md`.

## Context
Step 2 = turn `/compare` into a **swipeable multi-comparison workspace** driven
by the comparisons store. Reuse the existing Compare UI — don't rebuild it, don't
touch data fetching or ranking/bar math. One page per comparison; swipe/tab
changes `activeId`; each tab is closable.

## Decisions
- **Reuse via extraction, not rebuild.** Moved the old single-compare render body
  into `components/compare/ComparePane.tsx` (purely presentational: teams, metrics,
  data + handlers all via props). Zero logic changes to panels/rows/hooks.
- **Fetch once, share by props.** `useNflStats()` is called **only** in
  `CompareWorkspace`; every pane reads the same data via props → swiping never
  refetches (fetch is a mount-only effect). All other files import only the
  `TeamData` *type*.
- **Paging with Framer Motion** (already a dep): a measured-width horizontal track
  (`useMotionValue` + `animate`), `drag="x"` with an `onDragEnd` threshold/velocity
  snap. Landing on a page = `setActive(id)`.
- **Tab bar** `components/compare/CompareTabBar.tsx`: one chip per comparison
  (`ABBR · ABBR`), active = filled gold (design tokens), `×` closes (hidden when
  only 1), and an optional `+` affordance **wired but unused** (create flow is
  Step 3 — `onAdd` left unpassed; `canAdd` already respects `MAX_COMPARISONS`).
- **Fixed-position chrome at the root.** `OfflineStatusBanner` + desktop
  `FloatingMetricsButton` render at the workspace root (not inside a pane) because
  the pager track's transform would otherwise capture `position: fixed`. The
  floating button edits the **active** comparison's metrics.
- **Layout tweaks for embedding (minimal):** `MobileCompareLayout` root height
  `100dvh → 100%` (fills the pager cell under the tab bar); `ComparePane`'s desktop
  background `fixed → absolute` (works inside the transformed track).
- **Close-active reassignment + never-empty:** provider already reassigns active to
  a neighbor and re-seeds if the last tab is closed (Step 1 invariant).

## Files
- New: `components/compare/ComparePane.tsx`, `components/compare/CompareTabBar.tsx`,
  `components/compare/CompareWorkspace.tsx`.
- Changed: `app/compare/page.tsx` (now a thin Suspense shell → workspace),
  `components/mobile/MobileCompareLayout.tsx` (height 100%).

## Testing (cheap; no browser — Kobe checks the swipe)
- `npx tsc --noEmit` clean; `eslint` clean on all changed files.
- Compiled `lib/comparisons/store.ts` + a harness mirroring the provider's
  `setActive`/`removeComparison` reducers and the workspace's page-count/active-index:
  - Seed 3 → `pagesRendered:3, tabsShown:3, activeIndex:0`.
  - Tab tap #3 → `activeIndex:2` (KC vs PHI); `setActive(unknown)` = no-op.
  - Close **active** → `pagesRendered:2`, active reassigned to a valid neighbor.
  - Close **non-active** → active id preserved.
  - Close **last** → never empty (1 seeded default kept, active valid).
- No-refetch-on-swipe confirmed by inspection: `useNflStats()` called once
  (workspace); swipe only calls `setActive`.

## Follow-ups
- Step 3: `+` create flow (pick two teams → `addComparison` → new tab).
- Step 4: Home accordion reusing `ComparePane`. Step 6: localStorage persistence.
- Desktop min-h-screen pane inside the flex-1 cell scrolls ~tab-bar-height; fine
  for now, revisit if it bugs anyone.

## Confirmation
I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.
