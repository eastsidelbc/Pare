# 2026-10-23 — Fantasy: Season | Last 4 in the sticky filter row

Branch `feat/last4-compare`.

## Why

The Season | Last 4 toggle sat in the WEEK bar, which scrolls away. After scrolling down the roster you had to
scroll back up to switch windows. Kobe asked for it in the sticky filter row, in the spot "Expand all /
Collapse all" used. He picked **removing** Expand / Collapse all rather than moving it to the WEEK bar.

## What changed

- `components/myteam/WindowControl.tsx` (new): the toggle + ⓘ + note card, taken unchanged out of `WeekBar`.
  The note card now opens `calc(100% + 8px)` under the control (it used a fixed 46px under the week bar) and is
  capped at `100vw - 32px`.
- `components/myteam/FilterRow.tsx`: right slot = `WindowControl`. Props `anyExpanded` / `onExpandAll` /
  `onCollapseAll` were replaced by `window` / `onWindowChange`.
- `components/myteam/WeekBar.tsx`: now just "WEEK n" + date range (`minHeight: 42` keeps the old height).
- `components/myteam/MyTeamScreen.tsx`, `MyTeamApp.tsx`: callers updated. The `anyExpanded` / `visibleIds` logic is gone.
  Onboarding / pre-draft screens no longer show the toggle. It only matters with a roster on screen.
- `docs/design-system.md` §9.4: Week bar, new Window control row, Filter row.
- `e2e/myteam.spec.ts`: the toggle is asserted in `[data-filter-row]`. The 393px "stays visible" check now
  targets `[data-window-control]`. The "pills fit → no fade" league is QB + RB (QB / RB / WR no longer fits
  beside the toggle at 393px). There's a check that Expand / Collapse all is gone.

## Verified

- `npm run check` clean. `npm run test:run` 53 files / 424 tests pass.
- `npx playwright test e2e/myteam.spec.ts`: everything touched here passes. The 6 `5-tab nav` failures were
  already there before this change: the spec still expects a "Standings" tab, which Leans replaced on 2026-10-14.
  That spec needs its `NAV_TABS` updated separately.
- Kobe to eyeball: scroll the roster → the toggle stays pinned top-right; ⓘ note opens under it.

## Open risks

- At 393px the pills have ~200px, so a full roster (All QB RB WR TE K DEF) scrolls sideways sooner. The fade
  already signals "more this way".
