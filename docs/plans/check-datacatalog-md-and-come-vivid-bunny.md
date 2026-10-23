# Pare — ideas from the data catalog (Compare · Leans · Fantasy · Money)

## Context

Kobe asked: read `docs/data-catalog.md` and come up with clever formulas / algorithms / features —
what we can compare, how the data could make money, and especially how it can sharpen **Leans**
(betting) and **Fantasy**. The catalog shows we use **~7% of ESPN fields and ~10% of Sleeper's**;
a lot of high-value data is *already downloaded* (box-score summary, Sleeper weekly rows) and just
not read. Everything below is buildable from the endpoints in the catalog unless marked otherwise.

Ground rules this respects: Leans copy rules (§9.5 — "data leans", never "lock", no sportsbook
names), the 3-signals-must-agree lean rule (`lib/leans/config.ts`), client-side ranking, data layer
changes need their own plan + Kobe's OK.

---

## ⚠️ Flags first (speak-up rule)

1. **Blocker — money needs a licensed data provider.** ESPN is unofficial; Sleeper is
   *non-commercial only*. No ads/Pro/affiliate until we swap to a licensed feed. Formulas we write
   are ours; the raw numbers aren't. Design every formula below to read from the data layer
   (`lib/espnStats`, `lib/fantasy`, …) so a provider swap doesn't touch them.
2. **Strong — sportsbook affiliate money conflicts with our own rule.** §9.5 bans sportsbook names/logos.
   Affiliates also need state affiliate licensing and App Store gambling rules (needs Pare LLC).
   Recommend: decide this *after* Phase S, not now.
3. **Strong — before adding more lean signals, backtest the ones we have.** We have the full 2025
   season. Without a backtest, every new signal is a guess and we can't tell users the hit rate.
   Breakeven at -110 is **52.4%** — a lean engine below that is worse than a coin flip after vig.

---

## 1. Compare — new things to compare (formulas)

| Idea | Formula | Data (catalog §) | Effort |
|---|---|---|---|
| **Pythagorean wins + "Luck"** | `pyth% = PF^2.37 / (PF^2.37 + PA^2.37)`; `luck = actual W − pyth% × G` | Standings PF/PA (**already fetched**) | Small |
| **Points per drive** (best single efficiency stat) | `points / Σ totalDrives` (box scores) | Summary `totalDrives` (already summed for L4) | Small |
| **Explosive play rate** | `(passingBigPlays + rushingBigPlays) / totalOffensivePlays` | Core team stats | Small |
| **Red-zone TD %** / **4th-down %** / **turnover diff** | direct fields | Core `miscellaneous` | Small |
| **Pace** (drives totals) | `plays / G`, `possessionTimeSeconds / plays` = seconds per play | Core | Small |
| **Opponent-adjusted (SOS) stats** | `adj = team_stat − mean(opp's season allowed of each opponent faced) + league_mean` | Box-score game log + `/statistics/900` | Medium |
| **Matchup edge (z-score)** | `z = (x − μ32)/σ32`; `edge = z(A off) − z(B def allowed)` → "A's pass O vs B's pass D: +1.8σ" | Existing offense/defense rows | Small (pure math in a hook) |
| **Trend arrows** | `L4 per-game − season per-game`, shown as ↑/↓ when `|Δ| > 0.5σ` | L4 already built | Small |
| **Turnover luck** | `fumble recovery % = fumblesRecovered / (own + opp fumbles)` → regresses to ~50% | Core `general` | Small |
| **Pare Rating** (own power index) | weighted z: net yds/play (.30) + pts/drive (.30) + TO diff/G (.15) + 3rd-down % (.10) + RZ TD % (.15), offense − defense allowed | above | Medium |
| **Home/road + one-score record** | records splits; `|margin| ≤ 8` from scoreboard finals | Teams record, scoreboard | Small |

