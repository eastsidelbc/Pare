# Dev Note — 2026-09-14 — Persistent bottom nav (Vision Step 5)

> Rules live in `CLAUDE.md`; rationale only here. Vision: `VISION.md`.

## Context
One bottom nav (Home ↔ Compare) mounted ONCE at the app-shell level so it stays
put across every screen — never unmounts, re-animates, or "switches" on
navigation or when swiping comparison tabs. Behavior + placement only (fancy
floating-pill styling deferred to the polish pass).

## Decisions
- **Single shell-level mount.** New `components/BottomNav.tsx` rendered once in
  `app/layout.tsx` as a sibling of `{children}` (inside `ComparisonsProvider`).
  It's above every route and OUTSIDE the compare swipe container (the Framer
  `motion.div drag` lives deep inside `CompareWorkspace`), so swiping tabs or
  navigating can't re-mount it.
- **Active from pathname.** `usePathname()` → Home active at `/`, Compare active
  at `/compare*`. Switching only moves the gold highlight; the bar is fixed.
- **Unified the duplicate footer.** The old `MobileBottomBar` was rendered inside
  each compare pane (`MobileCompareLayout`, per swipe page) — that's the footer
  that visibly switched. Removed it from `MobileCompareLayout` and **deleted**
  `components/mobile/MobileBottomBar.tsx`. Its Home/Compare items now live in the
  single `BottomNav` (Settings placeholder dropped for now — Vision items are
  Home + Compare).
- **Fixed + safe-area aware.** Nav is `position: fixed; bottom: 0` with
  `padding-bottom: env(safe-area-inset-bottom)` and height `var(--nav-h)` (new
  token, 64px, in `globals.css`). Scrollable content reserves
  `calc(var(--nav-h) + env(safe-area-inset-bottom))`:
  - `CompareWorkspace` root gets that as `padding-bottom` (border-box → shrinks
    the pager so panels sit above the nav).
  - Home `main` gets it too (+16px breathing room).
- Compare → `/compare` opens the active/last comparison automatically (the store
  persists across routes; the workspace renders `activeComparison`), so the nav
  item is a plain `<Link href="/compare">`.

## Files
- New: `components/BottomNav.tsx`.
- Changed: `app/layout.tsx` (mount once), `app/globals.css` (`--nav-h`),
  `app/page.tsx` (bottom padding), `components/mobile/MobileCompareLayout.tsx`
  (drop `MobileBottomBar`), `components/compare/CompareWorkspace.tsx` (reserve
  nav height).
- Deleted: `components/mobile/MobileBottomBar.tsx`.

## Testing (cheap; no browser — Kobe checks seamlessness)
- `tsc --noEmit` + `eslint` clean on changed files.
- Grep-confirmed: `BottomNav` is imported/rendered exactly once (`app/layout.tsx`),
  no remaining `MobileBottomBar` references (file deleted). Nav is a layout
  sibling of `{children}` → outside the `CompareWorkspace` swipe container.
  Active state is `usePathname`-derived.

## Follow-ups
- Polish pass: floating-pill styling for the nav.
- Step 6: localStorage persistence of tabs + active id.

## Confirmation
I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.
