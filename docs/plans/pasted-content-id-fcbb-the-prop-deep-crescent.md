# Plan — Prop engine v2 · Standings strip on Leaders · Over/under arrows

## Context

Kobe asked for three things:
1. **Prop leans that understand the matchup.** Today's rule (`lib/leans/propLean.ts`) is 3 signals, all must agree: last-4 hits, season hit share, and one opponent tier from Sleeper PPR points allowed to the position. It is the same rule for every stat and position, and it loses money (2025: 112–113, −10%; 2024: −2.7%; only "rec under" is positive in both). He wants many more formulas, universal ones plus ones tailored to the stat and position (RB receptions, RB rush yds, WR/TE rec yds…). They should use the opponent's stat-specific allowance and the player's own team context. He also wants the defense's history vs the player's role (WR1/WR2/WR3), two "mock" rows, a backtest, and an out-of-sample test.
2. **Standings on Leaders**, below the "Pare Leaders" bar and above Fantasy TOT/PPG.
3. **Colored arrows instead of o/u** on prop lines.

### Decisions (Kobe, this session)
- **Ship gate (a rule is checked per market and side, e.g. "RB receptions, under"):** tune on 2024 only, grade once on 2025, which the tuning never saw. A walk-forward through 2025 is a second check. A rule makes live leans only if it beats breakeven (52.4% at −110; actual prices where the book priced the line) on 2025 with enough bets. Every shipped rule is also **labeled** with whether it beats "always take that side" on the same props. Everything else shows as info rows, not leans. *(My reading of "ship but label it, also add must beat blanket side": both gates are computed and reported. Breakeven decides shipping. The blanket-side result is shown as a label, and rules that pass both rank first. Correct me if you meant blanket-side as a hard gate.)*
- **Combining signals:** build both ways, grade both on 2025, and ship the winner per market and side. (a) Checklist: at least K of N checks agree, with a veto when one disagrees strongly. (b) Weighted logistic score → P(over).
- **Who counts as "WR1":** the role going in, by target share on his team in the games before that week (RBs rank by touches). Never "most targets that game", which always picks the hot hand.
- **Mock rows (both):** (i) this defense's last 6 games vs the same role, run against tonight's line. (ii) This player's own games vs defenses like tonight's, against tonight's line.
- **Standings:** a compact strip of division cards that scrolls sideways; tapping a card opens `/standings`.
- **Arrows:** green ▲ for over, red ▼ for under, on prop lines only (`o85.5` / `u6.5`). Lean pills stay gold.
- **Data fixes first (approved):** see A0.

---

## Phase C — Over/under arrows (small, ships first)

- `lib/leans/format.ts`: replace `lineShort()` with `propLineParts(side, line, stat) → { dir: 'over'|'under'|null; text; spoken }`. Anytime TD keeps "TD yes / TD no" with no arrow.
- New `components/leans/PropLine.tsx`: a filled lucide `Triangle`, rotated for under, ~0.6em. `var(--green)` for over, `var(--red)` for under. The arrow has `role="img" aria-label="over"|"under"` and the number follows it, so screen readers say "over 85.5". The shape carries the meaning, so it also works for colorblind users.
- Use it in `components/leans/PropCard.tsx:66-69` and `components/leans/PropRow.tsx:56-58`.
- `docs/design-system.md` §9, rule 3: record the deliberate exception (red ▼ = under on prop lines only, always next to green ▲). Update the §9.5 prop card row to `▲ 85.5`.
- Test: in `lib/leans/__tests__/leansRender.test.ts`, the arrow's label renders and `o85.5` is gone.

## Phase B — Standings strip on Leaders (small, ships first)

