# 2026-10-23 — Leans player screen: season game log (Wave C1, first slice)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md) (Wave C "player pages")

## Why

The player screen showed only the last 4 games of one stat; the bundle it already loads carries every game. A full log
is the core of a player page and costs nothing.

## What changed

- `GameLog` (exported, pure) in `components/leans/PlayerVsDefenseView.tsx`: `role="table"` grid, 32px rows, week ·
  opponent (team color abbr) · rush yds · rec · rec yds · TDs (muted when 0), newest first; above the props link.

## Verification

- `leansRender` test: one row per game + header, newest week first. Leans copy test green.
- Real player (PIT RB, id 8228) at 393px: 6 games + header, no horizontal scroll; screenshot reviewed.

## Not done (Wave C remainder)

A standalone player page (ESPN gamelog/splits/career, QBR, contracts, depth chart) for Leaders is still open — it needs
new endpoints and a new route; this slice reuses the Leans player screen.
