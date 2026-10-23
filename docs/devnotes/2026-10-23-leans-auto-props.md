# 2026-10-23 — Leans: auto-filled prop lines, typing retired (Wave B2)

Branch `feat/data-rollout` · decision (Kobe, 2026-10-23): "auto-fill only" — recorded in
[`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md) ·
data traps: [`docs/data-catalog.md`](../data-catalog.md) (propBets) · record: [`2026-10-23-leans-backtest.md`](2026-10-23-leans-backtest.md)

## Why

Typing a line was the biggest friction in Leans, and ESPN's Core feed carries ~1,000 prop lines per game. With the
lines in hand every prop-eligible player gets checked, and the list can surface every lean of the week.

## What changed

- **Data:** `lib/leans/propLines.ts` (pure): `PROP_TYPES`, `mergeOffers` / `pickMainLine` (moved from the backtest —
  one implementation; new `unpriced` option for feeds that post one unpriced line per player), `parseBookLines`
  (open + current per player per stat), `lineFor(started)`, `propIdOf` / `parsePropId`.
  `lib/leans/propLinesServer.ts` + `GET /api/leans/props?week=N` (10-min shared copy per game, last good, a failing
  game is just left out; ESPN id → Sleeper id via the player map). `lib/leans/client.ts`: `useWeekPropLines`.
- **Engine glue:** `lib/leans/autoProps.ts` — lines → the existing `SavedProp` shape (engine + views unchanged), bundle
  players only, opener after kickoff, shown side follows the lean (`evaluateAutoProp`), `sortProps`, `isLean`.
- **Screens:** List — "Your props" → **Prop leans** (all games' leaning props) + measured record line
  (`lib/leans/record.ts`). Game — leans first, rest behind "Show all N lines", `#props` anchor, honest empty/loading
  copy. Prop screen — resolves `game~player~stat` from the week's lines; Edit/Remove gone. Player screen — "See prop
  lines for X" → game `#props`. Prop card label "Line".
- **Retired** to `_to-delete/2026-10-23-typed-props/` (+ README): `propStore.ts` (+ test), `AddLineSheet`,
  `PlayerPickerSheet`, `GamePickSheet`, `AddCard`. `LeansScreen` deletes the old `pare:leans-props:v1` key once.
  `vitest.config.ts` excludes `_to-delete` (it was collecting the moved test).
- **Docs:** `/privacy` (3 storage entries, ESPN betting lines named, effective Oct 23), CLAUDE.md Leans + privacy rows,
  design-system §9.5 storage row, DATA_SOURCES §7, catalog (propBets ✅, counts), `scripts/leans-gates.mjs` l6 rewritten
  for the new flow.

## Verification

- Tests: `autoProps.test.ts` (8: 2025 split over/under + ladder, 2026 single unpriced line, opener after kickoff,
  bundle-only, sort, deterministic no-lean side, id round-trip), `leansRender` updated (+ "Show all", record note);
  backtest rerun unchanged after moving `pickMainLine` (2,204 lines, −10.0%). Full suite 63 files green.
- Live :4000, week 7 2026: `/api/leans/props?week=7` → 14 games, ~21 KB; list shows **24 prop leans**, UNDER rows read
  "u4.5 receptions · UNDER · 3 of last 4"; PIT @ NO → 15 lines, no lean, "Show all 15 lines". Screenshots reviewed at 393px.
- `node scripts/leans-gates.mjs l6`: every l6 check passes. Expected shared-check FAILs on this branch (not regressions):
  frozen `components/myteam` (Waves A2/A3 changed it on purpose), `package.json` (backtest script), port 4000 in use
  (your dev server), and the build step it skips because of that.

## Risks / open

- **Prop leans lost money in the backtest** (2025 −10%, 2024 −2.7%); they're now prominent. The record line says so;
  Kobe may prefer hiding prop leans, or tightening `LEAN_CONFIG.prop` (worst slices both years: rush / rush+rec overs).
- ~48 ESPN calls to warm a full week (shared, 10 min). Anytime TD props appear only when the book posts the market.
- Players outside the bundle cap (`playersPerTeam`) don't get props even when the book has a line.
