# Dev Note — 2026-09-14 — Home accordion + "Open full" (Vision Step 4)

> Rules live in `CLAUDE.md`; rationale only here. Builds on Steps 1–3. Vision:
> `VISION.md`.

## Context
Make each Home schedule row an accordion: tap to expand an inline head-to-head
compare for those teams (editable in place); an "Open full" button promotes it
into the Compare workspace as a tab. Reuse the existing Compare component; don't
rebuild compare UI or touch data/ranking/bars.

## Decisions
- **One Compare component, three places.** Added an `inline` variant instead of a
  new peek UI: `ComparePane inline` → `MobileCompareLayout variant="inline"`
  (the two `CompactPanel`s only, no top/bottom bars, natural height). Same panels
  /rows/bars/dropdowns as the workspace — no duplication.
- **`MatchupCard` is now the accordion header** (button, not a Link): tapping
  toggles; a chevron rotates; gold border when open. The old direct
  `/compare?away=&home=` deep-link tap is replaced by expand + "Open full"
  (the query deep link itself still works from anywhere).
- **Ephemeral draft, not the store.** `MatchupAccordion` holds local draft state
  (teams seeded from the matchup + default metrics), editable via the inline
  panels' dropdowns. Expanding never mutates `comparisons[]`.
- **Single-open accordion.** `openId` lives in `ScheduleBoard`
  (`toggleOpen: prev===id?null:id`); switching weeks collapses it.
- **Shared data, fetched once.** `ScheduleBoard` calls `useNflStats()` once and
  passes stats to every row → expanding is instant, no per-row refetch (same hook
  the workspace uses; skeleton shown while pending).
- **"Open full" promotes + dedupes.** Find an existing tab for the same
  (unordered) pair → `updateComparison` (carry inline edits) + `setActive`; else
  `addComparison` (respects `MAX_COMPARISONS`) + carry metrics; then
  `router.push('/compare')`.

## Files
- New: `components/schedule/MatchupAccordion.tsx`.
- Changed: `components/schedule/MatchupCard.tsx` (Link→button header, chevron),
  `components/schedule/ScheduleList.tsx` (renders `MatchupAccordion`, threads
  stats + `openId`/`onToggle`), `components/schedule/ScheduleBoard.tsx`
  (`useNflStats` once + single-open state), `components/compare/ComparePane.tsx`
  (`inline` prop), `components/mobile/MobileCompareLayout.tsx` (`variant` prop).

## Testing (cheap; no browser — Kobe checks UI)
- `tsc --noEmit` + `eslint` clean on changed files.
- Compiled `lib/comparisons/store.ts` + harness mirroring `toggleOpen` and
  `openFull` against the real store:
  - Expand → `ComparePane` gets the row's teams (BUF/BAL) via the shared hook.
  - Single-open: open g1 then g2 → only g2 open; tap g2 again → collapsed.
  - Open full (new pair) → `addComparison`, becomes active, navigates `/compare`.
  - Open full (same pair, and reversed order) → dedupes: no new tab, count
    unchanged, active switches to the existing tab.
- Reuse confirmed by inspection: `MatchupAccordion` uses `ComparePane` +
  `useNflStats` (existing) — no new compare UI or data hook.

## Follow-ups
- Step 5: bottom nav (Home ↔ Compare). Step 6: localStorage persistence.
- Inline metric editing isn't surfaced in the peek (mobile layout has no floating
  button); defaults are used and carried on promote. Revisit if desired.

## Confirmation
I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.
