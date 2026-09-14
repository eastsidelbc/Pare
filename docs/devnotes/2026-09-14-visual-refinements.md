# Dev Note — 2026-09-14 — Visual refinements: floating pill nav + compare reorder

> Rules live in `CLAUDE.md`; rationale only here. Pure layout/styling — no
> navigation/swipe/data/ranking changes. Vision: `VISION.md`.

## Task A — Floating "pill" bottom nav
- Restyled `components/BottomNav.tsx` only (NOT re-mounted/moved). Still the one
  persistent instance in `app/layout.tsx`, outside the compare swipe container.
- Now a full-width, **click-through** outer wrapper (`pointer-events-none`) with a
  centered, `pointer-events-auto` rounded capsule: `--nav-pill-h` (56px) tall,
  translucent `color-mix` surface + `backdrop-filter: blur`, `--shadow-pop`,
  fully rounded, floating `calc(safe-area + 12px)` above the bottom edge.
- Items unchanged (Home, Compare); active = gold tint + gold text/icon; derived
  from `usePathname`.
- Reserved footprint token `--nav-h` bumped 64 → 76px (capsule + gap) in
  `app/globals.css` so existing `calc(var(--nav-h) + safe-area)` content padding
  (Home `main`, CompareWorkspace root) still clears the floating pill.

## Task B — Compare screen vertical order
Top → bottom is now: **title row → tabs pill → cards** (in `CompareWorkspace`):
1. New shared title row: back (`ChevronLeft` → `/`) + centered "Compare" title +
   `NewComparisonButton` at top-right (so the "+" now shows on Compare, not just
   Home). `env(safe-area-inset-top)` aware.
2. `CompareTabBar` moved to sit BELOW the title row (between it and the cards).
3. Pager / `ComparePane` cards below, unchanged.
- Removed the per-pane `MobileTopBar` (it duplicated back+title); `MobileCompareLayout`
  is now just the scrollable cards area. Dead file `components/mobile/MobileTopBar.tsx`
  deleted (mirrors the Step 5 MobileBottomBar removal).
- Swiping + tab switching behavior untouched.

## Files
- Changed: `components/BottomNav.tsx`, `app/globals.css`,
  `components/compare/CompareWorkspace.tsx`, `components/mobile/MobileCompareLayout.tsx`.
- Deleted: `components/mobile/MobileTopBar.tsx`.

## Testing (cheap; no browser — Kobe checks the look)
- `tsc --noEmit` + `eslint` clean on changed files.
- Grep: `BottomNav` imported/rendered exactly once (`app/layout.tsx`);
  `NewComparisonButton` renders in `CompareWorkspace` (title row) + Home header;
  workspace order = title row → `CompareTabBar` → pager.

## Confirmation
I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.
