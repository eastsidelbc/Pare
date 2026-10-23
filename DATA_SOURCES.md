# Pare — Data Sources Reference

> Reference notes for wiring live NFL data. Source: ESPN's free public JSON API
> (no key, no scraping). Verified working 2026-09-14. Runtime fetches must run
> from a machine with open internet (the Mac mini / prod host) — the dev/agent
> sandboxes are network-locked, so `curl` from them returns nothing.

## Chosen source: ESPN public API
- Free, no API key, returns JSON. Unofficial/undocumented (could change), fine
  for now; revisit if we ever need a licensed guarantee for the App Store.

---

## 1. Schedule + kickoff times  ✅ fully covered
**Endpoint:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
- Defaults to the current week. For a specific week:
  `.../scoreboard?seasontype=2&week=N`  (seasontype: 1=pre, 2=regular, 3=post)

**What we get per game (`events[]`):**
- `date` / `startDate` — kickoff, ISO UTC (e.g. `2026-09-15T00:15Z`)
- `week.number`, `season.year`
- `name` ("Denver Broncos at Kansas City Chiefs"), `shortName` ("DEN @ KC")
- `competitions[0].competitors[]` — each has `homeAway`, team `id`, `abbreviation`,
  `displayName`, `color`, `logo`, live `score`, `records`
- `status.type` — `STATUS_SCHEDULED` / `STATUS_FINAL` + human `detail`/`shortDetail`
- `venue` (name, city, indoor), `broadcast` (TV network)
- BONUS available if we ever want it: betting `odds` (spread, moneyline, O/U),
  `weather`, per-game stat `leaders` (pass/rush/rec)

This fully powers the schedule-first home page (matchup pills + times).

---

## 2. Team season stats
**Endpoint:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{YEAR}/types/2/teams/{TEAM_ID}/statistics`
- Returns `splits.categories[]`; each category has `stats[]` with `value`
  (season total), `perGameValue`, and a league `rank`.
- One call per team (32 calls for a full refresh).

### Our 5 core metrics — mapping
| Pare metric | ESPN field | category | offense |
|---|---|---|---|
| points | `totalPoints` (+ `totalPointsPerGame`) | scoring | ✅ |
| total_yards | `netTotalYards` (NET — sack yds removed) | passing/rushing | ✅ |
| pass_yds | `netPassingYards` (NET — sack yds removed) | passing | ✅ |
| rush_yds | `rushingYards` (+ `rushingYardsPerGame`) | rushing | ✅ |
| score_pct (Sc%) | ⚠️ no exact match — replaced by `third_down_pct` (`thirdDownConvPct`) | miscellaneous | ✅ |

> **NET vs GROSS (fixed 2026-09-14):** offense must map `netTotalYards` /
> `netPassingYards`, NOT `totalYards` / `passingYards`. Gross values include sack
> yardage (`gross − net = sackYardsLost`) and would not match the box-score /
> defense-allowed / official convention. Rushing is unaffected.

---

## ⚠️ GAPS / open decisions

### A. Defense (points/yards allowed) — partly solved (verified 2026-09-14)
The team stats endpoint's `defensive` category has `pointsAllowed` and
`yardsAllowed`, but both are **0 / unpopulated** (confirmed via a 2nd fetch —
not a naming issue). ESPN's "defense" there = defensive plays (sacks, INTs,
tackles), NOT opponent points/yards allowed.

**Points allowed — SOLVED.** The standings endpoint carries it per team:
`https://site.api.espn.com/apis/v2/sports/football/nfl/standings`
  - `pointsFor`, `pointsAgainst`, `differential` (verified: Bills 60 for / 21 against).
  - Points-only — NO yards fields here.

