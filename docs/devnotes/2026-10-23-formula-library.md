# 2026-10-23 — Pare formula library (`lib/formulas/`)

Branch `feat/data-rollout` · plan [`docs/plans/2026-10-23-formula-library.md`](../plans/2026-10-23-formula-library.md)
· ideas [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md)

## Why

The data-catalog ideas (Compare metrics, Leans edges, fantasy usage) all reduce to a few math blocks.
Built once, pure and tested, so the Leans backtest can grade them and every screen reuses one version.
Inputs are plain numbers — never ESPN/Sleeper shapes — so a licensed-data swap doesn't touch them.

## What changed

| File | Functions |
|---|---|
| `lib/formulas/config.ts` | `FORMULA_CONFIG` — every constant (Pythag 2.37, margin SD 13.5, total SD 10, HFA 1.5, shrink k 4, key numbers, -110, WOPR 1.5/0.7, Pare Rating weights, blend 0.6/0.4, boom rank 12, floor/ceiling p10/p90, erf coefficients) |
| `lib/formulas/stats.ts` | `mean`, `stdev`, `percentile`, `zScores`, `erf`, `normCdf`, `poissonPmf`, `poissonAtLeast`, `shrink`, `coefVar`, `ratio` |
| `lib/formulas/odds.ts` | `impliedProb`, `noVig`, `americanToDecimal`, `decimalToAmerican`, `breakevenProb`, `spreadWinProb`, `coverProb`, `totalOverProb`, `nearKeyNumber`, `edge`, `expectedValue` |
| `lib/formulas/team.ts` | `pythagWinPct`, `pythagWins`, `pythagLuck`, `pointsPerDrive`, `explosiveRate`, `secondsPerPlay`, `fumbleRecoveryRate`, `turnoverDiff`, `matchupEdgeZ`, `sosAdjust`, `blendForm`, `projectedMargin`, `paceFactor`, `projectedTotal`, `pareRating`, `oneScoreRecord` |
| `lib/formulas/player.ts` | `hitRate`, `propOverProb`, `countOverProb`, `anytimeTdProb`, `targetShare`, `snapPct`, `airYardsShare`, `wopr`, `xfp`, `fpoe`, `boomRate`, `floorCeiling` |
| `lib/formulas/__tests__/*` | 39 tests: hand-checked values, null guards, and `literals.test.ts` (fails on any number outside config except 0/1/2/100; the scanner itself is tested) |

Rules: bad input returns `null` (UI shows "—"), nothing throws; ESPN string parsing stays in
`lib/espnScoreboard.ts` (`parseAmericanOdds`, `parseSpreadDetails`).

**Correction to the ideas plan:** projected margin is `ratingA − ratingB ± home field` (SRS style), not
`(PD_A − PD_B)/2` — point differential per game already measures "points better than an average team".

## Verification

- `npx vitest run lib/formulas` → 39 passed. `npm run check` clean.
- Self-check caught two of my own bugs: a hand-computed no-vig test value (−218/+180 → 0.6575, not 0.6634)
  and a literal-scanner regex that missed `13.5` (rewritten to match every number, with a scanner test).
- Real data (ESPN standings 2025, live 2026-10-23): DAL 7-9-1, PF 471 / PA 511 → Pythagorean 7.68 wins,
  luck −0.18. Luckiest DEN 14-3 (pyth 10.99, +3.01); unluckiest KC 6-11 (pyth 9.49, −3.49).
  League luck sums to +0.78 (≈ 0, as it should).

## Risks / open

- Constants are NFL-average assumptions; the backtest (next step) should tune margin/total SD and the blend.
- `propOverProb` assumes a normal distribution — yardage is right-skewed (big plays), so overs on low lines
  may read a bit high. The backtest will show it; a log-normal is the upgrade path.
- Nothing calls these yet; screens wire them in later waves.
