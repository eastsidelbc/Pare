# Leans backtest — 2025 regular season

Generated 2026-10-23 by `npm run backtest:leans` (scripts/leans-backtest.ts, lib/leans/backtest.ts).
Engine unchanged (LEAN_CONFIG: lastN 4, minGames 4); every game graded with only earlier weeks.
**Break-even at −110 = 52.4%.** ✅ = ROI above 0. ROI = units per unit staked at the real price (game spreads/totals: −110; moneylines + props: the book's price).
Props are graded on the book's **opening** line (the only pregame line ESPN keeps for a finished game) and only on sides the book priced.
Small samples swing a lot: under ~100 bets, ±10 points of hit rate is noise.

## Data

- Games: 272 finals · spread 272 · total 270 · moneyline 261 (first pregame book with a line; in-game "Live" books skipped).
- Props: 2204 main lines (2204 priced) on 193 games · graded 2195 · voided (player inactive) 9.
- Player lines: 11889 Sleeper weekly rows (QB/RB/WR/TE).

## Market calibration (how good the closing line was)

| Check | Value | Pare assumes |
|---|---|---|
| Actual margin vs spread — mean / SD | 0.43 / 12.23 | SD 12.5 |
| Actual total vs line — mean / SD | 1.22 / 13.18 | SD 12.8 |
| Favorites covered | 47.8% | — |
| Home covered | 49.6% | — |
| Overs hit | 52.6% | — |
| Prop overs hit (opening main lines) | rush_yd 48.6% of 414 · rec_yd 46.7% of 756 · rec 47.0% of 760 · rush_rec_yd 44.6% of 166 | — |

## Current engine — game lines

Verdicts: moneyline:none 172 · moneyline:not-enough 64 · moneyline:side 36 · spread:none 204 · spread:not-enough 64 · spread:side 4 · total:none 207 · total:not-enough 64 · total:over 1

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| moneyline | 36 | 30-6-0 | 83.3% | +3.2% ✅ |
| spread | 4 | 2-2-0 | 50.0% | -4.5% |
| total (all) | 1 | 0-1-0 | 0.0% | -100.0% |
| total over | 1 | 0-1-0 | 0.0% | -100.0% |

## Current engine — props

Verdicts: anytime_td:not-enough 99 · rec:none 389 · rec:not-enough 287 · rec:over 36 · rec:under 48 · rec_yd:none 399 · rec_yd:not-enough 280 · rec_yd:over 32 · rec_yd:under 45 · rush_rec_yd:none 89 · rush_rec_yd:not-enough 62 · rush_rec_yd:over 5 · rush_rec_yd:under 10 · rush_yd:none 215 · rush_yd:not-enough 150 · rush_yd:over 20 · rush_yd:under 29

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| props (all) | 225 | 112-113-0 | 49.8% | -10.0% |
| rec over | 36 | 18-18-0 | 50.0% | -17.4% |
| rec under | 48 | 27-21-0 | 56.3% | +1.5% ✅ |
| rec_yd over | 32 | 16-16-0 | 50.0% | -7.5% |
| rec_yd under | 45 | 24-21-0 | 53.3% | -0.4% |
| rush_rec_yd over | 5 | 3-2-0 | 60.0% | +12.2% ✅ |
| rush_rec_yd under | 10 | 3-7-0 | 30.0% | -47.3% |
| rush_yd over | 20 | 9-11-0 | 45.0% | -15.4% |
| rush_yd under | 29 | 12-17-0 | 41.4% | -24.6% |

## Formula candidates — game lines (Pare projection vs closing line)

Projected total = each offense's shrunk ppg averaged with the other defense's shrunk points allowed.
Projected margin = shrunk season point differential/game blended 0.6/0.4 with last 4, + 1.5 home field. Both teams need 4+ games.

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| formula spread, edge ≥ 1 | 166 | 89-77-0 | 53.6% | +2.4% ✅ |
| formula spread, edge ≥ 2 | 125 | 69-56-0 | 55.2% | +5.4% ✅ |
| formula spread, edge ≥ 3 | 86 | 49-37-0 | 57.0% | +8.8% ✅ |
| formula spread, edge ≥ 4 | 53 | 32-21-0 | 60.4% | +15.3% ✅ |
| formula spread, edge ≥ 5 | 28 | 16-12-0 | 57.1% | +9.1% ✅ |
| formula total, edge ≥ 1 | 165 | 83-82-0 | 50.3% | -4.0% |
| formula total, edge ≥ 2 | 117 | 54-63-0 | 46.2% | -11.9% |
| formula total, edge ≥ 3 | 75 | 36-39-0 | 48.0% | -8.4% |
| formula total, edge ≥ 4 | 51 | 26-25-0 | 51.0% | -2.7% |
| formula total, edge ≥ 5 | 34 | 15-19-0 | 44.1% | -15.8% |

## Formula candidates — props (P(over) shrunk toward the book's line)

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| formula props (all), P ≥ 0.6 | 537 | 268-269-0 | 49.9% | -9.5% |
| formula props (all), P ≥ 0.7 | 189 | 99-90-0 | 52.4% | -8.4% |
| formula props (all), P ≥ 0.55 | 886 | 426-460-0 | 48.1% | -12.4% |
| formula props (all), P ≥ 0.65 | 320 | 161-159-0 | 50.3% | -11.1% |
| formula rec_yd, P ≥ 0.6 | 174 | 89-85-0 | 51.1% | -6.5% |
| formula rec_yd, P ≥ 0.7 | 60 | 30-30-0 | 50.0% | -9.5% |
| formula rec_yd, P ≥ 0.55 | 315 | 149-166-0 | 47.3% | -12.9% |
| formula rec_yd, P ≥ 0.65 | 95 | 50-45-0 | 52.6% | -5.3% |
| formula rec, P ≥ 0.6 | 203 | 109-94-0 | 53.7% | -5.4% |
| formula rec, P ≥ 0.7 | 78 | 48-30-0 | 61.5% | +2.6% ✅ |
| formula rec, P ≥ 0.55 | 312 | 160-152-0 | 51.3% | -9.3% |
| formula rec, P ≥ 0.65 | 128 | 74-54-0 | 57.8% | -2.0% |
| formula rush_rec_yd, P ≥ 0.6 | 40 | 15-25-0 | 37.5% | -30.1% |
| formula rush_rec_yd, P ≥ 0.7 | 20 | 10-10-0 | 50.0% | -6.9% |
| formula rush_rec_yd, P ≥ 0.55 | 70 | 34-36-0 | 48.6% | -9.6% |
| formula rush_rec_yd, P ≥ 0.65 | 29 | 11-18-0 | 37.9% | -29.3% |
| formula rush_yd, P ≥ 0.6 | 120 | 55-65-0 | 45.8% | -13.9% |
| formula rush_yd, P ≥ 0.7 | 31 | 11-20-0 | 35.5% | -35.0% |
| formula rush_yd, P ≥ 0.55 | 189 | 83-106-0 | 43.9% | -17.7% |
| formula rush_yd, P ≥ 0.65 | 68 | 26-42-0 | 38.2% | -28.8% |

---
Network calls this run: 0 · 1.3s