Fun "stat nerd" extras: **ref crew penalty rate** (`gameInfo.officials` + box-score penalties per game,
grouped by referee) · **surface** (`venue.grass`) splits · **travel** (venue address → miles + time
zones crossed, West-coast team at 1pm ET).

---

## 2. Leans — make the betting side smarter

### 2a. Read the market correctly (no new data)
- **Implied probability:** `p = 100/(odds+100)` if odds > 0, else `−odds/(−odds+100)`.
  **No-vig:** `p_A / (p_A + p_B)`. Show "Market: 62% KC".
- **Spread → win %:** `P(win) = Φ(margin / 13.5)` (NFL final-margin SD ≈ 13.5).
  **Total → over %:** `Φ((proj − line) / 10)`.
- **Key numbers:** flag spreads on/near **3, 7, 10, 6, 14** and totals near **41, 44, 47, 51**
  ("line sits on 3 — half a point matters here").

### 2a+. Betting odds we can get (probed live 2026-10-23, event 401873009)
- **Game lines (Core `/odds`):** spread, total, moneyline, over/under prices, each with **open + current**
  (+ close after the game). Today only DraftKings comes back for an upcoming game (catalog says 3 books
  on finals). This game's home spread went **-3 → +4.5** — line movement is real signal.
- **Player + game props (Core `/odds/100/propBets`, paged, ~1,044 per game, `limit=1000` = 2 pages):**
  pass/rush/rec yards, receptions, completions, attempts, INTs, longest, rush+rec, kicking, milestones,
  1st-half/quarter lines, team totals. Each = `athlete $ref` + `open.target` + `current.target` + `lastUpdated`.
  **2026: no prices** (assume -110) and **TD-scorer markets empty**. 2025 ESPN BET: ~200 props carry
  over/under prices and Anytime TD = 0.5. Several lines per player+market (alternates) — pick the main one.
- **Futures (`/futures`):** MVP, OPOY, DPOY, ROY, Super Bowl, conference, division, season-yardage markets.
- **Live (`/probabilities`):** per-play cover % and over % in-game.
- **History exists:** finished 2025 game `401772694` still serves 3 books; **ESPN BET (id 58) has ~1,105
  prop lines** (open + current, `lastUpdated` = pregame). The upcoming 2026 game has props only on
  DraftKings (id 100). → **Never hardcode a provider id**; discover it from the `/odds` list
  (first book whose `propBets` link exists).
- Caveats: unofficial ESPN mirror of a sportsbook feed; §9.5 means we show "Line", never the book name;
  commercial use needs a licensed odds feed.

### Decisions (Kobe, 2026-10-23)
- **Prop lines = auto-fill only.** Typing goes away; the line is always ESPN's current line, labeled
  "Line" with an "as of <time>" stamp. Consequences to handle in that item's plan:
  `lib/leans/propStore.ts` + `pare:leans-props:v1` → `_to-delete/`, `/privacy` updated (less stored);
  players with no ESPN line show "No line yet"; **Anytime TD has no line in the 2026 feed (TD-scorer
  markets empty)** → either drop the Anytime TD prop or keep the fixed 0.5 line (it never varies) —
  recommend keeping 0.5, since `anytimeTdLine` already is a constant.
- **First build = backtest harness.**

### 2b. Pare's own projection (gives an *edge*, not just a hit-rate)
- **Projected margin:** `((A PD/G) − (B PD/G)) / 2 + HFA(≈1.5)` — better: use SOS-adjusted PD and
  blend season + L4: `0.6·season + 0.4·L4`.
- **Projected total:** `((A ppg + B ppg allowed)/2 + (B ppg + A ppg allowed)/2) × pace factor`,
  `pace = (A plays/G + B plays/G) / (2 × league plays/G)`.
- **Edge = Pare projection − line.** Could become the 3rd signal on spreads/totals, or a separate
  "edge" chip that never changes the 3-signal rule.