- `lib/standings.ts`: add `getStandingsCached()` = `liveWithLastGood(..., unstable_cache(fetchStandings, ['standings-strip-v1'], { revalidate: 60 }))`. This is the Leaders pattern (`lib/leaders.ts:221-240`): the fetch is already `no-store` with a timeout, so nothing is nested. It keeps `/leaderboards` on ISR (a plain `getStandings()` would make the page dynamic). `/standings` keeps calling `getStandings()` and stays live.
- New `components/leaderboards/DivisionStrip.tsx` (a server component):
  - One `Link href="/standings"` card per division: a `ListCard` titled "AFC East" with 4 rows of 24px (`TeamAbbr` + W-L, ties only when they exist). The leader row is tinted.
  - Cards are ~148px wide and the strip is ~150px tall. It scrolls sideways with snap points and edge bleed, using the `FilterRow.tsx:80-92` recipe; about 2.5 cards are visible at 393px.
  - Each card has an `aria-label` that reads its standings. The strip is hidden if ESPN returns nothing.
  - It reuses `components/standings/StandingsRow.tsx` (`TeamAbbr`, `ListCard`) and `lib/standingsViews.ts` without editing them.
- `app/leaderboards/page.tsx`: add `getStandingsCached()` to the `Promise.all` and render the strip first inside `<main>`, before `FantasyBoards`. No JumpNav entry: the strip sits at the top of the page.
- Docs: add it to the design-system §9.3 page order, and add a CLAUDE.md freshness-table row (≤ ~6 min on Leaders; `/standings` stays instant).
- Verify: the `npm run build` route table still shows `/leaderboards` as ISR 5m.

---

## Phase A0 — Fix the two data bugs (approved; blocks A3)

Both are verified against `.cache/leans-backtest/2025`.
1. **Missed games are counted as 0-stat games.** 5,042 of 12,074 weekly Sleeper rows have no `gp`. Add `playedGame(line)` to `lib/leans/players.ts` (`gp > 0`, and `off_snp > 0` when present) and use it in `selectPlayers`, the backtest's `playerSeasons`, and grading (a missed game = void, the way a book voids it). The FPA table and team totals keep all rows.
2. **Most stars never get prop lines.** Only 210 of 829 rostered skill players have an `espn_id` in the Sleeper map (Chase, Nacua, Bijan and St. Brown have none). `espnToSleeper` (`lib/leans/propLinesServer.ts:42-63`) silently drops the rest. New pure module `lib/leans/athleteMatch.ts`: `buildSleeperIndex(map)` + `matchAthlete({espnId, name, position, teams}, idx)` tries the id first, then name + team + position, reusing `normalizePlayerName` / `rookieKey` from `lib/rookieMatch.ts`. Two matches = no match.
   - Live: names come from ESPN team rosters (32 calls, `unstable_cache` 24h around a `no-store` fetch with a timeout).
   - Backtest: names come from Core `seasons/{y}/athletes/{id}`, cached on disk.
   - Tests: name suffixes, accents, ambiguous names, wrong position.
3. **Backtest lineup cap:** each week, grade only the players who would make the live `playersPerTeam` cap as of that week. The report shows all props and the capped set; the gate uses the capped set.
4. **Opening game lines:** the backtest takes spread and total from the cached odds `open`, matching the opening prop lines.
5. Re-run today's engine on 2024 and 2025 → an honest baseline. Update `lib/leans/record.ts` in the same commit, and put the before/after in the dev note.

## Phase A1 — Data plumbing, roles, defense tables

- `lib/leans/types.ts`:
  - `PlayerGame` gains `team, tgt, att, snp, tmSnp, air, role`.
  - `LeansPlayer` gains `roleNow`.
  - New `type Role = 'WR1'|'WR2'|'WR3'|'TE1'|'RB1'|'RB2'` and compact tuple row types.
- `lib/leans/players.ts toPlayerGame`: keep `rec_tgt, rush_att, off_snp, tm_off_snp, rec_air_yd`. Sleeper already sends them; we drop them today.
- New `lib/leans/roles.ts`, `roleAsOf(lines, team, week, candidates)`:
  - Share = his targets on that team in the games before this week ÷ the team's targets in those games (RBs use touches = carries + targets).
  - Ranked within his position; ties break on last-3 share, then snaps.
  - Candidates: past weeks = players who played that week (known before the game). Tonight = players not tagged Out/IR/PUP/Doubtful.
  - Week 1 = null. After a trade, only games with the new team count.
