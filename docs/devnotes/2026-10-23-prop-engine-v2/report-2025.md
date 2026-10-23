# Prop engine v2 — held-out grade, 2025

Generated 2026-10-23 by `npx vite-node --config vitest.config.ts scripts/leans-backtest-v2.ts --grade 2025` at commit `4a27577`,
frozen params hash `c627f492785a` (PROP_V2_FROZEN in lib/leans/config.ts, tuned on 2024 only).
Pre-registration: docs/plans/2026-10-23-prop-engine-v2/preregistration.md.

Rows: 2024 4835 props · 2025 3534 props (live lineup cap, played, 4+ games before, tested markets).
Props graded on the book's **opening** line at the book's price; a side the book didn't price isn't bet.

## Ship gate (per market + side, per method)

Pass = ≥ 50 decided bets · hit % above the average break-even of those bets · ROI > 0 · walk-forward ROI ≥ 0
(fails only the walk-forward → watch). p = one-sided chance of this many wins if the true hit rate were the break-even.
"Beat blanket" = ROI above "always take this side" on the same 2025 props (Kobe's label, not a gate).

| Unit | Method | Bets | W-L-P | Hit % | Break-even | ROI | Walk-forward | p | Beat blanket | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| rec:WR:over | kofn | 59 | 34-25-0 | 57.6% | 58.7% | -0.5% | 27-29-0 -17.6% | 0.569 | yes | **fail** |
| rec:WR:over | logit | 72 | 42-30-0 | 58.3% | 58.6% | -0.2% | 30-27-0 -13.6% | 0.519 | yes | **fail** |
| rec:WR:under | kofn | 63 | 37-26-0 | 58.7% | 57.6% | +2.2% | 48-28-0 +14.0% | 0.429 | no | **pass** |
| rec:WR:under | logit | 285 | 170-115-0 | 59.6% | 56.4% | +6.3% | 128-92-0 +4.3% | 0.135 | yes | **pass** |
| rec:TE:over | kofn | 119 | 66-53-0 | 55.5% | 55.7% | +0.3% | 59-55-0 -7.1% | 0.521 | yes | **fail** |
| rec:TE:over | logit | 96 | 54-42-0 | 56.3% | 57.2% | -2.1% | 40-32-0 -4.4% | 0.575 | yes | **fail** |
| rec:TE:under | kofn | 63 | 38-25-0 | 60.3% | 57.8% | +5.2% | 44-27-0 +8.6% | 0.344 | yes | **pass** |
| rec:TE:under | logit | 63 | 40-23-0 | 63.5% | 57.9% | +10.2% | 25-14-0 +12.6% | 0.186 | yes | **pass** |
| rec:RB:over | kofn | 74 | 33-41-0 | 44.6% | 56.2% | -23.0% | 39-50-0 -22.2% | 0.978 | no | **fail** |
| rec:RB:over | logit | 0 | 0-0-0 | — | — | — | 2-1-0 +5.9% | — | no | **fail** |
| rec:RB:under | kofn | 133 | 70-63-0 | 52.6% | 56.3% | -5.3% | 53-46-0 -4.6% | 0.801 | no | **fail** |
| rec:RB:under | logit | 62 | 29-33-0 | 46.8% | 58.0% | -21.1% | 73-69-0 -8.1% | 0.964 | no | **fail** |
| rec_yd:WR:over | kofn | 58 | 28-30-0 | 48.3% | 55.0% | -12.8% | 34-35-0 -11.5% | 0.847 | no | **fail** |
| rec_yd:WR:over | logit | 53 | 21-32-0 | 39.6% | 54.6% | -28.0% | 11-16-0 -26.9% | 0.985 | no | **fail** |
| rec_yd:WR:under | kofn | 255 | 130-125-0 | 51.0% | 54.4% | -6.1% | 61-48-0 +2.0% | 0.864 | no | **fail** |
| rec_yd:WR:under | logit | 71 | 41-30-0 | 57.7% | 55.8% | +4.4% | 36-28-0 +2.5% | 0.368 | yes | **pass** |
| rec_yd:TE:over | kofn | 84 | 41-43-0 | 48.8% | 53.9% | -9.5% | 35-42-0 -15.3% | 0.824 | no | **fail** |
| rec_yd:TE:over | logit | 142 | 73-69-0 | 51.4% | 53.8% | -4.7% | 57-58-0 -8.0% | 0.714 | no | **fail** |
| rec_yd:TE:under | kofn | 111 | 56-55-0 | 50.5% | 53.4% | -4.9% | 38-37-0 -4.2% | 0.735 | yes | **fail** |
| rec_yd:TE:under | logit | 0 | 0-0-0 | — | — | — | 3-4-0 -20.9% | — | no | **fail** |
| rec_yd:RB:over | kofn | 84 | 45-39-0 | 53.6% | 54.0% | -0.7% | 34-39-0 -13.4% | 0.531 | yes | **fail** |
| rec_yd:RB:over | logit | 98 | 50-48-0 | 51.0% | 53.7% | -5.1% | 21-28-0 -19.7% | 0.706 | yes | **fail** |
| rec_yd:RB:under | kofn | 95 | 51-44-0 | 53.7% | 54.1% | -1.1% | 56-40-0 +7.9% | 0.532 | yes | **fail** |
| rec_yd:RB:under | logit | 80 | 40-40-0 | 50.0% | 54.2% | -8.0% | 36-39-0 -11.0% | 0.775 | no | **fail** |
| rush_yd:RB:over | kofn | 86 | 34-52-0 | 39.5% | 53.9% | -26.8% | 39-59-0 -26.3% | 0.996 | no | **fail** |
| rush_yd:RB:over | logit | 82 | 31-51-0 | 37.8% | 54.1% | -30.4% | 17-20-0 -16.3% | 0.998 | no | **fail** |
| rush_yd:RB:under | kofn | 147 | 82-65-0 | 55.8% | 53.7% | +3.8% | 42-37-0 -1.5% | 0.304 | yes | **watch** |
| rush_yd:RB:under | logit | 72 | 37-35-0 | 51.4% | 53.3% | -3.4% | 65-56-0 +1.2% | 0.628 | no | **fail** |
| rush_rec_yd:RB:over | kofn | 96 | 42-54-0 | 43.8% | 53.5% | -17.9% | 29-36-0 -16.2% | 0.973 | no | **fail** |
| rush_rec_yd:RB:over | logit | 57 | 24-33-0 | 42.1% | 53.2% | -21.0% | 8-12-0 -24.6% | 0.954 | no | **fail** |
| rush_rec_yd:RB:under | kofn | 109 | 60-49-0 | 55.0% | 53.9% | +2.1% | 25-23-0 -3.5% | 0.404 | no | **watch** |
| rush_rec_yd:RB:under | logit | 121 | 68-53-0 | 56.2% | 53.5% | +5.0% | 48-50-0 -8.6% | 0.279 | yes | **watch** |
| rush_yd:QB:over | kofn | 0 | 0-0-0 | — | — | — | 17-32-0 -35.1% | — | no | **fail** |
| rush_yd:QB:over | logit | 0 | 0-0-0 | — | — | — | 4-10-0 -43.0% | — | no | **fail** |
| rush_yd:QB:under | kofn | 0 | 0-0-0 | — | — | — | 24-27-0 -15.0% | — | no | **fail** |
| rush_yd:QB:under | logit | 0 | 0-0-0 | — | — | — | 22-29-0 -20.2% | — | no | **fail** |

**Passed: 5** of 36 tests. Passes expected from luck alone (no-edge rules, ROI > 0 by chance, ≥ 50 bets): **≈ 9.9**.
That is no more than chance would produce — treat every pass as unproven.

## Shipped (PROP_V2_SHIP)

- rec:WR:under: logit · 170-115 · +6.3% · beat blanket: yes
- rec:TE:under: logit · 40-23 · +10.2% · beat blanket: yes
- rec_yd:WR:under: logit · 41-30 · +4.4% · beat blanket: yes

## All methods on the same 2025 props (bets · hit % · ROI)

| Unit | v1 (3 signals) | Checklist | Logistic | Always this side |
|---|---|---|---|---|
| rec:WR:over | 49 · 49.0% · -12.0% | 59 · 57.6% · -0.5% | 72 · 58.3% · -0.2% | 670 · 43.7% · -17.0% |
| rec:WR:under | 78 · 61.5% · +10.9% | 63 · 58.7% · +2.2% | 285 · 59.6% · +6.3% | 670 · 56.3% · +5.9% |
| rec:TE:over | 22 · 50.0% · -13.0% | 119 · 55.5% · +0.3% | 96 · 56.3% · -2.1% | 317 · 47.9% · -9.4% |
| rec:TE:under | 34 · 70.6% · +26.4% | 63 · 60.3% · +5.2% | 63 · 63.5% · +10.2% | 317 · 52.1% · -3.4% |
| rec:RB:over | 19 · 52.6% · -17.3% | 74 · 44.6% · -23.0% | — | 313 · 46.0% · -11.8% |
| rec:RB:under | 25 · 56.0% · -3.1% | 133 · 52.6% · -5.3% | 62 · 46.8% · -21.1% | 313 · 54.0% · +2.0% |
| rec_yd:WR:over | 43 · 55.8% · +0.3% | 58 · 48.3% · -12.8% | 53 · 39.6% · -28.0% | 691 · 46.2% · -11.9% |
| rec_yd:WR:under | 86 · 46.5% · -13.0% | 255 · 51.0% · -6.1% | 71 · 57.7% · +4.4% | 691 · 53.8% · +0.4% |
| rec_yd:TE:over | 18 · 38.9% · -29.0% | 84 · 48.8% · -9.5% | 142 · 51.4% · -4.7% | 321 · 50.8% · -4.6% |
| rec_yd:TE:under | 26 · 57.7% · +8.0% | 111 · 50.5% · -4.9% | — | 321 · 49.2% · -7.8% |
| rec_yd:RB:over | 20 · 60.0% · +10.3% | 84 · 53.6% · -0.7% | 98 · 51.0% · -5.1% | 304 · 49.7% · -7.6% |
| rec_yd:RB:under | 21 · 76.2% · +38.0% | 95 · 53.7% · -1.1% | 80 · 50.0% · -8.0% | 304 · 50.3% · -5.8% |
| rush_yd:RB:over | 27 · 48.1% · -9.5% | 86 · 39.5% · -26.8% | 82 · 37.8% · -30.4% | 406 · 46.8% · -12.7% |
| rush_yd:RB:under | 38 · 50.0% · -6.9% | 147 · 55.8% · +3.8% | 72 · 51.4% · -3.4% | 406 · 53.2% · -0.4% |
| rush_rec_yd:RB:over | 17 · 35.3% · -34.0% | 96 · 43.8% · -17.9% | 57 · 42.1% · -21.0% | 304 · 44.7% · -16.1% |
| rush_rec_yd:RB:under | 31 · 51.6% · -4.8% | 109 · 55.0% · +2.1% | 121 · 56.2% · +5.0% | 304 · 55.3% · +3.3% |
| rush_yd:QB:over | 14 · 35.7% · -33.4% | — | — | 208 · 44.2% · -16.4% |
| rush_yd:QB:under | 18 · 55.6% · -3.8% | — | — | 208 · 55.8% · +2.2% |
