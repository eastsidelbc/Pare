# Dev Note — 2026-09-14 — "+" create-comparison flow (Vision Step 3)

> Rules live in `CLAUDE.md`; rationale only here. Builds on the Step-1 store +
> Step-2 workspace. Vision: `VISION.md`.

## Context
Add a top-right "+" on the Home (schedule) header → pick any two teams → open
that matchup as a new tab in the Compare workspace. Reuse the existing team
selector + `lib/teams.ts`; don't rebuild selectors or touch data/ranking math.

## Decisions
- **New client island** `components/compare/NewComparisonButton.tsx` rendered in
  the Home header top-right (next to "2026 Season"), styled like the week stepper
  (`var(--card)` + border + `--radius-md`, gold `+`), 44×44 tap target. The
  comparisons store is provided by the layout, so `useComparisons()` works on Home.
- **Reuse, don't rebuild.** The picker (a bottom-sheet modal) contains two
  existing `<TeamSelector>` instances fed from the existing `NFL_TEAMS` registry
  (`NFL_TEAMS.map(t => ({ team: t.name }))`) — no new selector component, no new
  team list.
- **Confirm →** `addComparison(teamA, teamB)` (returns the new id, activates it)
  → `setActive(id)` → `router.push('/compare')`, so it opens as its own tab.
- **Cap:** `+` is disabled/greyed when `comparisons.length >= MAX_COMPARISONS`
  (pointer-events off + `openPicker` early-return); `addComparison` also returns
  `null` at the cap as a backstop.
- **Cancel/dismiss:** overlay click, Cancel button, or Escape closes with no
  change. Confirm disabled until two *different* teams are chosen (inline hint if
  the same team is picked twice).

## Files
- New: `components/compare/NewComparisonButton.tsx`.
- Changed: `app/page.tsx` (header top-right now renders the "+").

## Testing (cheap; no browser — Kobe checks UI)
- `tsc --noEmit` + `eslint` clean on changed files.
- Compiled `lib/comparisons/store.ts` + harness mirroring
  `ComparisonsProvider.addComparison`:
  - Below cap: `+` returns a new id, it becomes active, `count` grows, navigates
    to `/compare` → opens as its own tab (BUF vs KC).
  - At `MAX_COMPARISONS`: add rejected (`id === null`), count + active unchanged
    → "+" is a no-op (and the button is disabled).
- Reuse confirmed by inspection: imports `TeamSelector` + `NFL_TEAMS` (no
  duplicate picker/registry).

## Follow-ups
- Step 4: Home accordion (inline peek reusing `ComparePane`).
- Step 6: localStorage persistence of tabs + active id.
- Picker could preselect the current-week's featured teams later; empty-by-default
  for now.

## Confirmation
I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.
