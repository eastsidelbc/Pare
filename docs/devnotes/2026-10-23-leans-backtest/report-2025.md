# Leans backtest — 2025 regular season

Generated 2026-10-23 by `npm run backtest:leans` (scripts/leans-backtest.ts, lib/leans/backtest.ts).
Engine unchanged (LEAN_CONFIG: lastN 4, minGames 4); every game graded with only earlier weeks.
**Break-even at −110 = 52.4%.** ✅ = ROI above 0. ROI = units per unit staked at the real price (game spreads/totals: −110; moneylines + props: the book's price).
Props are graded on the book's **opening** line (the only pregame line ESPN keeps for a finished game) and only on sides the book priced.
Small samples swing a lot: under ~100 bets, ±10 points of hit rate is noise.

## Data

- Games: 272 finals · spread 272 · total 270 · moneyline 261 (first pregame book with a line; in-game "Live" books skipped).
- Props: 5978 main lines (5978 priced) on 193 games · graded 5968 · voided (player inactive) 10.
- Player join (ESPN athlete → Sleeper): by id 2204 · by name + team 3774 · unmatched 47 (dropped).
- Live lineup cap (top `playersPerTeam` by PPR before the week — what the app lists): 5114 of 5978 props.
- A week counts only if he played (Sleeper `gp`); an inactive week is voided, never graded as a 0.
- Player lines: 11889 Sleeper weekly rows (QB/RB/WR/TE).

## Market calibration (how good the closing line was)

| Check | Value | Pare assumes |
|---|---|---|
| Actual margin vs spread — mean / SD | 0.43 / 12.23 | SD 12.5 |
| Actual total vs line — mean / SD | 1.22 / 13.18 | SD 12.8 |
| Favorites covered | 47.8% | — |
| Home covered | 49.6% | — |
| Overs hit | 52.6% | — |
| Prop overs hit (opening main lines) | rush_yd 46.8% of 1057 · rec_yd 48.0% of 2076 · rec 46.1% of 2063 · rush_rec_yd 44.0% of 491 | — |

## Current engine — game lines

Verdicts: moneyline:none 172 · moneyline:not-enough 64 · moneyline:side 36 · spread:none 204 · spread:not-enough 64 · spread:side 4 · total:none 207 · total:not-enough 64 · total:over 1

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| moneyline | 36 | 30-6-0 | 83.3% | +3.2% ✅ |
| spread | 4 | 2-2-0 | 50.0% | -4.5% |
| total (all) | 1 | 0-1-0 | 0.0% | -100.0% |
| total over | 1 | 0-1-0 | 0.0% | -100.0% |

## Current engine — props (live lineup cap — what the app would have shown)

Verdicts: rec:none 1073 · rec:not-enough 558 · rec:over 90 · rec:under 137 · rec_yd:none 1102 · rec_yd:not-enough 557 · rec_yd:over 81 · rec_yd:under 133 · rush_rec_yd:none 256 · rush_rec_yd:not-enough 132 · rush_rec_yd:over 17 · rush_rec_yd:under 31 · rush_yd:none 538 · rush_yd:not-enough 308 · rush_yd:over 42 · rush_yd:under 59

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| props (all) | 590 | 317-273-0 | 53.7% | -2.7% |
| rec over | 90 | 45-45-0 | 50.0% | -13.4% |
| rec under | 137 | 86-51-0 | 62.8% | +12.2% ✅ |
| rec_yd over | 81 | 43-38-0 | 53.1% | -3.7% |
| rec_yd under | 133 | 71-62-0 | 53.4% | -0.8% |
| rush_rec_yd over | 17 | 6-11-0 | 35.3% | -34.0% |
| rush_rec_yd under | 31 | 16-15-0 | 51.6% | -4.8% |
| rush_yd over | 42 | 18-24-0 | 42.9% | -19.6% |
| rush_yd under | 59 | 32-27-0 | 54.2% | -1.5% |

## Current engine — props (every matched line)

Verdicts: anytime_td:not-enough 281 · rec:none 1079 · rec:not-enough 755 · rec:over 90 · rec:under 139 · rec_yd:none 1110 · rec_yd:not-enough 751 · rec_yd:over 81 · rec_yd:under 134 · rush_rec_yd:none 257 · rush_rec_yd:not-enough 185 · rush_rec_yd:over 17 · rush_rec_yd:under 32 · rush_yd:none 540 · rush_yd:not-enough 414 · rush_yd:over 42 · rush_yd:under 61

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| props (all) | 596 | 323-273-0 | 54.2% | -1.8% |
| rec over | 90 | 45-45-0 | 50.0% | -13.4% |
| rec under | 139 | 88-51-0 | 63.3% | +13.3% ✅ |
| rec_yd over | 81 | 43-38-0 | 53.1% | -3.7% |
| rec_yd under | 134 | 72-62-0 | 53.7% | -0.2% |
| rush_rec_yd over | 17 | 6-11-0 | 35.3% | -34.0% |
| rush_rec_yd under | 32 | 17-15-0 | 53.1% | -2.0% |
| rush_yd over | 42 | 18-24-0 | 42.9% | -19.6% |
| rush_yd under | 61 | 34-27-0 | 55.7% | +1.6% ✅ |

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
| formula props (all), P ≥ 0.6 | 1242 | 649-593-0 | 52.3% | -5.9% |
| formula props (all), P ≥ 0.7 | 363 | 201-162-0 | 55.4% | -2.4% |
| formula props (all), P ≥ 0.55 | 2241 | 1125-1116-0 | 50.2% | -8.9% |
| formula props (all), P ≥ 0.65 | 681 | 370-311-0 | 54.3% | -3.5% |
| formula rec_yd, P ≥ 0.6 | 435 | 212-223-0 | 48.7% | -11.2% |
| formula rec_yd, P ≥ 0.7 | 113 | 56-57-0 | 49.6% | -11.5% |
| formula rec_yd, P ≥ 0.55 | 825 | 391-434-0 | 47.4% | -12.8% |
| formula rec_yd, P ≥ 0.65 | 215 | 112-103-0 | 52.1% | -7.0% |
| formula rec, P ≥ 0.6 | 491 | 279-212-0 | 56.8% | -0.5% |
| formula rec, P ≥ 0.7 | 147 | 91-56-0 | 61.9% | +5.6% ✅ |
| formula rec, P ≥ 0.55 | 832 | 442-390-0 | 53.1% | -6.3% |
| formula rec, P ≥ 0.65 | 282 | 165-117-0 | 58.5% | +1.1% ✅ |
| formula rush_rec_yd, P ≥ 0.6 | 103 | 52-51-0 | 50.5% | -5.7% |
| formula rush_rec_yd, P ≥ 0.7 | 41 | 22-19-0 | 53.7% | -0.5% |
| formula rush_rec_yd, P ≥ 0.55 | 195 | 101-94-0 | 51.8% | -3.3% |
| formula rush_rec_yd, P ≥ 0.65 | 67 | 35-32-0 | 52.2% | -2.4% |
| formula rush_yd, P ≥ 0.6 | 213 | 106-107-0 | 49.8% | -7.4% |
| formula rush_yd, P ≥ 0.7 | 62 | 32-30-0 | 51.6% | -5.7% |
| formula rush_yd, P ≥ 0.55 | 389 | 191-198-0 | 49.1% | -8.7% |
| formula rush_yd, P ≥ 0.65 | 117 | 58-59-0 | 49.6% | -8.7% |

---
Network calls this run: 1012 · 26.4s
