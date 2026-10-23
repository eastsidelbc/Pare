# 2026-10-23 — Fantasy usage tiles (Wave A2)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md) · formulas [`lib/formulas`](../../lib/formulas)

## Why

My Team rated matchups (defense allowed) but said nothing about the player himself — no usage, no range of
outcomes. The Sleeper week lines we already fetch for the FPA table carry targets, air yards, snaps and the
weekly positional rank; snaps and ranks were being stripped before caching.

## What changed

- `lib/myteam/sleeper/statLines.ts`: `NON_SCORING` keeps `off_snp`, `tm_off_snp`, `pos_rank_ppr` (one anchored
  rule with a keep-list; every other split/snap/rank key still dropped). Cache keys `-v1` → `-v2`.
- `lib/myteam/usage.ts` (new, pure): `buildUsage(lines, rules)` → per-player weeks (league-scored pts, snaps /
  team snaps, targets / team targets, air / team air, positional rank); `pickUsage`; `summarizeUsage(weeks,
  window, position)` → pts/g, floor/ceiling (p10/p90), boom % (top-12), snap %, target share, air share, WOPR.
  Shares are sum ÷ sum over the window; Last 4 = last 4 games played (0-snap weeks skipped), `LAST_N_GAMES`.
- `lib/myteam/bundle.ts`: the 30-min FPA cache now holds `{ fpa, usage }` (same lines + scoring); the bundle
  sends only my roster's usage (`LeagueBundle.usage?`, optional so older clients / sandbox work).
- `components/myteam/UsageStats.tsx` (new): 2-column tile grid (odd count → last tile spans) in the expanded
  row (`RosterRowItem`) and the iPad pinned card (`PinnedPanel`), via `DetailContext.usage`.
- Sandbox bundle: deterministic fake usage so `/sandbox/myteam` + e2e show the tiles.
- Separate commit: stale e2e nav test (expected "Standings", nav has had "Leans" since 2026-10-14).

## Verification

- `lib/myteam/__tests__/usage.test.ts` (6): team sums, league scoring, unranked → null, sum÷sum shares, WOPR,
  QB without receiving tiles, Last 4 skipping a 0-snap week.
- Live Sleeper 2026 W6 (QB/RB/WR/TE, 267 active rows): `off_snp` 264, `tm_off_snp` 265, `pos_rank_ppr` 267.
- e2e `e2e/myteam.spec.ts`: 38 passed (phone + iPad) incl. new "usage tiles" test, ≥44px targets, no h-scroll.
- Self-review of the refreshed mockup shot caught an empty grey cell (3 columns, 4 tiles) → switched to 2 columns
  with a spanning last tile. `docs/design/my-team-p4/after/*.png` updated by the screenshot test.
- `npm run check`, `npm run test:run`.

## Risks / open

- Bundle grows by ~20 players × weeks × 9 numbers (≈ 6–8 KB raw for a full season).
- Boom % uses Sleeper's PPR rank even in half/standard leagues (Sleeper only ships `pos_rank_*` per format;
  only `pos_rank_ppr` is kept).
- Not yet in Start/Sit: the chips still compare matchups only.
