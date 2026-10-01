# Dev note — Compare quadrants (2×2 tablet/desktop) + spacing polish

**Date:** 2026-10-01
**Scope:** Compare tab — new 2×2 quadrant layout for tablet/desktop; phone unchanged.

No new data or dependencies. Pure layout/UX on top of the existing compare pieces.

---

## 1. The 2×2 quadrant layout

Phones keep the single-pane swipe. At tablet width and up, Compare now shows **up to
four comparisons at once** in a 2×2 grid, each its own stacked Offense + Defense pane,
and you can still swipe left/right — now paging between **sets of four** (store cap 8 →
at most two pages).

- `components/compare/CompareQuadrants.tsx` (new) — the grid + pager. Framer Motion drag,
  `PAGE = 4`, page dots, windowing (only the active page ±1 are mounted). Empty cells show
  a **"+" Add comparison** button; a truly empty slot (no capacity) is a faded placeholder.
- `components/compare/QuadrantMetricsButton.tsx` (new) — per-quadrant **⚙ metrics** editor.
  A small button that opens a centered modal with the existing `MetricsSelector`
  (Offense | Defense tabs), scoped to **one** comparison. Each of the four visible
  comparisons edits its own metrics directly (unlike the old single workspace-level
  FloatingMetricsButton, now removed from the desktop path).
- `components/compare/CompareWorkspace.tsx` — branches on `useIsMobile(768)`:
  phone → `CompareTabBar` + single-pane pager; tablet/desktop → `CompareQuadrants`.
  Removed the desktop `FloatingMetricsButton` + its active-comparison metric handlers
  (quadrants own their metrics now).
- `components/compare/ComparePane.tsx` — added a `quadrant?` prop; the inline branch
  renders with `variant={quadrant ? 'quadrant' : 'inline'}`.
- `components/mobile/MobileCompareLayout.tsx` — `variant` gained `'quadrant'` alongside
  `'full' | 'inline'`.

**Rotation behavior (by design):** iPad portrait (834) and landscape (1194) both get the
same 2×2 count, so rotating only *reshapes* the four cells — it doesn't change how many
you see. Clean and predictable.

---

## 2. Per-quadrant controls (× remove / ⚙ settings)

Each filled quadrant carries its own remove (×) and metrics (⚙) buttons. These went
through several iterations this session before landing:

title bars → floating bottom box → tighten → right rail (**rejected** — "not digging the
rail look") → floating box again → **rotated vertical** (× over ⚙) and moved into the gap
between the comparison and the card's right edge.

Final: a small **vertical box**, vertically centered, floating in a **reserved right gap**
so the dark-blue card shows above/below/around it instead of a solid title bar.

### Centering gotcha
The grid uses the default `align-items: stretch`, so every quadrant card stretches to the
tallest card in its row. A control box positioned `top-1/2 / -translate-y-1/2` against the
**card** therefore sat *below* the content's midpoint whenever that quadrant's content was
shorter than its (stretched) neighbor — e.g. different per-quadrant metric counts.

**Fix:** wrap the comparison content **and** the floating box together in an inner
`<div className="relative">`. The box now centers to the **content's** height, not the
stretched card. Leftover card height just shows as dark blue below the content.

---

## 3. Spacing polish — one uniform dark-blue band

The quadrant body (`MobileCompareLayout`, `variant === 'quadrant'`) now uses a **single
`GAP` value (6px)** as the dark-blue band *everywhere*: left, top, bottom, between the
Offense/Defense panels, and on each side of the control box. The panels fill most of the
card and the leftover dark blue is even on all sides.

- `padLeft = padTop = padBottom = GAP (6)`; between-panel gap = `space-y-1.5` (6px).
- `padRight = GAP + boxWidth(≈34) + GAP = 46` — reserves the right gap for the control box.
- Control box (`CompareQuadrants.tsx`): `right: 6`, so it sits centered in that 46px gap
  with a matching **6px band on both sides** (`46 − 6 − 34 = 6`).
- `full` / `inline` variants keep their original `px-3 py-2` + BottomNav bottom reserve —
  unchanged.

This replaced the earlier uneven state (top 8 / bottom 12 / left 12 / right 52) where the
box also hugged the stats. Progression this session: box hugging stats → widen gap to 52
and center box (`right: 9`) → **uniform 6px band** with panels widened on both sides.

---

## Files touched

**New (committed earlier in `b59c8d3`):** `components/compare/CompareQuadrants.tsx`,
`components/compare/QuadrantMetricsButton.tsx`

**Changed:** `components/compare/CompareWorkspace.tsx`, `components/compare/ComparePane.tsx`,
`components/mobile/MobileCompareLayout.tsx` (+ the two new files above, refined this session
for centering and the uniform 6px band).

Verified live at 1280px: four cells render, two filled comparisons sit with panels filling
the card and the ×/⚙ box centered in an even dark-blue gap on the right.