- **Small-sample shrink (early season):** `est = (n·x̄ + k·league_mean)/(n + k)`, k ≈ 4 games —
  fixes week 2–5 extremes better than a hard `minGames` cut.

### 2c. Data we have but don't use
| Signal | Why it matters | Source |
|---|---|---|
| **Line movement** open → current, 3 books | "moved 2.5 toward DAL since open"; disagreement between books | Core odds (fetched today, only 1 field read) |
| **ESPN predictor / FPI** | Second-opinion win % + projected margin; "ESPN's model agrees" chip | Core predictor, powerindex |
| **Weather** (wind gust, precip) | Wind > 15 mph → totals + passing props down | Summary `gameInfo.weather` (pregame only) |
| **Indoor / grass** | dome teams' totals | `venue.indoor`, `venue.grass` |
| **Rest days** | short week (TNF), off a bye | schedule dates (already have) |
| **QB injury / starter change** | biggest single line mover | Sleeper `injury_status`, ESPN depth chart |
| **Live cover / over %** | in-game "lean tracker" | Core probabilities `spreadCoverProbHome`, `totalOverProb` |

### 2d. Player props — from hit-rate to a distribution
- **P(over) for yards:** `1 − Φ((line − μ)/σ)` with μ, σ from the player's games (shrunk to position
  mean). Show "avg 72 · line 64.5 · cushion +7.5 · 68% over".
- **Usage projection:** `rec yds ≈ targets/G × yds/target × matchup mult`, where
  `targets/G = target share × team pass att/G`, `matchup mult = opp yds allowed to position / league avg`.
- **Anytime TD:** Poisson — `P(≥1) = 1 − e^(−λ)`, `λ = blend(player TD/G, RZ share × opp RZ TD allowed)`.
- **Receptions:** Poisson on `targets × catch rate`.
- **Consistency:** coefficient of variation `σ/μ` → "steady" vs "boom/bust" tag.
- New keys needed (all in the weekly rows we already fetch): `rec_tgt`, `off_snp/tm_off_snp`,
  `rec_air_yd`, `rec_rz_tgt`, `rush_rz_att`, `rush_att`.

### 2e. Trust feature — public Leans record
- Grade every past **game-line** lean against the result (and the closing line = CLV).
  "Leans this season: 31–24 (56%)". Props stay on-device, so only game lines are graded.
- Same harness = the **backtest** (flag 3). Build this first.

---

## 3. Fantasy — My Team + Leaders

| Idea | Formula | Data |
|---|---|---|
| **Target share / snap %** | `rec_tgt / team targets`, `off_snp / tm_off_snp` | Sleeper weekly (fetched) |
| **WOPR** (WR/TE opportunity) | `1.5 × target share + 0.7 × air-yards share` | `rec_tgt`, `rec_air_yd` |
| **Expected points (xFP) + over/under-performance** | `xFP = Σ opportunity × league avg pts per opportunity type` (target, carry, RZ target, RZ carry); `FPOE = actual − xFP` → "due for TDs" / "running hot" | weekly rows |
| **Boom / bust / floor** | % weeks top-12 (`pos_rank_ppr ≤ 12`), p10 / p90 weekly pts | weekly rows |
| **Start/sit score** | `RotoWire projection × FPA matchup mult × injury discount` | Sleeper projections + our FPA |
| **Breakout watch (waivers)** | trending adds ∧ owned% < 50 ∧ snap% ↑ over L3 | trending, research `owned`, snaps |
| **Rest-of-season / playoff SOS** | Σ FPA mult over weeks `playoff_week_start..+2` | already have playoff week |
| **DST streamer** | opp giveaways/G + opp sacks taken/G + opp ppg (low) | Core team stats |
| **Kicker streamer** | projected team points × team RZ FG share | Core + projected total (2b) |
| **League luck index** | all-play record (your pts vs every team each week) vs actual W-L | Sleeper matchups (fetched) |
| **Bench points left** | `ppts − fpts` (max possible vs actual) → lineup grade | roster `settings.ppts` |
| **Trade analyzer** | ROS value = Σ(projection × matchup mult) remaining weeks | projections + FPA |

