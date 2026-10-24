# Prop research v3 — search report (2024 + 2025)

Generated 2026-10-23 at commit `68af634` by `scripts/prop-search.ts --search`.
Pre-registration: docs/plans/2026-10-23-prop-search-v3/preregistration.md.

- Search rows: 8369 props (2024 + 2025) · 73 features · 17974 conditions over 18 market × side units.
- **Rules evaluated (real search): 14,140,296**; the same search ran 200 more times on shuffled results (≈ 2,828,059,200 more).
- Score = Wilson 95% lower bound of the hit rate − the unit's break-even (real prices); must clear break-even in both seasons.
- **Shuffle bar (95th percentile of the best shuffled score): 0.1310** · shuffled best: median 0.1121, max 0.1506.
- **Real best: 0.1507 · rules above the bar: 40.**
- 2 finalists frozen (≤ 3 per unit, overlap ≤ 70%) for the one 2026 holdout grade.

## Best score per unit (real search)

| Unit | Best score |
|---|---|
| rec:WR:over | 0.0601 |
| rec:WR:under | 0.1507 |
| rec:TE:over | 0.0708 |
| rec:TE:under | 0.0786 |
| rec:RB:over | 0.0072 |
| rec:RB:under | 0.1003 |
| rec_yd:WR:over | 0.0520 |
| rec_yd:WR:under | 0.0907 |
| rec_yd:TE:over | 0.1004 |
| rec_yd:TE:under | 0.0557 |
| rec_yd:RB:over | 0.0353 |
| rec_yd:RB:under | 0.0601 |
| rush_yd:RB:over | 0.0236 |
| rush_yd:RB:under | 0.0823 |
| rush_rec_yd:RB:over | 0.0307 |
| rush_rec_yd:RB:under | 0.0811 |
| rush_yd:QB:over | -0.0282 |
| rush_yd:QB:under | 0.0471 |

## Top 30 real rules

| Rule | Bets | Hit % | 2024 / 2025 | Break-even | Score | Above bar |
|---|---|---|---|---|---|---|
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND use_shareTrend >= -0.0388109 | 158 | 76.6% | 76.3% / 77.0% | 54.3% | 0.1507 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND opp_yacAllowed <= 0.612903 AND use_shareTrend >= -0.0388109 | 158 | 76.6% | 76.3% / 77.0% | 54.3% | 0.1507 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND use_shareTrend >= -0.0388109 AND opp_yacAllowed <= 0.612903 | 158 | 76.6% | 76.3% / 77.0% | 54.3% | 0.1507 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND use_shareTrend >= -0.0388109 AND opp_yacAllowed <= 0.612903 | 158 | 76.6% | 76.3% / 77.0% | 54.3% | 0.1507 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND v2_oppEff >= -0.870968 | 194 | 74.2% | 72.1% / 78.5% | 54.3% | 0.1332 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND opp_yacAllowed <= 0.612903 AND v2_oppEff >= -0.870968 | 194 | 74.2% | 72.1% / 78.5% | 54.3% | 0.1332 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND v2_oppEff >= -0.870968 AND opp_yacAllowed <= 0.612903 | 194 | 74.2% | 72.1% / 78.5% | 54.3% | 0.1332 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND v2_oppEff >= -0.870968 AND opp_yacAllowed <= 0.612903 | 194 | 74.2% | 72.1% / 78.5% | 54.3% | 0.1332 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND form_mean5 <= 0.2 | 180 | 74.4% | 71.7% / 80.0% | 54.3% | 0.1329 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND opp_yacAllowed <= 0.612903 AND form_mean5 <= 0.2 | 180 | 74.4% | 71.7% / 80.0% | 54.3% | 0.1329 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND form_mean5 <= 0.2 AND opp_yacAllowed <= 0.612903 | 180 | 74.4% | 71.7% / 80.0% | 54.3% | 0.1329 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND form_mean5 <= 0.2 AND opp_yacAllowed <= 0.612903 | 180 | 74.4% | 71.7% / 80.0% | 54.3% | 0.1329 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND game_teamRushRank >= -0.612903 | 166 | 74.7% | 73.3% / 77.0% | 54.3% | 0.1326 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND opp_yacAllowed <= 0.612903 AND game_teamRushRank >= -0.612903 | 166 | 74.7% | 73.3% / 77.0% | 54.3% | 0.1326 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND game_teamRushRank >= -0.612903 AND opp_yacAllowed <= 0.612903 | 166 | 74.7% | 73.3% / 77.0% | 54.3% | 0.1326 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND game_teamRushRank >= -0.612903 AND opp_yacAllowed <= 0.612903 | 166 | 74.7% | 73.3% / 77.0% | 54.3% | 0.1326 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND opp_catchAllowed <= 0.806452 | 190 | 74.2% | 72.4% / 77.8% | 54.3% | 0.1323 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND opp_yacAllowed <= 0.612903 AND opp_catchAllowed <= 0.806452 | 190 | 74.2% | 72.4% / 77.8% | 54.3% | 0.1323 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_catchAllowed <= 0.806452 AND opp_yacAllowed <= 0.612903 | 190 | 74.2% | 72.4% / 77.8% | 54.3% | 0.1323 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND opp_catchAllowed <= 0.806452 AND opp_yacAllowed <= 0.612903 | 190 | 74.2% | 72.4% / 77.8% | 54.3% | 0.1323 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND form_games >= 5 | 183 | 74.3% | 71.9% / 79.0% | 54.3% | 0.1321 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND form_hit5 <= 0.4 | 183 | 74.3% | 71.9% / 79.0% | 54.3% | 0.1321 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND form_hit5 <= 0.6 | 183 | 74.3% | 71.9% / 79.0% | 54.3% | 0.1321 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND form_hit5 <= 0.8 | 183 | 74.3% | 71.9% / 79.0% | 54.3% | 0.1321 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND opp_allow <= 0.806452 | 183 | 74.3% | 73.2% / 76.7% | 54.3% | 0.1321 | **yes** |
| rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND v2_oppAllow >= -0.806452 | 183 | 74.3% | 73.2% / 76.7% | 54.3% | 0.1321 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND opp_yacAllowed <= 0.612903 AND form_games >= 5 | 183 | 74.3% | 71.9% / 79.0% | 54.3% | 0.1321 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND opp_yacAllowed <= 0.612903 AND form_hit5 <= 0.4 | 183 | 74.3% | 71.9% / 79.0% | 54.3% | 0.1321 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND opp_yacAllowed <= 0.612903 AND form_hit5 <= 0.6 | 183 | 74.3% | 71.9% / 79.0% | 54.3% | 0.1321 | **yes** |
| rec:WR:under — form_hit3 <= 0.333333 AND opp_yacAllowed <= 0.612903 AND form_hit5 <= 0.8 | 183 | 74.3% | 71.9% / 79.0% | 54.3% | 0.1321 | **yes** |

## Frozen for the holdout (shippable if the holdout passes)

1. rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND use_shareTrend >= -0.0388109 — 158 bets, 76.6%
2. rec:WR:under — form_hit3 <= 0 AND opp_yacAllowed <= 0.612903 AND form_mean5 <= 0.2 — 180 bets, 74.4%

Run time: 6.0 min.