- New `lib/leans/allowance.ts`:
  - `allowanceBefore(t, def, pos, week)` gives per-game rec, tgt, rec_yd, rush_att, rush_yd and rush_rec_yd, plus shrunk efficiency ratios (yds/target, catch %, yds/carry, yds/touch). Shrinking reuses `lib/formulas/stats`.
  - `rankAllowance(...)` ranks with `rankAll` from `lib/ranking` (#1 = allows the least, the same as `rating.ts`).
  - `bucketOf(rank)` → stingy / mid / generous.
  - `roleLastN(t, def, role, week, 6)`.
- New `lib/leans/tables.ts`, `buildPropTables(lines, { currentWeek, injuries })`: **one builder shared by the live app and the backtest**, so they can't drift apart. It runs on all lines before the `playersPerTeam` cap, so team totals include everyone.
- Live serving: new `/api/leans/tables` (`force-dynamic`, 10-min memory cache via `createKeyedCache`) plus a `useLeansTables()` hook. A separate endpoint means the tables aren't re-sent with every per-team bundle.
  - Budget: ≤ ~40 KB gzipped. Measure with `curl.exe -s --compressed -w "%{size_download}"` and record the size in the dev note.
- `SavedProp` gains `teamLine` and `total`, filled in `autoProps.buildGameProps` from `matchup.odds`.
- **Leak test** (`lib/leans/__tests__/asOf.test.ts`): tables built from the full season vs from weeks < w give identical roles, ranks, buckets and signal values for a week-w prop. Week-1 role = null.

## Phase A2 — Signal library (pure, tested)

`lib/leans/propSignals.ts`: `computeSignals(ctx) → SignalValue[]`. Each signal is one number `x`: + favors the over, 0 is neutral, `null` = not enough data. The checklist votes and the logistic model read the same numbers.

| Signal | x (+ = over) | Threshold grid (tuned on 2024) |
|---|---|---|
| l4Hits | overs in last 4 − 2 | 1, 2 |
| seasonHit | season over share − 0.5 | .05–.20 |
| medianEdge | (median − line) / line | .05–.20 |
| projEdge | P(over) − 0.5 from the opportunity projection | .05–.15 |
| usageTrend | ln(last-3 share ÷ season share): targets / carries / touches | .10–.30 |
| snapTrend | last-3 snap % − season snap % | .05, .10 |
| impliedTotal | team implied points (total/2 − spread/2) − his team's shrunk points per game | 1.5–4.5 |
| oppAllow | opponent's rank in this stat allowed per game to this position, rescaled to −1…+1 | .35–.65 |
| oppEff | opponent's rank in efficiency allowed (yds/target, catch %, yds/carry), rescaled the same way | .35–.65 |
| defVsRole | defense's last 6 vs this role: over-share of tonight's line − 0.5 (needs ≥ 4) | .17, .33 |
| similarDef | player's over-share vs past opponents in tonight's opponent's bucket − 0.5 (needs ≥ 3) | .17, .25 |
| passRate | his team's pass-rate rank (flipped for rush markets) | .50, .65 |
| spreadScript | rush markets: favored = +; receiving markets: getting points = + | 3, 6 |
| fpaTier | today's PPR points-allowed tier (kept for continuity) | .35, .65 |

- **Projections behind projEdge** (blend weights and shrink in config):
  - Expected targets = team targets per game × blended target share.
  - rec: λ = expected targets × catch % × opponent catch-% factor → `countOverProb`.
  - rec_yd: μ = expected targets × yds/target × opponent factor, with a pooled SD (like `replayPropFormula`).
  - rush_yd: μ = team carries × carry share × yds/carry × opponent factor.
  - rush_rec_yd: rush_yd + rec_yd.
- **Markets tested (9 × over/under = 18 units):** rec:WR, rec:TE, rec:RB, rec_yd:WR, rec_yd:TE, rec_yd:RB, rush_yd:RB, rush_rec_yd:RB, rush_yd:QB.
  - QB rush uses a reduced set: hits, median, projection, QB rush yds allowed, similar defenses, implied total.
  - Not tested (info rows only): anytime TD (priced one way only, tiny sample) and rush+rec:WR (2 lines in 2025).
- Mock rows: `defenseVsRoleMock(ctx)` → `{ role, cells[{week, opp, value, over}], avg }` and `similarDefenseMock(ctx)` → `{ bucket, games, over }`.
- `normalOverProb(line, mu, sd)` goes in `lib/formulas/player.ts`.
- Tests: `propSignals.test.ts` has one fixture per signal (direction + null case).

## Phase A3 — Backtest harness (train/test, walk-forward, pre-registration)

- Pure `lib/leans/backtestV2.ts`:
  - `buildFeatureRows(...)`: one row per prop with every signal as of that week.
  - `gradeUnits(rows, params)`: v1, checklist, logistic and blanket side, all on the same rows.
  - `walkForward(...)`: weeks 6–18 of 2025, refit on 2024 + 2025 weeks < w.
- Script `scripts/leans-backtest-v2.ts`, run as `npm run backtest:props -- --tune 2024 | --grade 2025`:
  - `--tune` loads 2024 only.
  - `--grade` reads frozen `LEAN_CONFIG.propV2`, refuses to run if `config.ts` has uncommitted changes, and stamps the commit and a parameter hash on the report.
  - Feature rows are cached in `.cache/leans-backtest/<y>/features.json`.
- **Pre-registration** `docs/plans/<date>-prop-engine-v2/preregistration.md`: signals, grids, K grid, logistic features, regularization and cutoff grids, the gate, minimum samples and the commands. It is **committed before the first `--grade`**. It also notes honestly that 2025 v1 results were already seen.
- Tuning order on 2024: (1) each signal's threshold on its own per unit (≥ 75 bets); (2) K + veto; (3) other settings with a time split inside 2024 (fit weeks 2–11, check 12–18), then refit on all of 2024.

## Phase A4 — The two ways to combine

- (a) `lib/leans/combine.ts`, `kOfN(sigs, {theta, k, veto})`:
  - N = signals that didn't sit out; a lean needs N ≥ 6.
  - K ∈ ⌈.5N⌉…⌈.8N⌉.
  - Veto = any signal pointing the other way at its most extreme threshold.
- (b) `lib/formulas/logistic.ts`, `fitLogistic` / `predictLogistic`:
  - Hand-rolled Newton/IRLS with ridge (no new dependency).
  - One model per stat, positions pooled with a per-position intercept.
  - Ridge strength ∈ {0.1, 1, 10}; inputs standardized, a missing signal = 0.
  - Lean when p̂ ≥ c or p̂ ≤ 1−c, with c ∈ {.54….60}. Cutoffs, not EV, because the 2026 feed has no prices.
  - Tests: a known fixture, separable data still converges, same output every run.
- Config `LEAN_CONFIG.propV2.markets[MarketKey] = { combiner: 'kofn'|'logit'|'off', theta, k, veto, logit? }`.
  - The script prints a snippet to paste by hand.
  - Extend `scripts/leans-gates.mjs` l3 (no numbers outside config) to the new engine files.

## Phase A5 — Report and decision

- Report `docs/devnotes/<date>-prop-engine-v2/report-2025.md`. Per unit: v1 / checklist / logistic / blanket side; bets, W-L-P, hit %, ROI at actual price, walk-forward ROI, binomial p vs 52.4%, and how many passes would be expected by luck across all 36 tests.
- **Ship gate per unit:** ≥ 50 decided bets in 2025 (≥ 75 in the 2024 tune); hit % above breakeven at the average actual price; ROI > 0; walk-forward ROI ≥ 0 (fails only this → "watch list").
- **Blanket-side label:** each shipped unit records `beatsBlanket: boolean`, shown on the prop screen's record line (e.g. "2025 held out: 38–29 · beat always-under"). Units that pass both rank first in the list.
- Pick per unit: the method that passes; if both pass, higher ROI; if tied, the checklist (easier to explain). Everything else = `'off'`. **Shipping zero units is an acceptable result**, and I'll tell you plainly if that happens.

## Phase A6 — Wire the winners into the live engine and UI

- `lib/leans/propLean.ts`: `propLean()` becomes the v2 dispatcher. `statValue` / `propHits` / `effectiveLine` stay. The v1 body moves to `_to-delete/<date>-prop-lean-v1/`.
  - `'off'` → verdict `none` + "No rule for RB receptions held up on past seasons — data only".
  - Fewer than `minGames` games → `not-enough`, as today.
- `LeanResult.of?: number`. `components/leans/ui.tsx signalsTitle` uses `of ?? LEAN_CONFIG.signalCount`, so game lines still read "3 of 3". Units that are off render their signals as info rows (`WhyList`), not ✓/✕.
- `lib/leans/evaluate.ts`: `evaluateProp(prop, bundle, tables)`, wired at the three call sites (GameScreen, LeansScreen, PropScreen) via `useLeansTables()`. Ranks are memoized per (week, position, key).
- New `components/leans/MockRows.tsx`, in `PropBody` under `TierBars`:
  - (i) "vs WR1s, last 6: LV allowed **5.8** rec · over 5.5 in **4 of 6**" plus `HitDots`.
  - (ii) "vs generous pass D's (like LV): over 5.5 in **3 of 4**".
  - Each row is hidden when there's too little data.
- `lib/leans/record.ts`: per-unit 2025 held-out records plus the blanket label. Rewrite the "How Pare makes a lean" copy.
- Tests: update `renderFixtures` + `leansRender`, keep the existing `prop: …` test names, and update the l3/l6 phrase lists.

## Phase A7 — Docs

- `docs/design-system.md` §9.5: variable signal list, mock rows, arrows.
- `DATA_SOURCES.md` §7: tables endpoint, ESPN rosters for name matching.
- `docs/data-catalog.md`: newly used fields `gp, rec_tgt, rush_att, off_snp, tm_off_snp, rec_air_yd, pass_att`.
- CLAUDE.md: Leans bullet + freshness table.
- ADR `docs/adr/<date>-prop-engine-v2.md`: out-of-sample gate, blanket label, how the method is picked.
- `CHANGELOG.md` + dev note per phase. `/privacy` doesn't change (all new fetches are server-side).

## Copy and gate traps (checked)

- `underdog` is banned anywhere under `lib/leans` and `components/leans` (case-insensitive). Parse ESPN's `underdog` key outside them and call it `getsPoints`.
- `\blocks?\b` is banned: write "frozen", never "lock".
- No sportsbook names.
- The `components/standings` diff must stay empty (import only).

## Risks

- **Overfitting** (14 signals × thresholds × 18 units × 2 methods). Mitigations: thresholds tuned one at a time, small grids, ridge, 2024-only tuning, a single 2025 grade, walk-forward, and the expected-by-luck count in the report.
- **Small samples:** e.g. 2025 RB rec ≈ 171 lines before A0. Expect 0–4 units to ship.
- **Live vs backtest lines:** live shows current lines (already moved) while the backtest uses openers, so measured edges run optimistic. Under juice around −120 = 54.5% breakeven, and 2026 is unpriced.
- **Roles:** trades, week 1, ties, and the WR2 moving up when the WR1 sits.
- **Position comes from today's Sleeper map:** stated as a caveat.
- **Phone CPU / payload:** separate tables endpoint plus memoized ranks.

## Order and commits

C → B (each its own commit + CHANGELOG + dev note) → A0 → A1 → A2 → A3 (pre-registration committed) → A4 → `--grade` once → A5 report (you read it) → A6 → A7. One branch per area: `feat/leans-arrows`, `feat/leaders-standings`, `feat/prop-engine-v2`.

## Verification

- Every phase: `npm run check`, `npm run test:run`. Before committing B/A6: `npm run build`, only after checking :4000 is free (no build while dev runs).
- C/B: `npm run dev` on :4000 and Kobe checks `/leans` and `/leaderboards` at 393px. The build route table shows `/leaderboards` ISR 5m.
- A0: `npm run backtest:leans -- 2025` and `-- 2024` before/after. Matched-prop counts rise roughly 2× and stars show up. Live check: `curl.exe -s "http://localhost:4000/api/leans/props?..."` includes Chase/Nacua lines.
- A1: `asOf.test.ts` leak test passes. `curl.exe -s --compressed -w "%{size_download}" http://localhost:4000/api/leans/tables` ≤ ~40 KB.
- A3–A5: `npm run backtest:props -- --tune 2024`, commit the pre-registration + frozen config, then `npm run backtest:props -- --grade 2025` once. The report has the commit and parameter hash.
- A6: render tests; Kobe checks a prop screen (signal list, mock rows, record label) on :4000.
