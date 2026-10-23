# Leans backtest — 2024 regular season

Generated 2026-10-23 by `npm run backtest:leans` (scripts/leans-backtest.ts, lib/leans/backtest.ts).
Engine unchanged (LEAN_CONFIG: lastN 4, minGames 4); every game graded with only earlier weeks.
**Break-even at −110 = 52.4%.** ✅ = ROI above 0. ROI = units per unit staked at the real price (game spreads/totals: −110; moneylines + props: the book's price).
Props are graded on the book's **opening** line (the only pregame line ESPN keeps for a finished game) and only on sides the book priced.
Small samples swing a lot: under ~100 bets, ±10 points of hit rate is noise.

## Data

- Games: 272 finals · spread 271 · total 271 · moneyline 271 (first pregame book with a line; in-game "Live" books skipped).
- Props: 3496 main lines (3496 priced) on 271 games · graded 3461 · voided (player inactive) 35.
- Player lines: 11770 Sleeper weekly rows (QB/RB/WR/TE).

## Market calibration (how good the closing line was)

| Check | Value | Pare assumes |
|---|---|---|
| Actual margin vs spread — mean / SD | 0.32 / 12.62 | SD 12.5 |
| Actual total vs line — mean / SD | 1.47 / 12.43 | SD 12.8 |
| Favorites covered | 53.1% | — |
| Home covered | 49.8% | — |
| Overs hit | 54.2% | — |
| Prop overs hit (opening main lines) | rec 47.5% of 1178 · rush_yd 46.4% of 403 · rec_yd 51.9% of 968 · rush_rec_yd 49.9% of 912 | — |

## Current engine — game lines

Verdicts: moneyline:none 176 · moneyline:not-enough 64 · moneyline:side 32 · spread:none 204 · spread:not-enough 64 · spread:side 4 · total:none 203 · total:not-enough 64 · total:over 1 · total:under 4

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| moneyline | 32 | 28-4-0 | 87.5% | +14.4% ✅ |
| spread | 4 | 3-1-0 | 75.0% | +43.2% ✅ |
| total (all) | 5 | 2-3-0 | 40.0% | -23.6% |
| total over | 1 | 1-0-0 | 100.0% | +90.9% ✅ |
| total under | 4 | 1-3-0 | 25.0% | -52.3% |

## Current engine — props

Verdicts: rec:none 819 · rec:not-enough 207 · rec:over 41 · rec:under 111 · rec_yd:none 652 · rec_yd:not-enough 213 · rec_yd:over 42 · rec_yd:under 61 · rush_rec_yd:none 606 · rush_rec_yd:not-enough 204 · rush_rec_yd:over 43 · rush_rec_yd:under 59 · rush_yd:none 267 · rush_yd:not-enough 93 · rush_yd:over 19 · rush_yd:under 24

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| props (all) | 400 | 225-175-0 | 56.3% | -2.7% |
| rec over | 41 | 26-15-0 | 63.4% | +6.7% ✅ |
| rec under | 111 | 72-39-0 | 64.9% | +6.7% ✅ |
| rec_yd over | 42 | 24-18-0 | 57.1% | -2.6% |
| rec_yd under | 61 | 31-30-0 | 50.8% | -13.2% |
| rush_rec_yd over | 43 | 15-28-0 | 34.9% | -36.1% |
| rush_rec_yd under | 59 | 36-23-0 | 61.0% | +12.2% ✅ |
| rush_yd over | 19 | 7-12-0 | 36.8% | -37.2% |
| rush_yd under | 24 | 14-10-0 | 58.3% | +15.5% ✅ |

## Formula candidates — game lines (Pare projection vs closing line)

Projected total = each offense's shrunk ppg averaged with the other defense's shrunk points allowed.
Projected margin = shrunk season point differential/game blended 0.6/0.4 with last 4, + 1.5 home field. Both teams need 4+ games.

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| formula spread, edge ≥ 1 | 170 | 91-79-0 | 53.5% | +2.2% ✅ |
| formula spread, edge ≥ 2 | 138 | 76-62-0 | 55.1% | +5.1% ✅ |
| formula spread, edge ≥ 3 | 97 | 47-50-0 | 48.5% | -7.5% |
| formula spread, edge ≥ 4 | 71 | 35-36-0 | 49.3% | -5.9% |
| formula spread, edge ≥ 5 | 43 | 20-23-0 | 46.5% | -11.2% |
| formula total, edge ≥ 1 | 153 | 91-62-0 | 59.5% | +13.5% ✅ |
| formula total, edge ≥ 2 | 102 | 59-43-0 | 57.8% | +10.4% ✅ |
| formula total, edge ≥ 3 | 59 | 30-29-0 | 50.8% | -2.9% |
| formula total, edge ≥ 4 | 40 | 19-21-0 | 47.5% | -9.3% |
| formula total, edge ≥ 5 | 22 | 9-13-0 | 40.9% | -21.9% |

## Formula candidates — props (P(over) shrunk toward the book's line)

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| formula props (all), P ≥ 0.6 | 1129 | 616-513-0 | 54.6% | -6.5% |
| formula props (all), P ≥ 0.7 | 349 | 205-144-0 | 58.7% | -0.8% |
| formula props (all), P ≥ 0.55 | 1851 | 1001-850-0 | 54.1% | -5.3% |
| formula props (all), P ≥ 0.65 | 629 | 344-285-0 | 54.7% | -7.1% |
| formula rec_yd, P ≥ 0.6 | 315 | 174-141-0 | 55.2% | -6.8% |
| formula rec_yd, P ≥ 0.7 | 78 | 41-37-0 | 52.6% | -10.1% |
| formula rec_yd, P ≥ 0.55 | 511 | 286-225-0 | 56.0% | -3.5% |
| formula rec_yd, P ≥ 0.65 | 160 | 86-74-0 | 53.8% | -10.0% |
| formula rec, P ≥ 0.6 | 408 | 237-171-0 | 58.1% | -5.1% |
| formula rec, P ≥ 0.7 | 150 | 98-52-0 | 65.3% | +3.7% ✅ |
| formula rec, P ≥ 0.55 | 670 | 372-298-0 | 55.5% | -5.7% |
| formula rec, P ≥ 0.65 | 252 | 146-106-0 | 57.9% | -6.2% |
| formula rush_rec_yd, P ≥ 0.6 | 272 | 131-141-0 | 48.2% | -11.6% |
| formula rush_rec_yd, P ≥ 0.7 | 85 | 44-41-0 | 51.8% | -4.4% |
| formula rush_rec_yd, P ≥ 0.55 | 466 | 230-236-0 | 49.4% | -9.2% |
| formula rush_rec_yd, P ≥ 0.65 | 152 | 73-79-0 | 48.0% | -11.8% |
| formula rush_yd, P ≥ 0.6 | 134 | 74-60-0 | 55.2% | +0.4% ✅ |
| formula rush_yd, P ≥ 0.7 | 36 | 22-14-0 | 61.1% | +9.4% ✅ |
| formula rush_yd, P ≥ 0.55 | 204 | 113-91-0 | 55.4% | +0.5% ✅ |
| formula rush_yd, P ≥ 0.65 | 65 | 39-26-0 | 60.0% | +7.0% ✅ |

---
Network calls this run: 0 · 1.5s