Also: Sleeper's own `fan_pts_allow_*` on DST rows can sanity-check our FPA table.

---

## 4. Monetization (only after the licensing blocker is solved)

| Model | Fit for Pare | Notes |
|---|---|---|
| **Pare Pro subscription** (recommended) | Best fit — keeps the "Sleeper-tier", ad-free feel | Free: Compare, scores, basic leans. Pro: prop distributions (2d), edge vs line (2b), line-move + injury **alerts** (push via iOS shell), league tools (luck, trade, ROS), multi-league |
| Shareable cards (growth, not revenue) | High — drives installs | OG image of a Compare/lean card; "Pare Rating" becomes the brand |
| Ads | Poor — low CPM, hurts the feel | Needs logos → names (`config/teamIdentity.ts`) |
| Sportsbook affiliate | Highest $ but see flag 2 | Rule change + licensing + Pare LLC |

Licensed feeds to price when ready: a stats provider (Sportradar / SportsDataIO / MySportsFeeds)
+ an odds feed (e.g. The Odds API). Check current pricing and commercial terms at that point.

---

## Unused catalog data — rollout in waves (feature-driven, not "wire everything")

Rule: a field gets wired when a feature shows it, and its catalog row flips ⬜→✅ in the same commit.
Wiring all ~1,180 unused fields up front = bigger payloads on phones, more ESPN calls (429 risk),
and code nobody reads. Waves are ordered by **cost per request**.

| Wave | Data (catalog §) | Extra requests | Feature it powers |
|---|---|---|---|
| **A — already downloaded** | Summary: defense/INT/kicking/punting/returns per player, drives, scoringPlays, winprobability, pickcenter, weather, venue, officials, 4th-down/penalties/TOP/yds-per-play rows · Sleeper weekly: snaps, `rec_tgt`, air yards, RZ targets/carries, YAC, broken tackles, drops, `pos_rank_*`, `pts_half_ppr` · scoreboard: home/road records, linescores, `teamsOnBye`, leaders · roster `ppts`/`fpts_against` | **0** | Full box score (Home), win-prob line + scoring timeline, quarter scores, fantasy usage (target share, snap %, WOPR, boom/bust), My Team lineup grade + luck, weather/venue on Leans |
| **B — one call per data type** | Core odds full + propBets + futures · opponent split `/900` (or byteam) · Core team stats unused fields (RZ %, 4th %, TOP, takeaways, explosive plays, YAC) · predictor + FPI · QBR/EPA · Sleeper projections, trending, roster % · depth chart · ESPN injuries (return dates) · standings extras (home/road/div/conf, clinch, GB) | 1 per type, cached | Prop auto-fill + line movement, real defense metrics, catalog "next" #2/#3, ESPN model chip, Pare Rating inputs, start/sit + waivers, Standings depth |
| **C — new screens** | Player pages (gamelog, splits, career, bio, contracts), per-play data, transactions/news, Sleeper league extras (drafts, transactions, brackets) | per view | Player screen (Leaders/Leans), live drive tracker, league history |
| **Skip** | ❌ rows, duplicates (site curated stats = Core), logos/colors/headshots (trademark until licensed), tickets, user PII (`real_name`/`email`/`phone`), `meta.syncUrl`, attendance | — | — |

Each wave = its own plan; the formula library (0b) is what turns these raw fields into Pare metrics.

**Decided (Kobe, 2026-10-23):** feature waves A → B → C. Order: catalog update → formula library →
backtest → Wave A → (prop auto-fill, Wave B items) → Wave C.

**This session executes only steps 0 and 0b-plan** (catalog update + writing the formula-library plan);
every later step starts with its own plan file.

## Recommended order (each item gets its own plan before code)

