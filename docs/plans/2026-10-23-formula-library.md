# Plan — Pare formula library (`lib/formulas/`)

> Step 0b of [`check-datacatalog-md-and-come-vivid-bunny.md`](check-datacatalog-md-and-come-vivid-bunny.md)
> (ideas + rollout waves). Status: **plan only — not started.** Branch when started: `feat/formula-library`.

## Context

The catalog ideas (Compare, Leans, Fantasy) all reduce to a handful of math building blocks: odds →
probability, normal / Poisson probabilities, small-sample shrinkage, z-scores, team efficiency ratios,
player usage shares. Building them once, pure and tested, means:

- the **backtest** (next step) can grade every formula as a candidate lean signal;
- Compare / Leans / My Team reuse one implementation (one source of truth);
- a future licensed-data swap doesn't touch them — **inputs are plain numbers, never ESPN/Sleeper
  shapes** (licensing flag 1 in the ideas plan).

Out of scope: data-layer changes, new fetches, UI, `LEAN_CONFIG` changes, hook signatures.

## Files

| File | Holds |
|---|---|
| `lib/formulas/config.ts` | **Every constant**, nothing else (same rule as `LEAN_CONFIG`): Pythagorean exponent `2.37`, NFL margin SD `13.5`, total SD `10`, home-field `1.5`, shrink `k = 4`, key numbers `[3, 7, 10, 6, 14]` / totals `[41, 44, 47, 51]`, breakeven at -110, Pare Rating weights, WOPR weights `1.5 / 0.7`, one-score margin `8` |
| `lib/formulas/stats.ts` | `mean`, `stdev` (sample), `percentile`, `zScores(values)`, `normCdf(x)` (Abramowitz–Stegun 7.1.26, err < 1.5e-7), `poissonAtLeast(k, λ)`, `shrink(n, mean, k, prior)`, `coefVar` |
| `lib/formulas/odds.ts` | `impliedProb(american)`, `noVig(pA, pB)`, `americanToDecimal`, `decimalToAmerican`, `breakevenProb(american)`, `spreadWinProb(margin)`, `totalOverProb(proj, line)`, `nearKeyNumber(line, kind)`, `edge(proj, line)` |
| `lib/formulas/team.ts` | `pythagWinPct(pf, pa)`, `pythagLuck(wins, games, pf, pa)`, `pointsPerDrive`, `explosiveRate`, `secondsPerPlay`, `fumbleRecoveryRate`, `matchupEdgeZ(offZ, defAllowedZ)`, `sosAdjust(stat, oppAllowedAvg, leagueAvg)`, `projectedMargin`, `projectedTotal`, `pareRating(zs)` |
| `lib/formulas/player.ts` | `propOverProb(line, games, prior)` (normal on shrunk μ/σ), `anytimeTdProb(λ)`, `targetShare`, `snapPct`, `airYardsShare`, `wopr`, `xfp(opps, ptsPerOpp)`, `fpoe`, `boomRate(weeklyRanks, cutoff)`, `floorCeiling(weeklyPts)` |
| `lib/formulas/__tests__/*.test.ts` | Vitest, hand-checked numbers (below) |

Reuse, don't duplicate: `parseAmericanOdds` / `parseSpreadDetails` stay in `lib/espnScoreboard.ts`
(they parse ESPN strings; `odds.ts` takes the parsed numbers). Ranking stays in `useRanking`.

## Rules

- Pure functions, typed inputs/outputs, no `any`, no I/O, no React.
- **No numeric literals outside `config.ts`** (except 0/1/100 identities) — extend
  `scripts/leans-gates.mjs l3`-style check to `lib/formulas/` or add a tiny test that scans the files.
- Guard bad input: empty arrays, zero denominators, `NaN` → return `null` (typed `number | null`),
  never throw — UI shows "—".
- JSDoc on each function: formula in one line + what it means for a fan.

## Hand-checked test values

| Function | Input | Expect |
|---|---|---|
| `impliedProb` | -110 / +150 | 0.5238 / 0.4000 |
| `noVig` | 0.5238, 0.5238 | 0.5 |
| `normCdf` | 0 / 1.96 | 0.5 / 0.9750 |
| `spreadWinProb` | 3 | Φ(3/13.5) ≈ 0.5879 |
| `pythagWinPct` | PF 400, PA 300 | ≈ 0.6641 |
| `pythagLuck` | 12 W, 17 G, PF 400, PA 300 | 12 − 11.29 ≈ +0.71 |
| `poissonAtLeast` | k=1, λ=0.5 | 0.3935 |
| `shrink` | n=2, x̄=10, k=4, prior 4 | 6 |
| `wopr` | tgt share .25, air share .30 | 0.585 |
| `nearKeyNumber` | spread 3 / 3.5 / 5 | on / near / none |
| null guards | `[]`, PF+PA = 0, odds 0 | `null` |

Plus one real-data check from a fixture: DAL 2025 PF/PA (standings fixture) → pythag wins, compared
by hand in the dev note.

## Phases (each = one commit)

1. `config.ts` + `stats.ts` + `odds.ts` + tests — what the backtest needs first.
2. `team.ts` + tests.
3. `player.ts` + tests.

## Verification

- `npm run test:run` (new tests green, nothing else changes) · `npm run check` · literal-scan test.
- No UI, so nothing for Kobe to click; the dev note lists every function with its formula.

## Docs

- `CHANGELOG.md` `[Unreleased]` → `### Added`: formula library (internal, no UI yet), date, branch,
  `See:` dev note.
- Dev note `docs/devnotes/YYYY-MM-DD-formula-library.md`: why, files, test values, risks
  (constants are NFL-average assumptions — the backtest tunes them).
- `docs/data-catalog.md` → **Formulas** section: list each shipped formula + the fields it will read.