**Yards allowed (total/pass/rush) — STILL a gap.** Not in team stats, not in
standings. Remaining options:
1. Opponent-aggregation: for each team, sum its opponents' offensive yards
   (schedule + each team's offense — all from ESPN, just more work).
2. A source that exposes "allowed" directly (nflverse, or keep PFR for defense yards).
Decision pending.

> **Update 2026-10-23:** yards allowed shipped via option 1 (opponent lines summed from final box scores,
> `lib/espnStats.ts` / `lib/espnBoxscore.ts`). A direct source also exists and is **not used yet**:
> `…/teams/{id}/statistics/900` = the "Opponent Team Statistics" split, i.e. all ~288 stats counted for the
> team's opponents (verified: DAL 2025 = 511 points allowed). `/statistics/0` and `?opponent=true` return the
> team's **own** stats instead, so don't use them. See §9.

### B. score_pct (Sc%) — no exact match
PFR's Sc% = % of drives ending in a score. ESPN doesn't expose drive-scoring %
(`totalDrives` = 0 here). Available cousins in the `miscellaneous` category:
- `redzoneScoringPct`, `redzoneTouchdownPct`
- `thirdDownConvPct`, `fourthDownConvPct`
Decision pending (Kobe leaning: drop Sc% from the default 5, swap in an ESPN metric).

---

## 3. ESPN team ID map (needed for the stats endpoint + lib/teams.ts)
```
1  ATL   2  BUF   3  CHI   4  CIN   5  CLE   6  DAL   7  DEN   8  DET
9  GB    10 TEN   11 IND   12 KC   13 LV    14 LAR   15 MIA   16 MIN
17 NE    18 NO    19 NYG   20 NYJ  21 PHI   22 ARI   23 PIT   24 LAC
25 SF    26 SEA   27 TB    28 WSH  29 CAR   30 JAX   33 BAL   34 HOU
```
(IDs 31/32 are not used.)

---

## 4. How this plugs into Pare (rewritten 2026-10-23)
- **Schedule:** `lib/schedule.ts` fetches the scoreboard and maps it with `mapEspnScoreboard`
  (`lib/espnScoreboard.ts`) into the `Matchup` shape. Live scores go through `/api/live/*` (§6).
- **Offense stats:** `lib/espnStats.ts` → `ESPN_FIELD_MAP` maps 16 core team stats into `TeamStats`.
- **Defense stats:** standings (points allowed, W-L) + opponent lines summed from final box scores
  (yards, 3rd-down %). The PFR/CSV layer was removed 2026-10-01 (`lib/pfrCsv.ts` no longer exists).
- Caching per data type: CLAUDE.md "Freshness" table.

_Last verified: 2026-10-23._

---

## 5. Sleeper (fantasy) — server-only

Free, no key. **Non-commercial use only** — a licensed provider (or Sleeper's
written OK) is required before any paid tier or ads (ADR
`docs/adr/2026-10-07-my-team-provider-proxy.md`, "Blocker"). Documented guidance
(docs.sleeper.com): *"stay under 1000 API calls per minute, otherwise, you risk
being IP-blocked."* No rate-limit headers; responses come through Sleeper's
Cloudflare CDN with `s-maxage` 60s (matchups) to 300s (league, rosters, stats).
Evidence: `docs/devnotes/2026-10-07-my-team-data-spike.md`.

The browser **never** calls Sleeper. Every call below is made by our server.

### Leaders (`lib/fantasy.ts`) — shared, not per user
| Endpoint | Used for | Cache |
|---|---|---|
| `https://api.sleeper.app/v1/players/nfl` | player map (~14MB raw → trimmed: name, team, position, `injury`, `fantasyPositions`, rookie ids, `espnId` for all — Home box-score join) — also My Team's injury tags | `unstable_cache` 24h over no-store, 20s timeout, key `sleeper-player-map-v5` |
| `https://api.sleeper.app/v1/stats/nfl/regular/{season}` | season fantasy totals (`pts_ppr` / `pts_std` / `gp` + the 4 Pare bonus flags) | `unstable_cache` 30 min over no-store, 8s timeout, key `sleeper-season-stats-v2` |

**Fantasy points everywhere (Home box score + Leaders Fantasy) = Sleeper `pts_ppr` + 3 per Sleeper yardage-bonus flag (`bonus_pass_yd_300`, `bonus_pass_yd_400`, `bonus_rush_yd_200`, `bonus_rec_yd_200`)** — `parePoints` in `lib/fantasyPoints.ts`; Pare never scores yards/TDs itself. Home gets them from the weekly lines below (`getWeekLines`), joined to ESPN players by ESPN id, then name + team. My Team keeps league scoring.

### My Team (`lib/myteam/sleeper/*`) — one door: `sleeperJson()` in `http.ts`
Every call goes through a process-wide budget of **600 calls/min**
(`SLEEPER_CALLS_PER_MIN`), `cache: 'no-store'` + `AbortSignal.timeout` (5s;
stats 8s). Over budget → 503 / last-good. Errors never contain the URL (it can
hold a username).

| Endpoint | Used for | Cache (memory-only keyed LRU, `lib/apiCache.ts` `createKeyedCache`) |
|---|---|---|
| `https://api.sleeper.app/v1/user/{username}` | username → `user_id` (unknown user = **HTTP 200 + `null`**) | 24h · max 1,000 |
| `https://api.sleeper.app/v1/user/{user_id}/leagues/nfl/{season}` | the user's leagues | 1h · max 1,000 |
| `https://api.sleeper.app/v1/league/{league_id}` | league name, `scoring_settings`, `roster_positions`, `settings` | 1h · max 500 |
| `https://api.sleeper.app/v1/league/{league_id}/rosters` | find my roster (`owner_id` / `co_owners`), starters / bench / IR / taxi | 5 min · max 500 |
| `https://api.sleeper.app/v1/league/{league_id}/matchups/{week}` | live points (`players_points`, roster `points`) | 60s · max 500 |
| `https://api.sleeper.com/stats/nfl/{season}/{week}?season_type=regular&position[]=QB&…RB…WR…TE…K…DEF` | weekly stat lines with `team` + `opponent` → fantasy points allowed (FPA). **Undocumented host** (fallback: the documented `api.sleeper.app/v1/stats/nfl/regular/{season}/{week}` + ESPN opponents) | `unstable_cache` over no-store (completed weeks 24h, current week 30 min) + last-good per week — shared, no user data |

Per-user data (username, user/league ids, rosters, matchups) is **never** put in
`unstable_cache` (it writes to disk) and never logged.

**Usage tiles (2026-10-23, `lib/myteam/usage.ts`):** the week lines now keep `off_snp`, `tm_off_snp` and `pos_rank_ppr` (every other split/snap/rank key is still dropped; cache keys `myteam-week-lines-*-v2`). `buildUsage` turns them into per-player weeks (league-scored pts, snaps / team snaps, targets / team targets, air yards / team air yards, PPR positional rank) next to the FPA table (same 30-min cache); the bundle sends only my roster's (`LeagueBundle.usage`). The client sums over the Season / Last 4 window (shares = sum ÷ sum).

**Your season (2026-10-23, `lib/myteam/leagueSeason.ts`):** record + points from `/league/{id}/rosters` `settings` (`wins`/`losses`/`ties`, `fpts`+`fpts_decimal`/100, `ppts`+`ppts_decimal`/100); all-play from `/league/{id}/matchups/{week}` for every completed regular-season week (< `playoff_week_start`), cached 1h per league+week (`pastMatchups`). Best-effort: a failure leaves `LeagueBundle.leagueSeason` null, the roster still loads.

### ESPN endpoints added for My Team (server-only, shared)
| Endpoint | Used for | Cache |
|---|---|---|
| `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week={N}&dates={season}` | weeks 1–18 opponents + byes (`lib/myteam/seasonSchedule.ts`; no odds calls; a week with 0 games throws, never a bye) | `unstable_cache` 6h per week over no-store, 5s timeout |
| `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={id}` | existing final-game box score, now week-aware (`getTeamGameLog()`) with sacks, INT, fumbles lost, TDs by type, `totalDrives`, `redZoneAttempts` for the "why" stats; since 2026-10-23 also `firstDowns`, `completionAttempts` (**"a/b"**, slash not dash), `rushingAttempts`, `totalOffensivePlays` for Compare L4 (§8) | existing per-game 24h (`final-boxscore-v3`) |

ESPN injuries were evaluated and **not** used (resolved 75% of rostered injured
players, rule needed ≥95%) — injury tags come from the Sleeper player map (≤24h stale).

---

## 6. Live proxy (`/api/live/*`) — the browser never calls ESPN

Live scores and post-game box scores used to be fetched by the browser straight
from ESPN. Since 2026-10-12 they go through our server (`lib/espnLive.ts`, ADR
`docs/adr/2026-10-12-live-scores-proxy.md`, dev note
`docs/devnotes/2026-10-12-live-scores-proxy.md`). No browser fallback to ESPN.

| Our route | Validation | ESPN endpoint | Body | Server cache (memory, per process) |
|---|---|---|---|---|
| `GET /api/live/scoreboard?week=N` | `^\d{1,2}$`, 1–18 → else 400 `invalid-week` | `site.api.espn.com/.../scoreboard?seasontype=2&week=N` → `mapEspnScoreboard` | `{ week, updatedAt, stale, matchups }` (kickoff ISO) | 10s while any game is in its live window (the phone polls every 5s, `LIVE_POLL_MS`: ≤15 seconds behind ESPN worst case); otherwise ≤5 min, capped at the next live-window start (`scoreboardTtlMs` in `lib/liveWindow.ts`). 0 matchups = failure (last-good wins). Max 18 keys, 6h retention |
| `GET /api/live/summary?event=ID` | `^\d{6,12}$` → else 400 `invalid-event` | `site.api.espn.com/.../summary?event=ID` → `parseSummary` (`lib/gameSummary.ts`) | `GameSummary` `{ byAbbr, headline, extras? }` — `extras` (since 2026-10-23, `lib/gameExtras.ts`): 11 team-stat rows, quarter scores (header linescores), scoring plays, home win % sampled to 60 points, top-2 defenders + kickers per team, venue; omitted when the summary has none of it (pregame). Pare points (Sleeper, §5) attached per response, not cached with the summary | 6h once `header.competitions[0].status.type.completed`, else 60s. Max 300 keys, 24h retention |

- **Single-flight** per key (`createLiveCache`, `lib/apiCache.ts`): ESPN calls don't grow with viewers.
- **Budgets:** 120 ESPN calls/min overall (`ESPN_LIVE_CALLS_PER_MIN`), of which summaries may use 60 (`SUMMARY_CALLS_PER_MIN`) — random event ids can't starve the scoreboard. Spent → last-good, else 503 `busy`.
- **Upstream:** `cache: 'no-store'` + `AbortSignal.timeout(6_000)` (`ESPN_LIVE_TIMEOUT_MS`, under the client's 8s abort). Failure → last-good marked STALE (`stale: true` on the scoreboard) with per-key backoff 5→10→…→120s; no last-good → 502 `upstream`. Pull-based: no timers.
- **Headers:** `X-Pare-Cache: HIT | MISS | STALE`; `Cache-Control: public, s-maxage=<remaining freshness>, stale-while-revalidate=<2×>` (errors: `no-store`). Cloudflare doesn't cache `/api/*` today (`cf-cache-status: DYNAMIC`); a Cache Rule could make the edge honor `s-maxage` later.
- **gzip** (since 2026-10-12, `liveOk` in `lib/espnLive.ts`): only when the request's `Accept-Encoding` lists `gzip` with q > 0. The scoreboard is compressed at most once per upstream fetch per fresh/stale variant (kept on the cache entry); the summary per response, and only from 1 KB (`GZIP_MIN_BYTES`) — today's ~0.9 KB box scores go out plain. Every 200 carries `Vary: Accept-Encoding`; errors unchanged.
- **Assumes one PM2 fork process** (`pare`): caches + budgets are per process. Cluster mode would multiply ESPN calls — see the ADR.
- **Regular season only** (`seasontype=2`, weeks 1–18), same as before; playoffs need a `seasontype` param later.
- Sizes measured 2026-10-13 UTC (week 5): scoreboard 8.3 KB vs ESPN 251 KB raw / 20 KB gzip; summary 0.9 KB vs ESPN 578 KB raw. On the wire with our gzip (live-freshness F3): scoreboard 8,281 → **1,657 B**; summary 896 B (under 1 KB → plain). `next start` does not compress route handlers, so we gzip ourselves; Cloudflare may re-encode (br) to browsers.

_Last verified: 2026-10-13 UTC (`scripts/live-proxy-smoke.mjs`, live-freshness F3 — `docs/plans/2026-10-12-live-freshness/f3-smoke.json`)._

---

## 7. Leans (`/api/leans/data`) — lines + data leans (2026-10-14)

No new upstream. Everything Leans shows comes from sources above, reused server-side:

| Piece | Source | Notes |
|---|---|---|
| **Market facts** (game screen, since 2026-10-23) | `GET /api/leans/market?event=ID` → `lib/leans/marketServer.ts`: ESPN Core `/odds` (book = `pregameBook`, `lib/espnCoreOdds.ts`: first non-"Live" book with `details`, else total-only) + site `/summary` `gameInfo` (weather pregame only, venue) | Home spread / total / moneyline **open → current**, no-vig win chance (`noVig(impliedProb)`), key numbers (`lib/formulas/config.ts`), weather, venue. One shared copy per game, 5 min, last good on failure; 5s timeouts. Facts only — Pare projections don't beat closing lines (backtest). Home's closing-line fallback (`lib/schedule.ts`) uses the same `pregameBook` since 2026-10-23 (was `items[0]`: total-only or in-game books on old finals) |
| Spread · total · **moneyline** | ESPN scoreboard `odds[0]` (`lib/espnScoreboard.ts`) | `MatchupOdds` gained optional `spreadLine { team, line }` (parsed from `details`, "SEA -2.5") and `moneyline { away, home }` (`odds[0].moneyline.{away,home}.close.odds`, else `.open.odds`; American strings → numbers, "EVEN" = +100). `odds[0].spread` is **not** used — its sign flips by side. The `spread` string Home renders is unchanged. Verified on the live week-6 scoreboard 2026-10-14: 14/14 games carry moneylines. Fixture: `lib/__fixtures__/espn/scoreboard-odds.json` (provider names + deep links stripped) |
| Points for / against per team per week | ESPN final box scores → `getTeamGameLog()` (`lib/espnStats.ts`, same log My Team uses) | total / spread / moneyline signals |
| Player weekly prop stats | Sleeper `api.sleeper.com` week lines → `getWeekLines()` (`lib/myteam/sleeper/statLines.ts`) | `rush_yd`, `rec`, `rec_yd`, `rush_td`, `rec_td` (absent key = 0); `pts_ppr` ranks players + scores the FPA table |
| Matchup tier + rank | `buildFpaTable(lines, { pts_ppr: 1 })` → `rankFpa` / `rateMatchup` (`lib/myteam/fpa.ts`, `rating.ts`) | plain Sleeper PPR (Leans has no league), QB/RB/WR/TE only, ranked client-side |
| Names + injury tags | Sleeper player map `getPlayerMap()` (`lib/fantasy.ts`, 24h) | a player without a name is left out |
| Next weeks | `getSeasonSchedule()` (`lib/myteam/seasonSchedule.ts`) | week cells |
| Not shown yet | — | defense **yards per carry** — box scores carry `rushingAttempts` since 2026-10-23 (parsed for Compare L4, §8), but the Leans why-row isn't built |

`GET /api/leans/data?teams=ATL,LV` (`lib/leans/bundle.ts`, `server-only`, `force-dynamic`, `private, no-store`): one
shared in-memory bundle per 10 min (`createKeyedCache`, last good on failure; a missing completed week throws so it
never skews ranks), then filtered to the asked teams' players + schedule. Carries **team abbreviations only**. ~65 KB
for two teams, ~1.5 s cold. Lean thresholds: `lib/leans/config.ts`.

**Prop lines (since 2026-10-23 — typing retired):** `GET /api/leans/props?week=N` → `{ games: Record<MatchupId, GamePropLine[]> }`
(`lib/leans/propLinesServer.ts`, server-only). Per game: Core `/odds` → first non-"Live" book with a `propBets` link →
every page (`limit=1000`, 2 pages) → `parseBookLines` (`lib/leans/propLines.ts`): ESPN market types 12 rush yds, 13 rec
yds, 14 receptions, 20 rush+rec yds, 31 anytime TD; the over + under items are merged by target; priced main line =
closest to even, unpriced feeds (2026: one line per player) = that line; open + current kept. ESPN athlete id → Sleeper id
via the player map `espnId`. One shared copy per game for 10 min, last good on failure; a failing game is left out of the
week. Client (`lib/leans/autoProps.ts`): only bundle players; before kickoff the current line, after kickoff the opener
(`current` moves in-game). Week 7 2026: 14 games, ~21 KB. TD-scorer markets are often empty → no Anytime TD props then.

## 8. Compare "L4" (`/api/nfl-2025/last4`) — last-4-games rows (2026-10-23)

No new upstream: the same final box scores (`getTeamGameLog()`, per-game 24h `final-boxscore-v3`) summed per team
over its **last 4 games played** (byes skipped, `windowWeeks` in `lib/myteam/rating.ts`) by `buildLast4Rows`
(`lib/last4.ts`). Rows have the offense/defense routes' shape with `g` = games in the window, so the client's
per-game transform gives L4 averages. Offense: `points, total_yards, pass_yds (net), rush_yds, pass_cmp, pass_att,
pass_td, pass_int, plays_offense, first_down, rush_att, rush_td, fumbles_lost, turnovers, third_down_pct`
(attempts-weighted). Defense = the opponents' lines in that window: `points, total_yards, pass_yds, rush_yds,
third_down_pct`. Route ISR 10 min (`revalidate = 600`) + last-good backup. Verified 2026-10-23 vs ESPN team
schedules: CHI 91 for / 90 against, NE 124 / 92 (weeks 4–7).

## 9. Full catalog: everything ESPN + Sleeper expose (probed 2026-10-23)

**Full inventory (every endpoint and every field, used vs unused): [`docs/data-catalog.md`](docs/data-catalog.md)**,
the source of truth for "what exists". Browsable view of the same data (search + filters, private to Kobe):
https://claude.ai/artifact/5erzWkCE7oSd4mdXX65Yfu. This section is the short version; it lists only what isn't
documented above.

**In use but missing from §1–8 until now:**
- **Leaders:** `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byathlete?isqualified=false&limit={25|300}&sort={category}.{stat}:desc`
  (`lib/leaders.ts`, 12 boards, `unstable_cache` 30 min).
- **Closing line on finals:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{id}/competitions/{id}/odds`
  (`lib/schedule.ts`, `items[0].details` + `.overUnder`, 6h), used when the scoreboard has dropped odds.

**Best unused sources:**

| Source | What it adds |
|---|---|
| core `…/teams/{id}/statistics/900` | every stat, "allowed" side (defense without box-score summing) |
| web `…/statistics/byteam?season=&seasontype=2` | all 32 teams, own (splitId 0) + opponent (900), with ranks, in **one** call |
| core team stats fields we skip | `netYardsPerPassAttempt`, `yardsPerRushAttempt`, `passingFirstDowns`, `rushingFirstDowns`, `firstDownsPenalty`, `totalPenalties`, `totalPenaltyYards` (map onto 7 hidden metrics) + `redzoneTouchdownPct`, `redzoneScoringPct`, `fourthDownConvPct`, `possessionTimeSeconds`, `totalTakeaways`, `turnOverDifferential`, `passingBigPlays`, `rushingBigPlays` |
| site `/summary` sections we skip | player punting/returns, `drives`, `gameInfo.officials` (defense, kicking, `scoringPlays`, `winprobability`, `gameInfo.venue` → Home Game details since 2026-10-23) |
| core `…/competitions/{id}/predictor`, `/probabilities`; `seasons/{yr}/powerindex` (FPI); `…/groups/9/qbr/{0\|10000}` | win %, projected margin, unit EPA, playoff odds, QBR/EPA |
| core `…/competitions/{id}/odds` (all fields) | 3 books, open / close / current spread, total, moneyline |
| web `athletes/{id}/gamelog`, `/splits` | player game logs and splits |
| Sleeper stat keys we skip | `off_snp`/`tm_off_snp` (snap %), `rec_tgt`, `rec_air_yd`, `rec_rz_tgt`, `rush_rz_att`, `rec_drop`, `fan_pts_allow_{qb,rb,wr,te,k}`, `TEAM_xxx` efficiency (`rz_pct`, `down_3_pct`, `off_yd_per_play`) |
| Sleeper `/v1/projections/nfl/regular/{yr}/{wk}`, `/v1/players/nfl/trending/{add\|drop}`, `api.sleeper.app/players/nfl/research/regular/{yr}/{wk}` | RotoWire projections, trending adds/drops, owned/started % |

**Traps (verified):**
- Always 0 for NFL: `yardsAllowed`, `pointsAllowed`, season `totalDrives`, `offensiveSnapPct`, `targetSharePct`,
  `yardsPerRouteRun`, `avgDepthOfTarget`, `hurries`, `passesBattedDown`; scoreboard `competitors[].statistics`
  and `weather`.
- Wrong values: `avgGain`, `ESPNQBRating`/`ESPNRBRating`/`ESPNWRRating` (raw sums), receiving `twoPointRecConvs`.
- Junk: core `teams/{id}/ats` (empty), `odds-records` (404 for 2025, impossible records for 2026).
- Both APIs default to the **2026** season; always pass the season.
- Sleeper season totals add weekly values, including `*_lng` and rates; compute those from weekly rows.
  Sleeper `/stats` + `/projections` and everything on `api.sleeper.com` are undocumented.
- `summary.injuries` is today's list, not historical. `summary.predictor`/`gameInfo.weather` appear pregame only.

---

# Appendix: FULL field chart — team statistics endpoint

Every stat the endpoint returns, by category. Each stat object carries
`value` (season total), `perGameValue`, `displayValue`, and league `rank`.
⚠️ = comes back 0 / unpopulated at the TEAM level (player-only or not filled).

## general
| key | meaning |
|---|---|
| fumbles | fumbles |
| fumblesLost | fumbles lost |
| fumblesForced | forced fumbles |
| defensiveFumblesForced | forced fumbles (defense) |
| miscFumblesForced | forced fumbles (misc) |
| specialTeamsFumblesForced | forced fumbles (special teams) |
| fumblesRecovered | fumbles recovered |
| fumblesTouchdowns | fumble-recovery TDs |
| gamesPlayed / teamGamesPlayed | games played |
| offensiveTwoPtReturns | 2pt returns (offense) |
| offensiveFumblesTouchdowns | offensive fumble TDs |
| defensiveFumblesTouchdowns | defensive fumble TDs |
| totalPenalties | penalties |
| totalPenaltyYards | penalty yards |

## passing (offense)
| key | meaning |
|---|---|
| completions | completions |
| passingAttempts | pass attempts |
| completionPct | completion % |
| passingYards | **passing yards** (core) |
| passingYardsPerGame | passing yards/game |
| netPassingYards | net passing yards (sacks removed) |
| netPassingYardsPerGame | net passing yards/game |
| passingTouchdowns | passing TDs |
| passingTouchdownPct | pass TD % |
| interceptions | interceptions thrown |
| interceptionPct | INT % |
| passingFirstDowns | passing 1st downs |
| passingBigPlays | 20+ yd pass plays |
| longPassing | longest pass |
| yardsPerPassAttempt | yards/attempt |
| netYardsPerPassAttempt | net yards/attempt |
| yardsPerCompletion | yards/completion |
| sacks | sacks allowed |
| sackYardsLost | sack yards lost |
| QBRating / quarterbackRating | passer rating |
| ESPNQBRating | ESPN QBR |
| totalPoints | **total points** (core) |
| totalPointsPerGame | points/game |
| totalYards | **total yards** (core) |
| yardsPerGame | total yards/game |
| totalTouchdowns | total TDs |
| totalOffensivePlays | offensive plays |
| totalYardsFromScrimmage | yards from scrimmage |
| twoPtPass / twoPointPassConvs / twoPtPassAttempts | 2pt passing |
| passingYardsAfterCatch / passingYardsAtCatch | YAC / air yards |
| offensiveSnapPct ⚠️ / targetSharePct ⚠️ / yardsPerRouteRun ⚠️ / avgDepthOfTarget ⚠️ | player-only, 0 at team level |

## rushing (offense)
| key | meaning |
|---|---|
| rushingAttempts | rush attempts |
| rushingYards | **rushing yards** (core) |
| rushingYardsPerGame | rush yards/game |
| yardsPerRushAttempt | yards/carry |
| rushingTouchdowns | rushing TDs |
| rushingFirstDowns | rushing 1st downs |
| rushingBigPlays | 20+ yd rush plays |
| longRushing | longest run |
| rushingFumbles / rushingFumblesLost | rush fumbles |
| stuffs / stuffYardsLost | runs stopped at/behind LOS |
| twoPtRush / twoPointRushConvs / twoPtRushAttempts | 2pt rushing |
| ESPNRBRating | ESPN RB rating |

## receiving (offense)
| key | meaning |
|---|---|
| receptions | receptions |
| receivingTargets | targets |
| receivingYards | receiving yards (= passing yards, team) |
| receivingYardsPerGame | rec yards/game |
| yardsPerReception | yards/reception |
| receivingTouchdowns | receiving TDs |
| receivingFirstDowns | receiving 1st downs |
| receivingBigPlays | 20+ yd receptions |
| longReception | longest reception |
| receivingYardsAfterCatch / receivingYardsAtCatch | YAC / air yards |
| receivingFumbles / receivingFumblesLost | rec fumbles |
| twoPtReception / twoPointRecConvs / twoPtReceptionAttempts | 2pt receiving |
| ESPNWRRating | ESPN WR rating |

## defensive  (⚠️ NOT points/yards allowed — see Gap A)
| key | meaning |
|---|---|
| totalTackles | total tackles |
| soloTackles | solo tackles |
| assistTackles | assisted tackles |
| sacks | sacks (defense) |
| sackYards / avgSackYards | sack yards |
| tacklesForLoss | TFL |
| stuffs / stuffYards / avgStuffYards | run stuffs |
| passesDefended | passes defended |
| passesBattedDown | batted passes |
| hurries | QB hurries |
| defensiveTouchdowns | defensive TDs |
| kicksBlocked | kicks blocked |
| safeties / onePtSafetiesMade | safeties |
| longInterception | longest INT return |
| avgInterceptionYards | avg INT return yds |
| blockedFieldGoalTouchdowns / blockedPuntTouchdowns | block-return TDs |
| yardsAllowed ⚠️ | **0 / unpopulated** |
| pointsAllowed ⚠️ | **0 / unpopulated** |

## defensiveInterceptions
| key | meaning |
|---|---|
| interceptions | interceptions made |
| interceptionTouchdowns | pick-6s |
| interceptionYards | INT return yards |

## kicking
| key | meaning |
|---|---|
| fieldGoalsMade / fieldGoalAttempts / fieldGoalPct | field goals |
| fieldGoalsMade{1_19,20_29,30_39,40_49,50_59,60_99,50} | FG made by distance |
| fieldGoalAttempts{ranges} | FG attempts by distance |
| longFieldGoalMade / longFieldGoalAttempt | longest FG |
| fieldGoalsBlocked / fieldGoalsBlockedPct | FGs blocked |
| extraPointsMade / extraPointAttempts / extraPointPct | XPs |
| extraPointsBlocked / extraPointsBlockedPct | XPs blocked |
| totalKickingPoints | kicking points |
| kickoffs / kickoffYards / avgKickoffYards | kickoffs |
| touchbacks / touchbackPct | touchbacks |

## returning
| key | meaning |
|---|---|
| kickReturns / kickReturnYards / yardsPerKickReturn | kick returns |
| kickReturnTouchdowns / longKickReturn | kick return TDs / long |
| puntReturns / puntReturnYards / yardsPerPuntReturn | punt returns |
| puntReturnTouchdowns / longPuntReturn | punt return TDs / long |
| puntReturnFairCatches / puntReturnFairCatchPct | fair catches |
| fumbleRecoveries / oppFumbleRecoveries | fumble recoveries |
| kickReturnFumbles / puntReturnFumbles (+ Lost) | return fumbles |

## punting
| key | meaning |
|---|---|
| punts / puntYards | punts |
| grossAvgPuntYards / netAvgPuntYards | avg punt (gross/net) |
| longPunt | longest punt |
| puntsInside10 / puntsInside20 (+ Pct) | punts pinned deep |
| puntsBlocked / puntsBlockedPct | punts blocked |
| touchbacks / touchbackPct | punt touchbacks |
| fairCatches | fair catches |

## scoring
| key | meaning |
|---|---|
| totalPoints / totalPointsPerGame | points |
| totalTouchdowns | total TDs |
| passingTouchdowns / rushingTouchdowns / receivingTouchdowns / returnTouchdowns | TDs by type |
| defensivePoints | points scored by defense |
| fieldGoals | FGs made |
| kickExtraPoints / kickExtraPointsMade | XPs |
| totalTwoPointConvs (+ pass/rec/rush breakdown) | 2pt conversions |
| onePtSafetiesMade | 1pt safeties |

## miscellaneous  (efficiency — useful for a Sc% substitute)
| key | meaning |
|---|---|
| firstDowns / firstDownsPerGame | total 1st downs |
| firstDownsPassing / firstDownsRushing / firstDownsPenalty | 1st downs by type |
| thirdDownConvs / thirdDownAttempts / thirdDownConvPct | 3rd down % |
| fourthDownConvs / fourthDownAttempts / fourthDownConvPct | 4th down % |
| redzoneScoringPct | red-zone score % (Sc% cousin) |
| redzoneTouchdownPct | red-zone TD % |
| redzoneFieldGoalPct / redzoneEfficiencyPct | red-zone splits |
| possessionTimeSeconds | time of possession |
| totalTakeaways / totalGiveaways / turnOverDifferential | turnover margin |
| totalPenalties / totalPenaltyYards | penalties |
| totalDrives ⚠️ | **0 / unpopulated** |

---

# Appendix: scoreboard fields (per game)
| path | meaning |
|---|---|
| events[].id | game id |
| events[].date / startDate | kickoff (ISO UTC) |
| events[].week.number / season.year | week / season |
| events[].name / shortName | matchup names |
| ...competitors[].homeAway | home/away flag |
| ...competitors[].team.{id,abbreviation,displayName,color,logo} | team identity |
| ...competitors[].score / records | live score / W-L |
| ...status.type.{name,state,completed,detail,shortDetail} | game status |
| ...venue.{fullName,address.city,indoor} | stadium |
| ...broadcast / geoBroadcasts | TV network |
| ...odds[] | spread, moneyline, over/under |
| ...weather ⚠️ | never present on the scoreboard (2026-10-23); use `summary.gameInfo.weather`, pregame only |
| ...leaders[] | per-game pass/rush/rec leaders |
