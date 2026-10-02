# Compare quadrants — edge close-tab + metrics locked to defaults (2026-10-01)

Rationale-only; see `CLAUDE.md`. Tablet/desktop quadrant view only (phone unchanged).

## What changed
- **Removed the floating right-gutter control box** (the vertical `× / ⚙` box).
- **Close (×) is now a bookmark tab fused to each card's right edge** — rendered
  *outside* the card's `overflow-hidden` box (in a new `relative` wrapper) so it can
  jut out ~10px without being clipped. Rounded only on its outer corners.
- **Reclaimed the gutter:** `MobileCompareLayout` quadrant `padRight` dropped from
  `GAP+34+GAP` (46) to `GAP` (6) — panels now fill the width with a uniform 6px band.
- **Retired the ⚙ metrics button** (`QuadrantMetricsButton`): quadrants show each
  comparison's default metric set. `MobileCompareLayout` already ignored metric-change
  callbacks in quadrant mode, so this was the only editor there. Metric editing is
  unaffected on phone / the workspace.

## Files
- `components/compare/CompareQuadrants.tsx` — Quadrant cell restructured (outer
  `relative h-full` wrapper + edge tab); `QuadrantMetricsButton` import removed;
  `shell` gained `h-full` so cards keep equal row heights.
- `components/mobile/MobileCompareLayout.tsx` — quadrant `padRight` = `GAP`.
- `components/compare/QuadrantMetricsButton.tsx` — now **orphaned** (no importers).
  Pending removal (stage to `_to-delete/` or delete manually).

## Tunable
Tab position/size live in the button's inline style in `CompareQuadrants.tsx`
(`top: 14`, `right: -10`, `width: 22`, `height: 30`, `borderRadius`). Kobe verifies
the look himself; adjust there.

## Verified
Edited via filesystem bridge — not built here. `git pull` on the Mac mini →
`npm install` → `npm run build` → `pm2 restart pare` to see it; `npm run check` to
confirm types/lint.
