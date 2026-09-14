# Dev Note — 2026-09-14 — "+" on tab row + blank-tab inline team pick

> Rules live in `CLAUDE.md`; rationale only here. Pure UI/flow — no
> data/ranking/bar changes. Vision: `VISION.md`.

## Context
Replace the modal/bottom-sheet "create comparison" flow with an in-place one: the
"+" adds a blank tab you fill by tapping team slots directly on the Compare screen.

## Changes
1. **Home "+" removed** — `app/page.tsx` no longer imports/renders the create
   button; header is just the title + "2026 Season".
2. **"+" moved to the tab row (far right)** — `CompareWorkspace` now passes
   `onAdd` to `CompareTabBar`; the title-row button is gone (replaced by a spacer
   to keep the title centered). The tab-row "+" is enlarged (34px, gold) and
   `ml-auto` so it sits at the end of the strip; disabled at `MAX_COMPARISONS`.
3. **Blank tab + inline pick** —
   - `handleAddBlank` = `addComparison('', '')` (blank teams; auto-activates).
     Blank tabs are labeled "New" in `CompareTabBar`.
   - New `components/compare/BlankComparePicker.tsx`: empty state with two "Pick
     team" slots (logo/name once chosen). Tapping a slot opens `CompactTeamSelector`
     — the SAME Floating-UI anchored dropdown used in the panel headers (portaled
     to body, so it isn't captured by the pager transform). NOT a bottom sheet.
   - `ComparePane` renders `BlankComparePicker` whenever `!teamA || !teamB` (full
     view only; the Home accordion always seeds both teams). Once both are filled,
     it renders the panels normally.
4. **Old sheet flow removed** — `components/compare/NewComparisonButton.tsx` deleted.
5. **Validation guard** — `CompareWorkspace`'s repair effect now only fixes
   NON-empty invalid team names; empty teams stay blank so the "+" empty state
   isn't auto-filled with the default matchup.

## Files
- Changed: `app/page.tsx`, `components/compare/CompareWorkspace.tsx`,
  `components/compare/CompareTabBar.tsx`, `components/compare/ComparePane.tsx`.
- New: `components/compare/BlankComparePicker.tsx`.
- Deleted: `components/compare/NewComparisonButton.tsx`.

## Testing (cheap; no browser)
- `tsc --noEmit` + `eslint` clean on changed files.
- Code review: no `NewComparisonButton` references remain (Home or Compare);
  `onAdd` renders the "+" at the end of `CompareTabBar`; `handleAddBlank` adds a
  blank tab; `BlankComparePicker` uses `CompactTeamSelector` (inline, no sheet);
  `ComparePane` short-circuits to the picker until both teams are set; the repair
  effect leaves empty teams blank.

## Follow-ups
- Blank tabs persist to localStorage as `{teamA:'', teamB:''}` (valid shape) and
  restore as blank — acceptable; revisit if we'd rather drop unfilled tabs on save.

## Confirmation
I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.
