# Plan — Leans backtest (2025 season)

> Step 1 of [`check-datacatalog-md-and-come-vivid-bunny.md`](check-datacatalog-md-and-come-vivid-bunny.md).
> Branch `feat/data-rollout`. Kobe: "do all of it, self-check each phase".

## Goal

Grade the **current** Leans engine (unchanged) and the new formula candidates on every 2025 regular-season
game, using only data known before each game, against real closing lines. Answer: does each lean type beat
**52.4%** (break-even at −110)? Which formulas are worth wiring in?

## Shape

- `lib/leans/backtest.ts` — pure: line picking (main prop line among alternates), grading
  (W / L / push), tallies (hit %, ROI at the real price or −110), formula-candidate leans, calibration
  (actual-vs-line residual SD for margins and totals). Vitest in `lib/leans/__tests__/backtest.test.ts`.
- `scripts/leans-backtest.ts` — run with `npm run backtest:leans` (vite-node, `@/` alias). Fetches and caches
  to `.cache/leans-backtest/` (gitignored): ESPN scoreboard weeks 1–18 (scores), Core `/odds` per game
  (closing spread / total / moneyline from the first book with `details`), Core `propBets` (first book that has
  them, every page), Sleeper `api.sleeper.com` weekly lines (QB/RB/WR/TE), Sleeper player map (ESPN id → Sleeper id).
  ESPN concurrency 4 with 429 back-off; every response is cached, so a rerun makes zero calls.
- Engine reuse: `gameLeans` + `leagueForm` (team log cut to weeks < w), `propLean` with `ratingFor` on
  `buildFpaTable(lines, { pts_ppr: 1 })` cut to weeks < w — exactly the bundle's inputs.
- Prop stats graded = the five Leans stats: ESPN type 12 rush yds, 13 rec yds, 14 receptions, 20 rush+rec yds,
  31 anytime TD. Player didn't play that week → void.
- Formula candidates (report only): projected total vs line, projected margin vs spread (shrunk season PD/G
  blended with last 4 + home field), prop P(over) (normal on shrunk mean; Poisson for anytime TD), at several
  edge thresholds.
- Report → `docs/devnotes/2026-10-23-leans-backtest/report-2025.md` (generated, committed) + summary in the dev note.

## Out of scope

No change to `LEAN_CONFIG` or the engine — recommendations only. No UI.

## Self-checks

Unit tests for grading / line picking; report sanity: games counted ≈ 272, pushes only on whole lines,
favorites' cover rate ≈ 50%, residual SDs in the 10–15 range; rerun = identical report (deterministic, cached).
