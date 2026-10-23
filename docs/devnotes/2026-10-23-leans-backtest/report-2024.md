# Leans backtest — 2024 regular season

Generated 2026-10-23 by `npm run backtest:leans` (scripts/leans-backtest.ts, lib/leans/backtest.ts).
Engine unchanged (LEAN_CONFIG: lastN 4, minGames 4); every game graded with only earlier weeks.
**Break-even at −110 = 52.4%.** ✅ = ROI above 0. ROI = units per unit staked at the real price (game spreads/totals: −110; moneylines + props: the book's price).
Props are graded on the book's **opening** line (the only pregame line ESPN keeps for a finished game) and only on sides the book priced.
Small samples swing a lot: under ~100 bets, ±10 points of hit rate is noise.

## Data

- Games: 272 finals · spread 271 · total 271 · moneyline 271 (first pregame book with a line; in-game "Live" books skipped).
- Props: 7495 main lines (7495 priced) on 271 games · graded 7454 · voided (player inactive) 41.
- Player join (ESPN athlete → Sleeper): by id 3496 · by name + team 3999 · unmatched 16 (dropped).
- Live lineup cap (top `playersPerTeam` by PPR before the week — what the app lists): 7293 of 7495 props.
- A week counts only if he played (Sleeper `gp`); an inactive week is voided, never graded as a 0.
- Player lines: 11770 Sleeper weekly rows (QB/RB/WR/TE).

## Market calibration (how good the closing line was)

| Check | Value | Pare assumes |
|---|---|---|
| Actual margin vs spread — mean / SD | 0.32 / 12.62 | SD 12.5 |
| Actual total vs line — mean / SD | 1.47 / 12.43 | SD 12.8 |
| Favorites covered | 53.1% | — |
| Home covered | 49.8% | — |
| Overs hit | 54.2% | — |
| Prop overs hit (opening main lines) | rec 46.2% of 2493 · rush_yd 47.7% of 895 · rec_yd 50.7% of 2062 · rush_rec_yd 49.8% of 2004 | — |

## Current engine — game lines

Verdicts: moneyline:none 176 · moneyline:not-enough 64 · moneyline:side 32 · spread:none 204 · spread:not-enough 64 · spread:side 4 · total:none 203 · total:not-enough 64 · total:over 1 · total:under 4

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| moneyline | 32 | 28-4-0 | 87.5% | +14.4% ✅ |
| spread | 4 | 3-1-0 | 75.0% | +43.2% ✅ |
| total (all) | 5 | 2-3-0 | 40.0% | -23.6% |
| total over | 1 | 1-0-0 | 100.0% | +90.9% ✅ |
| total under | 4 | 1-3-0 | 25.0% | -52.3% |

## Current engine — props (live lineup cap — what the app would have shown)

Verdicts: rec:none 1731 · rec:not-enough 435 · rec:over 96 · rec:under 186 · rec_yd:none 1363 · rec_yd:not-enough 420 · rec_yd:over 93 · rec_yd:under 131 · rush_rec_yd:none 1324 · rush_rec_yd:not-enough 441 · rush_rec_yd:over 90 · rush_rec_yd:under 116 · rush_yd:none 586 · rush_yd:not-enough 193 · rush_yd:over 36 · rush_yd:under 46

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| props (all) | 794 | 439-355-0 | 55.3% | -5.6% |
| rec over | 96 | 54-42-0 | 56.3% | -7.4% |
| rec under | 186 | 118-68-0 | 63.4% | +1.6% ✅ |
| rec_yd over | 93 | 47-46-0 | 50.5% | -13.3% |
| rec_yd under | 131 | 71-60-0 | 54.2% | -8.4% |
| rush_rec_yd over | 90 | 37-53-0 | 41.1% | -24.3% |
| rush_rec_yd under | 116 | 68-48-0 | 58.6% | +8.6% ✅ |
| rush_yd over | 36 | 16-20-0 | 44.4% | -24.7% |
| rush_yd under | 46 | 28-18-0 | 60.9% | +8.7% ✅ |

## Current engine — props (every matched line)

Verdicts: rec:none 1745 · rec:not-enough 457 · rec:over 96 · rec:under 195 · rec_yd:none 1364 · rec_yd:not-enough 472 · rec_yd:over 93 · rec_yd:under 133 · rush_rec_yd:none 1333 · rush_rec_yd:not-enough 457 · rush_rec_yd:over 90 · rush_rec_yd:under 124 · rush_yd:none 589 · rush_yd:not-enough 222 · rush_yd:over 36 · rush_yd:under 48

| Lean | Bets | W-L-P | Hit % | ROI |
|---|---|---|---|---|
| props (all) | 815 | 457-358-0 | 56.1% | -4.0% |
| rec over | 96 | 54-42-0 | 56.3% | -7.4% |
| rec under | 195 | 126-69-0 | 64.6% | +4.5% ✅ |
| rec_yd over | 93 | 47-46-0 | 50.5% | -13.3% |
| rec_yd under | 133 | 72-61-0 | 54.1% | -8.6% |
| rush_rec_yd over | 90 | 37-53-0 | 41.1% | -24.3% |
| rush_rec_yd under | 124 | 75-49-0 | 60.5% | +11.7% ✅ |
| rush_yd over | 36 | 16-20-0 | 44.4% | -24.7% |
| rush_yd under | 48 | 30-18-0 | 62.5% | +12.2% ✅ |

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
| formula props (all), P ≥ 0.6 | 2184 | 1185-999-0 | 54.3% | -7.8% |
| formula props (all), P ≥ 0.7 | 609 | 359-250-0 | 58.9% | -4.0% |
| formula props (all), P ≥ 0.55 | 3795 | 2041-1754-0 | 53.8% | -6.6% |
| formula props (all), P ≥ 0.65 | 1169 | 644-525-0 | 55.1% | -8.3% |
| formula rec_yd, P ≥ 0.6 | 584 | 322-262-0 | 55.1% | -7.4% |
| formula rec_yd, P ≥ 0.7 | 129 | 74-55-0 | 57.4% | -3.5% |
| formula rec_yd, P ≥ 0.55 | 1051 | 586-465-0 | 55.8% | -3.8% |
| formula rec_yd, P ≥ 0.65 | 281 | 154-127-0 | 54.8% | -9.0% |
| formula rec, P ≥ 0.6 | 779 | 449-330-0 | 57.6% | -6.7% |
| formula rec, P ≥ 0.7 | 255 | 171-84-0 | 67.1% | +0.4% ✅ |
| formula rec, P ≥ 0.55 | 1340 | 739-601-0 | 55.1% | -7.5% |
| formula rec, P ≥ 0.65 | 466 | 277-189-0 | 59.4% | -6.8% |
| formula rush_rec_yd, P ≥ 0.6 | 559 | 269-290-0 | 48.1% | -11.7% |
| formula rush_rec_yd, P ≥ 0.7 | 152 | 73-79-0 | 48.0% | -11.9% |
| formula rush_rec_yd, P ≥ 0.55 | 967 | 477-490-0 | 49.3% | -9.3% |
| formula rush_rec_yd, P ≥ 0.65 | 283 | 132-151-0 | 46.6% | -14.2% |
| formula rush_yd, P ≥ 0.6 | 262 | 145-117-0 | 55.3% | -4.1% |
| formula rush_yd, P ≥ 0.7 | 73 | 41-32-0 | 56.2% | -3.4% |
| formula rush_yd, P ≥ 0.55 | 437 | 239-198-0 | 54.7% | -4.4% |
| formula rush_yd, P ≥ 0.65 | 139 | 81-58-0 | 58.3% | +0.0% ✅ |

---
Network calls this run: 904 · 15.3s