0. **Catalog update (doc-only, first):** add today's odds findings to `docs/data-catalog.md` —
   propBets card (URL, paging, 38 types, fields `athlete/team/type/open/current/lastUpdated`, no prices,
   TD-scorer empty), provider ids per season (2025: ESPN BET 58 has props; 2026: DraftKings 100),
   futures + probabilities detail, and a "Formulas" section that points to `lib/formulas/`.
   Mirror to the artifact page after.
0b. **Pare formula library — `lib/formulas/`** (pure functions, Vitest, no data-layer change):
   `odds.ts` (implied / no-vig / American↔decimal / spread→win% Φ / key numbers),
   `team.ts` (Pythagorean + luck, pts/drive, explosive rate, pace, turnover luck, z-score edge,
   SOS adjust, Pare Rating), `player.ts` (P(over) normal, Poisson TD/receptions, shrinkage,
   target share, WOPR, xFP, boom/bust). Every constant (2.37, 13.5, k=4, weights) lives in one
   `lib/formulas/config.ts`, same rule as `LEAN_CONFIG`.
1. **Leans backtest + record harness** (chosen first) — built so **any formula plugs in as a signal**:
   the harness grades the current 3-signal engine *and* each candidate formula (Pare projected
   margin/total vs closing line, prop P(over), shrinkage) on 2025, so a formula ships only if it
   beats 52.4% on enough games. Replay 2025 week by week with only the data known before each game:
   - Inputs: 2025 box-score team logs + Sleeper weekly player lines (same feeds Leans uses), closing
     game lines from Core `/odds`, pregame prop lines from `/odds/{book}/propBets`.
   - Engine: run the existing `lib/leans/gameLean.ts` / `propLean.ts` unchanged; grade each lean
     W/L/push vs the final.
   - Output: hit rate per lean type (spread / total / ML / each prop stat) vs **52.4%**, count of leans,
     and a threshold sweep over `LEAN_CONFIG` values (report only — no config change without Kobe).
   - Shape: a one-off script (`scripts/leans-backtest.mjs`, fetch + cache JSON in a gitignored folder)
     + pure grading functions in `lib/leans/backtest.ts` with Vitest. Results go in the dev note.
   - Its own plan (`docs/plans/YYYY-MM-DD-leans-backtest.md`) before code.
   - Afterwards: prop-line auto-fill (decision above) is the next Leans item.
2. **Quick-win math utilities** (pure, tested, no data-layer change): implied/no-vig prob,
   `Φ` spread→win%, Pythagorean + luck, z-score matchup edge, shrinkage.
3. **Compare small adds** — catalog "next" #2/#3 + Pythagorean/luck + pts/drive + trend arrows.
4. **Leans: line movement + weather + key numbers** (data we already fetch or one call away).
5. **Fantasy usage stats** (target share, snap %, WOPR, boom/bust) in My Team.
6. **Prop distributions + projections** (2b, 2d) — gated on the backtest proving value.

## Critical files (for whichever item is picked)
- `lib/leans/config.ts`, `lib/leans/gameLean.ts`, `lib/leans/propLean.ts`, `lib/leans/evaluate.ts`
- `lib/espnStats.ts`, `lib/metricsConfig.ts`, `lib/last4.ts`, `lib/schedule.ts` (odds)
- `lib/myteam/fpa.ts`, `lib/myteam/sleeper/statLines.ts`, `lib/fantasyPoints.ts`
- `docs/data-catalog.md` + `DATA_SOURCES.md` (flip ⬜→✅ when wiring a field)

## Verification (per item)
- Pure formulas: Vitest unit tests with hand-checked numbers (e.g. DAL 2025 PF/PA → pyth wins).
- Backtest: deterministic run over 2025 finals; numbers recorded in the dev note.
- `npm run check` + `npm run test:run`; Kobe checks UI on :4000.
- CHANGELOG `[Unreleased]` bullet + `docs/devnotes/YYYY-MM-DD-<task>.md` per shipped item.
