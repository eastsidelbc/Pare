# 2026-10-23 — Leans backtest (2024 + 2025)

Branch `feat/data-rollout` · plan [`docs/plans/2026-10-23-leans-backtest.md`](../plans/2026-10-23-leans-backtest.md)
· full reports: [`report-2025.md`](2026-10-23-leans-backtest/report-2025.md), [`report-2024.md`](2026-10-23-leans-backtest/report-2024.md)

## Why

Before adding any lean signal, measure the ones we have. A lean engine under 52.4% (break-even at −110)
loses money for anyone who follows it — and we couldn't tell users a record.

## What changed

- `lib/leans/backtest.ts` (pure): main-line picking (merges ESPN's split over/under items, skips the
  unpriced alternate ladder), grading (W/L/push), tallies (hit %, ROI at the real price), engine replay
  (`gameLeans` / `propLean` **unchanged**, same "weeks before" cut as the screens), formula candidates
  (lib/formulas), market calibration. 13 tests.
- `scripts/leans-backtest.ts` + `npm run backtest:leans [-- 2024] [--refresh]` (vite-node): fetches and
  caches to `.cache/leans-backtest/<season>/` (gitignored, now in `.gitignore`), writes the report.
  First run ≈ 600 calls / 15 s, reruns 0 calls.
- `lib/formulas/config.ts`: `marginSd` 13.5 → **12.5**, `totalSd` 10 → **12.8** (measured, see below).

## Results (closing game lines; props on the book's opening line)

| Signal | 2025 | 2024 | Read |
|---|---|---|---|
| Engine moneyline | 30-6 · +3.2% | 28-4 · +14.4% | Only lean profitable in both seasons (68 bets, ≈ +8.5%). Mostly heavy favorites. |
| Engine spread | 2-2 | 3-1 | 4 leans a season — too rare to judge |
| Engine total | 0-1 | 2-3 | Same |
| Engine props (all) | 112-113 · −10.0% | 225-175 · −2.7% | Below break-even both seasons |
| Engine "rec under" | +1.5% (48) | +6.7% (111) | Only prop slice positive twice — thin |
| Formula spread, edge ≥ 3 | 49-37 · +8.8% | 47-50 · −7.5% | 2025 was noise |
| Formula total, edge ≥ 1 | −4.0% | +13.5% | Flips — noise |
| Formula prop P(over), all | −9.5% (P≥.6) | −6.5% (P≥.6) | Doesn't beat the book |

Calibration (closing line vs result): margin SD 12.23 / 12.62, total SD 13.18 / 12.43; favorites covered
47.8% / 53.1%; overs 52.6% / 54.2%. Prop overs on opening main lines 45–52% (books shade props a bit high — normal).

## Decisions taken (no engine change)

- **Don't ship Pare projections as a lean or an "edge" chip.** Closing lines are sharp; our shrunk-PD margin
  and blended totals don't beat them out of sample. Showing an "edge" would mislead.
- **Leans additions = market-derived facts only** (no-vig win %, line movement, key numbers, weather): true
  by construction, no prediction claim. That's what Wave B builds.
- `LEAN_CONFIG` untouched (plan rule: report only). Recommendation for Kobe: props leaned −10% / −3%; consider
  hiding prop leans on rush/rush+rec overs (worst slices both years) or adding a public record line.

## Self-check (bugs found and fixed before trusting any number)

1. First run showed props at 73.5% / +39.5% ROI — too good. Cause: ESPN splits one main line into an over
   item and an under item, and the unpriced items are an alternate-line **ladder**; my parser took the ladder
   median. Fix: merge by target, ignore unpriced offers.
2. On finished games ESPN's prop `current` keeps moving **after kickoff** (Dak W1 rush 7.5 → 3.5, updated hours
   after the final) — grading on it leaks the result. Fix: grade on `open` (pregame).
3. Anytime TD "under" isn't offered by the book — grading it at −110 inflated results (86%). Fix: a side
   without a price is never graded.
4. "ESPN Bet - Live Odds" (provider 59) carries in-game lines (a final showed DAL −4.5, +2000). Skipped by name.
   **Same trap in Home's closing-line fallback** (`lib/schedule.ts` reads `items[0]`, which can be DraftKings
   with no `details` on old games, or a Live book) — fixed in the odds wave.

## Risks / open

- Two seasons, small lean counts: everything under ~100 bets is ±10 points of noise.
- Prop grading uses opening lines (closing isn't kept); closing would be sharper, so real-world results are
  likely a bit worse than shown.
- Anytime TD: only 99 priced lines in 2025, all in "not enough games" weeks — not graded.
