# Prop research v3 — pre-registration (written before the search runs on real results)

Kobe 2026-10-23: "figure out the millions of possible ways possible and test them" — with the strict judge he
picked: the search must beat the same search on shuffled results, then one grade on data no formula has seen,
then week-by-week paper trading. Code: `lib/leans/research/features.ts`, `lib/leans/research/search.ts`,
`lib/leans/backtestV2.ts` (`buildFeatureRows` + features), `scripts/prop-search.ts`.

## 1. Data
- **Search set:** 2024 + 2025 regular seasons (opening book lines + prices; live lineup cap; played; ≥ 4 games
  before; the 9 tested markets of v2). Both seasons were already used by v2 — that is fine here because the
  search is judged by the shuffle test (§3) and the holdout (§4), not by these seasons.
- **Holdout:** 2026 weeks **1–6** (every game final on 2026-10-23), opening lines, **unpriced → graded at −110**.
  No 2026 outcome has been looked at: only counts (93 games, 3,159 props, 2,546 in the lineup cap) were printed
  while checking the loader.
- **Paper trading:** 2026 weeks 7+ as they finish, with the frozen finalists, never re-tuned.

## 2. The search
- ~60 features per prop (`researchFeatures`: form vs the line over 1/2/3/5/8/all games, usage + snaps, aDOT,
  air-yards share, red-zone looks, efficiency, opponent allowance / efficiency / depth / red-zone / volume ranks
  season and last 3, his role's history vs the line, game context, and the 14 v2 signals).
- Conditions: feature ≥ or ≤ each of its deciles (10…90%) on that market's search rows.
- Rules per unit (market × side = 18 units): every single condition, every pair of conditions on different
  features, and the 300 best pairs extended by every third condition.
- A rule qualifies with ≥ 150 bets, ≥ 60 in each season, and a hit rate above the unit's average break-even
  (its real prices) **in both seasons**. Score = Wilson 95% lower bound of the hit rate − that break-even.

## 3. The shuffle bar
- The identical search is re-run **200 times** with wins reshuffled among each unit's props, separately per
  season (base rates kept — the "always under" lean stays in; any real skill is removed). Seeds 1…200.
- Bar = the **95th percentile** of the best score each shuffled run found (over all 18 units).
- **Survivors** = real rules scoring above the bar.
- **Finalists** = survivors picked greedily by score, ≤ 3 per unit, ≤ 12 total, skipping any rule whose bets
  overlap an already-picked rule's by more than 70% (Jaccard). Frozen into `lib/leans/research/finalists.ts`
  and committed before the holdout grade.
- No survivors → the 10 best real rules are frozen and graded on the holdout **for information only**
  (never shippable).

## 4. The holdout grade (once)
- **Primary test:** all finalists' bets pooled (one bet per prop + side; a prop two finalists point opposite ways
  is skipped): hit rate above 52.38% (−110 break-even) with one-sided binomial p < 0.05, **and** ROI > 0.
- Per rule: W-L, hit %, ROI at −110 (reported; ≥ 20 bets to be called a result).
- Only if the primary test passes may any finalist become a live lean, and only with Kobe's go-ahead; each also
  needs ≥ 20 holdout bets above 52.38%. Otherwise everything stays info-only.

## 5. Commands
```
npx vite-node --config vitest.config.ts scripts/prop-search.ts --search            # 2024+2025, real + 200 shuffles → finalists
git commit (finalists.ts + search report)
npx vite-node --config vitest.config.ts scripts/prop-search.ts --holdout 2026 6    # once
npx vite-node --config vitest.config.ts scripts/prop-search.ts --paper 2026 <week> # each finished week ≥ 7
```

## 6. Honest caveats
- 2026 holdout is small (6 weeks) and unpriced; real prices on unders are often worse than −110.
- Opening lines only; the app shows current lines.
- Rules are fixed thresholds on 2024–2025 distributions; a feature whose scale shifts in 2026 can misfire.
