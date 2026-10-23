# Prop engine v2 — pre-registration (written before the 2024 tune; committed before the 2025 grade)

Plan: `docs/plans/pasted-content-id-fcbb-the-prop-deep-crescent.md` (A2–A5). Code: `lib/leans/propSignals.ts`,
`lib/leans/tables.ts`, `lib/leans/roles.ts`, `lib/leans/combine.ts`, `lib/formulas/logistic.ts`,
`lib/leans/backtestV2.ts`, `scripts/leans-backtest-v2.ts`. Everything below is fixed **before** any
2025 prop row is graded by v2. Changing any of it after the grade would make the 2025 result in-sample.

## 1. Data
- Seasons: tune = **2024** regular season only; held-out grade = **2025** regular season, graded **once**.
- Props: ESPN book main lines, **opening** line + opening price (ESPN BET feed; `pickMainLine` = priced offer
  closest to even). Opening game spread / total for game context.
- Graded rows: only players the live app would have listed that week (`lineupCapSet`), who **played** that week
  (inactive = voided), with ≥ 4 played games before the week, in a tested market (§2).
- Grading: strictly past the line wins, on the line pushes; ROI at the book's actual price; a side the book
  didn't price isn't bet.

## 2. Units (18)
Markets: `rec:WR`, `rec:TE`, `rec:RB`, `rec_yd:WR`, `rec_yd:TE`, `rec_yd:RB`, `rush_yd:RB`, `rush_rec_yd:RB`,
`rush_yd:QB` × over / under. Not tested (info rows only): anytime TD (priced one way, tiny sample),
rush + rec yds for WRs (2 lines in 2025), QB passing (not in the feed).

## 3. Signals (14) — x > 0 favors the over; null = sits out
| Signal | x | θ grid |
|---|---|---|
| l4Hits | overs in last 4 − 2 | 1, 2 |
| seasonHit | season over-share − 0.5 | .05 .10 .15 .20 |
| medianEdge | (median − line) / line | .05 .10 .15 .20 |
| projEdge | P(over) − 0.5 (team volume × his blended share × his shrunk rate × the defense's rate factor; Poisson for receptions, normal σ = cv·μ for yards, cv measured on 2024: rec yds .70, rush yds .64, rush+rec .56) | .05 .08 .10 .15 |
| usageTrend | (last-3 share − season share) / season share (targets; carries for rush; touches for rush+rec) | .10 .20 .30 |
| snapTrend | last-3 snap % − season snap % | .05 .10 |
| impliedTotal | (total / 2 − his spread / 2) − his team's shrunk points per game | 1.5 3 4.5 |
| oppAllow | defense's rank in this stat allowed per game to his position, −1 (allows least) … +1 (most) | .35 .50 .65 |
| oppEff | same on efficiency allowed (catch %, yds / target, yds / carry, yds / touch) | .35 .50 .65 |
| defVsRole | defense's last ≤ 6 games vs his role (role going in): over-share of tonight's line − 0.5; needs ≥ 4 | .17 .33 |
| similarDef | his own over-share vs past opponents in tonight's opponent's bucket (ranks 1–10 / 11–22 / 23–32) − 0.5; needs ≥ 3 | .17 .25 |
| passRate | his team's pass-rate rank scaled (pass-heavy +; flipped for rush markets) | .50 .65 |
| spreadScript | rush markets: −spread (favored +); receiving: +spread (getting points +) | 3 6 |
| fpaTier | today's PPR points-allowed tier rank scaled (the v1 matchup signal) | .35 .65 |

All signals are computed for every market (my call: no hand-picked subsets per market — a signal without data
sits out, e.g. defVsRole for QBs). Every signal reads only games before the prop's week
(`buildPropTables(lines, week)`; leak test `lib/leans/__tests__/propSignals.test.ts`).

## 4. Rule A — checklist (K of N)
1. Per unit, each signal's θ alone: the grid value with the best 2024 ROI when betting the unit's side on that
   signal's vote, with ≥ 75 bets. A signal with no qualifying θ doesn't vote for that unit.
2. N = voting signals with data (a lean needs N ≥ 6). Side leans if votes ≥ ⌈k·N⌉, k ∈ {.3 .4 .5 .6 .7}, and
   veto ∈ {off (more votes than the other side), on (no votes against)} — best 2024 ROI with ≥ 75 bets.

## 5. Rule B — logistic
One model per stat (positions pooled, one offset per position), all 14 signals standardized on the training rows
(missing = the mean), ridge λ ∈ {0.1, 1, 10} chosen by log-loss on a two-way week split of 2024 (weeks ≤ 11 ↔
≥ 12); cutoff c ∈ {.54 .56 .58 .60} per unit on the cross-fitted 2024 predictions (best ROI, ≥ 75 bets); final
weights refit on all of 2024. Over if P ≥ c, under if P ≤ 1 − c. Pushes excluded from fitting.

## 6. Ship gate (per unit, per rule) — on 2025
- ≥ **50** decided bets;
- hit % **above the average break-even** of the prices actually bet, and **ROI > 0**;
- walk-forward (weeks 6–18 of 2025, each week refit on 2024 + earlier 2025 weeks, all of §4–§5 re-run) ROI ≥ 0 —
  failing only this = "watch", not shipped.
- Both rules pass → the higher 2025 ROI ships; tie → the checklist. Neither → the unit is **off** (data rows only).
- Reported, not gated (Kobe, 2026-10-23: "ship but label it"): whether the rule beat **"always this side"** on the
  same 2025 props; one-sided p-value vs the break-even; the number of passes **expected from luck alone**.
- Shipping **zero** units is an acceptable, reportable result.

## 7. Commands
```
npx vite-node --config vitest.config.ts scripts/leans-backtest-v2.ts --tune 2024    # writes PROP_V2_FROZEN
git commit (config.ts + this file)
npx vite-node --config vitest.config.ts scripts/leans-backtest-v2.ts --grade 2025   # once; writes report + PROP_V2_SHIP
```

## 8. Honest caveats (stated up front)
- **2025 is not perfectly unseen**: the v1 engine's 2025 results (and the A0 re-run) were looked at while designing
  these signals. No v2 signal or grid was tuned on 2025 data.
- Opening lines only (closing prop lines aren't kept); live shows current lines, so live results may be worse.
- 36 tests (18 units × 2 rules) with a "ROI > 0" gate: a no-edge rule passes about a third of the time by luck. The
  report prints the expected luck count next to the actual passes.
- Position is position-at-week from Sleeper rows; roles for a past week use who played that week (inactives are
  public before kickoff).
