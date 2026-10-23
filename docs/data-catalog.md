# Pare — Data Catalog (ESPN + Sleeper)

> **Every endpoint and every field ESPN and Sleeper expose for the NFL, with what Pare reads today marked.**
> Probed live on **2026-10-23** (GET requests to every URL below) and checked against the code on `feat/last4-compare`.
>
> - **This file = what exists** (the full inventory). [`DATA_SOURCES.md`](../DATA_SOURCES.md) = **how Pare uses it**
>   (caching, mapping, gotchas, plus field meanings for the core team-stats endpoint in its appendix).
> - Same content as a browsable page (search + filters): https://claude.ai/artifact/5erzWkCE7oSd4mdXX65Yfu (private).
>   **This file is the source of truth**; the page is a view of it.
> - Probe IDs: team `6` (DAL), athlete `2577417` (Dak Prescott), event `401772694` (KC @ DAL, 2025 W13),
>   upcoming event `401873009`. Full-season data = **2025** (`seasontype` 2 = regular). Both APIs default to **2026** now.
>   Odds + props probed the same day on `401873009` (DraftKings, id 100) and `401772694` (ESPN BET, id 58).
> - **Verified complete against live responses (2026-10-23):** all 288 ESPN core team stats (11 categories), all 260
>   Sleeper stat keys (season + weeks 1 and 8), and every box-score team and player field in `/summary`. Other lists come
>   from one live response each, so rarely-filled fields can be missing.
> - When you wire a new field: flip its status here and document the mapping in `DATA_SOURCES.md`.

**Legend:** ✅ Used = Pare reads it today · ⬜ Not used = available, unused · ❌ Empty / wrong = always 0, missing, nonsense values, or the endpoint is empty/dead for NFL.

## Contents

- [Summary](#summary)
- [What we could build next](#what-we-could-build-next)
- [Formulas](#formulas)
- [Traps found while probing](#traps-found-while-probing)
- [Licensing](#licensing)
- [Conventions and response shapes](#conventions-and-response-shapes)
- [How to re-probe](#how-to-re-probe)
- [ESPN · Site API](#espn--site-api)
  - [Scoreboard](#scoreboard)
  - [Game summary (box score)](#game-summary-box-score)
  - [Team season stats (curated)](#team-season-stats-curated)
  - [Teams + team page](#teams--team-page)
  - [Roster](#roster)
  - [Team schedule](#team-schedule)
  - [Depth chart](#depth-chart)
  - [League injuries](#league-injuries)
  - [News + transactions + groups](#news--transactions--groups)
  - [Team leaders (site.web)](#team-leaders-siteweb)
  - [Game page mirror](#game-page-mirror)
  - [Empty or dead (site)](#empty-or-dead-site)
- [ESPN · Standings](#espn--standings)
  - [Standings](#standings)
- [ESPN · Core API](#espn--core-api)
  - [Team season stats (288 stats, with league rank)](#team-season-stats-288-stats-with-league-rank)
  - [Opponent split · the "allowed" side](#opponent-split--the-allowed-side)
  - [Per-game team stats (310)](#per-game-team-stats-310)
  - [Game odds (3 books)](#game-odds-3-books)
  - [Player + game props (propBets)](#player--game-props-propbets)
  - [Win probability (per play)](#win-probability-per-play)
  - [Matchup predictor](#matchup-predictor)
  - [Live game details](#live-game-details)
  - [FPI · Football Power Index](#fpi--football-power-index)
  - [ESPN QBR + EPA](#espn-qbr--epa)
  - [Athlete season + game stats](#athlete-season--game-stats)
  - [Athlete profile + logs](#athlete-profile--logs)
  - [Leaders](#leaders)
  - [Futures](#futures)
  - [Team + season structure](#team--season-structure)
  - [Draft, transactions, awards, misc](#draft-transactions-awards-misc)
  - [Empty or dead (core)](#empty-or-dead-core)
- [ESPN · Web API](#espn--web-api)
  - [Player stats table (byathlete)](#player-stats-table-byathlete)
  - [Team stats table (byteam) · all 32, own + opponent](#team-stats-table-byteam--all-32-own--opponent)
  - [Player page](#player-page)
  - [Dead (web)](#dead-web)
- [ESPN · Images](#espn--images)
  - [Team logos](#team-logos)
- [Sleeper · v1 (documented)](#sleeper--v1-documented)
  - [Player map (~14.7 MB)](#player-map-147-mb)
  - [Season stats](#season-stats)
  - [Weekly stats](#weekly-stats)
  - [Stat keys (all Sleeper stats routes · 260)](#stat-keys-all-sleeper-stats-routes--260)
  - [Projections](#projections)
  - [Trending + NFL state](#trending--nfl-state)
  - [My Team · user, leagues, league, rosters, matchups](#my-team--user-leagues-league-rosters-matchups)
  - [League extras](#league-extras)
- [Sleeper · undocumented](#sleeper--undocumented)
  - [Weekly stat lines with game context](#weekly-stat-lines-with-game-context)
  - [Season totals table](#season-totals-table)
  - [One player's season by week](#one-players-season-by-week)
  - [Projections with context](#projections-with-context)
  - [Roster % (owned / started)](#roster--owned--started)
  - [Schedule](#schedule)
  - [Single player](#single-player)

## Summary

| Provider | Endpoints that work | Pare uses | Fields listed | Fields used | Empty / wrong |
|---|---|---|---|---|---|
| ESPN | ~65 | 10 | 1294 | 170 (13%) | 83 |
| Sleeper | ~29 | 8 | 493 | 58 (12%) | 3 |

Counts are field slots in this catalog. A few names repeat across categories (e.g. `totalPoints` in several ESPN categories). Endpoint counts treat a card that groups several URLs (e.g. My Team's 5 Sleeper calls) as that many endpoints.

## What we could build next

Ranked by value to an everyday fan for the effort. **Small** = a few lines in the data layer · **Medium** = data layer + a UI change · **Big** = a new screen or a data-layer redesign. Anything that touches the data layer, bar math or hook signatures needs Kobe's OK and its own plan.

| # | Idea | Effort | Source | What it involves |
|---|---|---|---|---|
| 1 | **Real defense numbers from one source** — The opponent split (/statistics/900, or byteam for all 32 teams in one call) has every "allowed" stat: points, yards, plays, first downs, 3rd/4th down, red zone, sacks, takeaways. Today defense is stitched together from standings and summed box scores, and most defense metrics are hidden. | Medium | Core /statistics/900<br>Web byteam | Data layer + useBarCalculation, which assumes every defense stat is "lower is better". |
| 2 | **Unhide 8 Compare metrics already defined** — yds/play, net yds/att, pass 1st downs, rush yds/att, rush 1st downs, penalties, penalty yards and penalty 1st downs each map to one Core field. Turnover % and scoring % also need drive counts summed from box scores, because season totalDrives is always 0. | Small | Core team stats | ESPN_FIELD_MAP + flip availableInOffense in metricsConfig. |
| 3 | **New team stats fans know** — Red-zone TD % and scoring %, 4th-down %, time of possession, takeaways, turnover differential, sacks taken, completion %, passer rating, explosive plays (20+ yard runs and passes), yards after catch. | Small | Core team stats | Each new metric needs its higher/lower-is-better direction checked. |
| 4 | **Fuller box score with no extra requests** — The summary we already download has defense (tackles, sacks, TFL, QB hits), kicking, punting and returns per player, plus drives, scoring plays, a win-probability line, officials and venue. | Medium | Site /summary | UI only; the data is already fetched. |
| 5 | **Matchup preview odds** — ESPN's predictor and FPI give a win % and projected margin for every game, plus EPA by offense, defense and special teams. Good for the Home accordion and Leans. | Medium | Core predictor<br>Core powerindex |  |
| 6 | **Line movement + prop lines for Leans** — Core odds already returns open, close and current spreads, totals and moneylines. We read only the first book's closing line. propBets adds ~1,000 player and game prop lines per game (open + current), so Leans can fill prop lines in instead of the user typing them, and 2025 lines still exist for a backtest. | Medium | Core odds<br>Core propBets | **Built 2026-10-23**: Leans Market card + auto-filled prop lines. |
| 7 | **Fantasy usage stats** — Snap %, target share, air yards, red-zone targets and carries, drops, broken tackles, and fantasy points allowed by position, for My Team start/sit and Leans. | Medium | Sleeper stat keys | Already in the weekly rows we fetch; just not read. |
| 8 | **Projections, trending and roster %** — RotoWire projections per week, the most added and dropped players in the last 24h, and how often each player is rostered and started. | Medium | Sleeper projections<br>Sleeper trending<br>Sleeper research |  |
| 9 | **Player pages** — Game logs, home/away/opponent/quarter splits, career stats, QBR and EPA, contracts, depth-chart slot and practice status. That's a full player screen for Leaders and Leans. | Big | Web gamelog + splits<br>Core QBR<br>Sleeper player map |  |
| 10 | **Standings depth** — Home, road, division and conference records, clinch flags, games behind, and points per game for and against. | Small | Standings<br>Core record |  |

## Formulas

Pare's own metrics built on top of these fields (Pythagorean wins, points per drive, no-vig odds, prop over-probability, target share, …) are planned, not built yet:

- Ideas, odds findings and the rollout waves for unused data: [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](plans/check-datacatalog-md-and-come-vivid-bunny.md)
- Formula library plan (code will live in `lib/formulas/`): [`docs/plans/2026-10-23-formula-library.md`](plans/2026-10-23-formula-library.md)

When a formula ships, list it here with the fields it reads.

## Traps found while probing

- **Wrong opponent URL.** /statistics/0 and ?opponent=true return the team's own stats. Use /statistics/900.
- **Always 0 or empty.** yardsAllowed, pointsAllowed, season totalDrives, offensiveSnapPct, targetSharePct, yardsPerRouteRun, avgDepthOfTarget, hurries, passesBattedDown, scoreboard competitor statistics and weather.
- **Wrong values.** avgGain (610), ESPNQBRating / RBRating / WRRating (raw sums), receiving twoPointRecConvs (equals targets), site opponent fumblesForced (110).
- **Junk endpoints.** ATS records are empty. odds-records is 404 for 2025 and shows impossible records for 2026.
- **Default season is 2026.** Both APIs now default to 2026. Always pass the season explicitly.
- **Sleeper season totals.** Season rows add weekly values together, including longest plays and rates. Compute those from weekly rows.
- **Pregame-only and live-only data.** summary predictor, weather and last-5 games appear only before kickoff; situation only while live; odds drop off the scoreboard after the final.
- **Injuries aren't historical.** summary.injuries shows today's injury list even for an old game.
- **Season-scoped paths.** `CORE/athletes/{id}/eventlog?season=2025` ignores `season` and returns 2026 games; use `CORE/seasons/2025/athletes/{id}/eventlog`.
- **Sacks have two meanings.** In a team's own stats, `passing.sacks` = sacks *taken*, `defensive.sacks` = sacks *made* (DAL 2025: 31 taken, 35 made). In the `/900` opponent split they swap.
- **`interceptions` appears twice** in core team stats: `passing.interceptions` = thrown, `defensiveInterceptions.interceptions` = made. Pare's flattener keeps the first occurrence (thrown) — intended for offense.
- **Box-score `interceptions`** row appears twice in `boxscore.teams[].statistics`.
- **ESPN QBR at team level** shows `--` in the summary box score.
- **Odds books change per game and season.** The upcoming 2026 game returned only DraftKings (100); the 2025 final returned DraftKings (100, no props), ESPN BET (58, props) and ESPN Bet Live (59, props). Never hardcode a provider id — pick the first book in `/odds` whose `propBets` link exists.
- **propBets is paged.** `limit=1000` still gives 2 pages (~1,050–1,100 items); read `pageCount` and fetch every page.
- **Props have several lines per player and market** (main line plus alternates). Pick the main line: the one with `over`/`under` prices when present, otherwise the median `target`.
- **Prop prices are partial.** 2025 ESPN BET: ~200 of ~1,100 props carry `over`/`under` prices. 2026 DraftKings: none — only `target`. Assume -110 when a price is missing.
- **TD-scorer props.** 2025: Anytime TD has `target` 0.5. 2026 DraftKings: TD-scorer markets come back with empty `open`/`current`.

## Licensing

- **ESPN:** unofficial and undocumented — can change or disappear without notice. No key. Team logos and names are trademarks (`config/teamIdentity.ts` must be `'name'` before ads/Pro).
- **Sleeper (docs.sleeper.com):** “free to use for **non-commercial purposes** … For commercial use … reach out to us directly … to discuss licensing.” No token. Stay **under 1,000 calls/min** or risk an IP block. Call `/players/nfl` **at most once a day** and cache it server-side.
- **Sleeper undocumented routes** (`/v1/stats`, `/v1/projections`, everything on `api.sleeper.com`, `players/nfl/research`) are not in the docs. Stats come from **Sportradar** (`company: "sportradar"`), projections from **RotoWire** (`company: "rotowire"`).
- **A licensed data provider is required before any monetization** (ads / Pro tier). More fields don't change this.

## Conventions and response shapes

### ESPN hosts

| Short name | Base URL | Style |
|---|---|---|
| SITE | `https://site.api.espn.com/apis/site/v2/sports/football/nfl` | Page-shaped JSON (what espn.com renders). `?season=` / `?dates=` select the year. |
| STANDINGS | `https://site.api.espn.com/apis/v2/sports/football/nfl` | Standings only. |
| CORE | `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl` | Normalized resources. Season in the path. Lists are paged `{count, pageIndex, pageSize, pageCount, items[]}`; items are often `{ "$ref": url }` links you must follow. `?limit=` raises the page size. |
| WEB | `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl` | League-wide tables and player pages. Paged with `limit` + `page`. |
| CDN | `https://a.espncdn.com`, `https://cdn.espn.com/core/nfl/game?xhr=1&gameId=` | Images; game-page mirror. |

### ESPN stat object (CORE)

Every CORE stat looks like `{ name, displayName, shortDisplayName, description, abbreviation, value, displayValue, perGameValue, perGameDisplayValue, rank, rankDisplayValue }`. Team stats live at `splits.categories[].stats[]`; the split name tells you whose stats they are (`All Splits` = own, `Opponent Team Statistics` = `/900`). Pare ignores `rank` and ranks client-side (`useRanking`).

### ESPN params

- `seasontype`: 1 = preseason, 2 = regular, 3 = postseason. Pare is regular-season only today.
- `week=N`, `dates=YYYY` (scoreboard), `season=YYYY` (site team routes, standings), `limit`, `page`, `isqualified=false` (byathlete: all 2,185 players instead of 53 qualified), `sort=category.stat:desc`.
- Game sub-resources take the event id twice: `/events/{id}/competitions/{id}/…`.

### Sleeper IDs and shapes

- **Three kinds of key in stats maps:** numeric `player_id` = a player; bare abbreviation (`KC`) = the fantasy D/ST unit; `TEAM_KC` = whole-team totals (the only rows with team-efficiency keys). Pare skips `TEAM_` rows today.
- **v1 stats/projections** = a flat object `{ id: { stat_key: number } }` with no game context.
- **api.sleeper.com stats/projections** = arrays (or week-keyed objects) of `{ player_id, week, season, season_type, team, opponent, game_id, date, is_away_team, company, category, status, updated_at, last_modified, stats{…}, player{…} }`.
- **Season totals** add weekly values together, including `*_lng` (Josh Allen 2025 `pass_lng` = 611) and team rates (`down_3_pct` = 756.67). Compute rates and longs from weekly rows.
- `pos_rank_*` = 999 when unranked. `gp` = games played, `gs` = games started, `gms_active` = active games.
- **Key naming patterns:** `_yd` yards · `_td` touchdowns · `_fd` first downs · `_2pt` two-point conversions · `_lng` longest · `_td_lng` longest TD · `_rz_` red zone · `_40p` / `_50p` 40+/50+ yards · `_0_4`, `_5_9` … reception-length buckets · `_air_yd` air yards · `rush_yac` yards after contact · `rec_yar` yards after the catch · `rush_btkl` broken tackles · `rec_drop` drops · `_snp` snaps (`tm_*_snp` = the team's total snaps, so snap % = `off_snp / tm_off_snp`) · `bonus_*` fantasy bonus flags (1 when hit) · `idp_*` individual defensive player · `def_*` team defense · `st_*` special teams · `opp_*` allowed to opponents · `fan_pts_allow_*` fantasy points allowed to that position · `pts_*` fantasy points by scoring format.

### Data timing quirks

- Scoreboard `odds`: scheduled games only (dropped after the final — Pare falls back to CORE odds). `situation`: live games only.
- Summary `predictor`, `gameInfo.weather`, `lastFiveGames`, `ticketsInfo`: pregame only. `drives`, `scoringPlays`: once the game has started.
- Summary `injuries`: today's injury list, even for an old game.
- FPI (`powerindex`) updates daily.

## How to re-probe

Run from Kobe's Windows box or the Mac mini (cloud sandboxes can't reach ESPN reliably). PowerShell: `curl.exe`, one command per line.

```powershell
curl.exe -s "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/types/2/teams/6/statistics/900" -o opp.json
curl.exe -s "https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byteam?season=2025&seasontype=2" -o byteam.json
curl.exe -s "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401772694" -o summary.json
curl.exe -s -g "https://api.sleeper.com/stats/nfl/2025/8?season_type=regular&position[]=QB" -o sleeper-w8.json
curl.exe -s "https://api.sleeper.app/v1/stats/nfl/regular/2025/8" -o sleeper-v1-w8.json
```

List every stat name in a CORE team-stats response (Node):

```powershell
node -e "const j=require('./opp.json');for(const c of j.splits.categories)console.log(c.name+': '+c.stats.map(s=>s.name).join(' '))"
```

Union of every Sleeper stat key in a v1 weekly file:

```powershell
node -e "const j=require('./sleeper-v1-w8.json');const k=new Set();for(const v of Object.values(j))for(const x of Object.keys(v))k.add(x);console.log([...k].sort().join(' '))"
```

`-g` stops curl from treating `[]` in `position[]` as a glob.

---

## ESPN · Site API

Base: `https://site.api.espn.com/apis/site/v2/sports/football/nfl`

### Scoreboard

✅ **Used by Pare**

- **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week={N}&dates={season}`
- **Pare uses it for:** Home schedule, live scores (via /api/live/scoreboard), finals list for defense/L4, My Team + Leans byes
- **Code:** `lib/espnScoreboard.ts`, `lib/schedule.ts`, `lib/espnLive.ts`, `lib/espnStats.ts`, `lib/myteam/seasonSchedule.ts`
- **Cache:** 5 min (schedule) · 10s live / ≤5 min idle (live) · 6h per week (My Team)

#### week + season — 5 fields, 2 used

| Field | Status |
|---|---|
| `week.number` | ✅ Used |
| `season.year` | ✅ Used |
| `week.teamsOnBye` | ⬜ Not used |
| `leagues` | ⬜ Not used |
| `provider` | ⬜ Not used |

#### event — 6 fields, 2 used

| Field | Status |
|---|---|
| `id` | ✅ Used |
| `date` | ✅ Used |
| `name` | ⬜ Not used |
| `shortName` | ⬜ Not used |
| `uid` | ⬜ Not used |
| `links` | ⬜ Not used |

#### status — 9 fields, 4 used

| Field | Status |
|---|---|
| `status.type.name` | ✅ Used |
| `status.type.state` | ✅ Used |
| `status.type.completed` | ✅ Used |
| `status.type.shortDetail` | ✅ Used |
| `status.type.detail` | ⬜ Not used |
| `status.clock` | ⬜ Not used |
| `status.displayClock` | ⬜ Not used |
| `status.period` | ⬜ Not used |
| `status.isTBDFlex` | ⬜ Not used |

#### competitor — 16 fields, 5 used, 1 empty/wrong

> competitor.leaders (season QB/RB/WR leaders) only on scheduled games. statistics is always [].

| Field | Status |
|---|---|
| `homeAway` | ✅ Used |
| `team.abbreviation` | ✅ Used |
| `team.id` | ⬜ Not used |
| `team.displayName` | ⬜ Not used |
| `team.color` | ⬜ Not used |
| `team.alternateColor` | ⬜ Not used |
| `team.logo` | ⬜ Not used |
| `score` | ✅ Used |
| `winner` | ✅ Used |
| `records.overall` | ✅ Used |
| `records.home` | ⬜ Not used |
| `records.road` | ⬜ Not used |
| `linescores` | ⬜ Not used |
| `curatedRank` | ⬜ Not used |
| `competitor.leaders` | ⬜ Not used |
| `statistics` | ❌ Empty / wrong |

#### odds (scheduled games only) — 13 fields, 4 used

> spread is deliberately skipped; Pare parses details instead. Odds vanish once a game is final.

| Field | Status |
|---|---|
| `details` | ✅ Used |
| `overUnder` | ✅ Used |
| `spread` | ⬜ Not used |
| `moneyline.open` | ✅ Used |
| `moneyline.close` | ✅ Used |
| `pointSpread.open` | ⬜ Not used |
| `pointSpread.close` | ⬜ Not used |
| `total.open` | ⬜ Not used |
| `total.close` | ⬜ Not used |
| `favorite` | ⬜ Not used |
| `underdog` | ⬜ Not used |
| `favoriteAtOpen` | ⬜ Not used |
| `provider` | ⬜ Not used |

#### competition — 17 fields

| Field | Status |
|---|---|
| `id` | ⬜ Not used |
| `uid` | ⬜ Not used |
| `date` | ⬜ Not used |
| `attendance` | ⬜ Not used |
| `type` | ⬜ Not used |
| `timeValid` | ⬜ Not used |
| `neutralSite` | ⬜ Not used |
| `conferenceCompetition` | ⬜ Not used |
| `playByPlayAvailable` | ⬜ Not used |
| `recent` | ⬜ Not used |
| `notes` | ⬜ Not used |
| `format.regulation.periods` | ⬜ Not used |
| `format.overtime.periods` | ⬜ Not used |
| `startDate` | ⬜ Not used |
| `broadcast` | ⬜ Not used |
| `tickets.summary` | ⬜ Not used |
| `tickets.numberAvailable` | ⬜ Not used |

#### game extras — 16 fields, 1 used, 1 empty/wrong

> situation (down, distance, possession) appears only while a game is live. weather never appears here; use summary.gameInfo.weather pregame.

| Field | Status |
|---|---|
| `venue.fullName` | ⬜ Not used |
| `venue.address` | ⬜ Not used |
| `venue.indoor` | ⬜ Not used |
| `attendance` | ⬜ Not used |
| `neutralSite` | ⬜ Not used |
| `broadcasts` | ✅ Used |
| `geoBroadcasts` | ⬜ Not used |
| `tickets` | ⬜ Not used |
| `leaders.passingYards` | ⬜ Not used |
| `leaders.rushingYards` | ⬜ Not used |
| `leaders.receivingYards` | ⬜ Not used |
| `situation` | ✅ Used |
| `highlights` | ⬜ Not used |
| `headlines` | ⬜ Not used |
| `format` | ⬜ Not used |
| `weather` | ❌ Empty / wrong |

### Game summary (box score)

✅ **Used by Pare**

- **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={eventId}`
- **Pare uses it for:** Home post-game box score + Game details (team stats, quarters, scoring plays, win-prob line, defense, kicking, venue — `lib/gameExtras.ts`), Compare defense yards allowed, L4, My Team game log, Leans team log
- **Code:** `lib/espnBoxscore.ts`, `lib/gameSummary.ts`, `lib/espnStats.ts`, `lib/last4.ts`, `lib/myteam/gameLog.ts`
- **Cache:** 24h per final (team box) · 6h final / 60s otherwise (player box)
- **Notes:** One request returns everything below. Most of it is unused even though we already download it.

#### boxscore.teams[].statistics (25 rows; interceptions appears twice) — 24 fields, 14 used

| Field | Status |
|---|---|
| `firstDowns` | ✅ Used |
| `firstDownsPassing` | ⬜ Not used |
| `firstDownsRushing` | ⬜ Not used |
| `firstDownsPenalty` | ⬜ Not used |
| `thirdDownEff` | ✅ Used |
| `fourthDownEff` | ✅ Used |
| `totalOffensivePlays` | ✅ Used |
| `totalYards` | ✅ Used |
| `yardsPerPlay` | ✅ Used |
| `totalDrives` | ✅ Used |
| `netPassingYards` | ✅ Used |
| `completionAttempts` | ✅ Used |
| `yardsPerPass` | ⬜ Not used |
| `interceptions` | ✅ Used |
| `sacksYardsLost` | ✅ Used |
| `rushingYards` | ✅ Used |
| `rushingAttempts` | ✅ Used |
| `yardsPerRushAttempt` | ⬜ Not used |
| `redZoneAttempts` | ✅ Used |
| `totalPenaltiesYards` | ✅ Used |
| `turnovers` | ✅ Used |
| `fumblesLost` | ✅ Used |
| `defensiveTouchdowns` | ⬜ Not used |
| `possessionTime` | ✅ Used |

#### players · passing — 8 fields, 4 used

| Field | Status |
|---|---|
| `completions/passingAttempts` | ✅ Used |
| `passingYards` | ✅ Used |
| `yardsPerPassAttempt` | ⬜ Not used |
| `passingTouchdowns` | ✅ Used |
| `interceptions` | ✅ Used |
| `sacks-sackYardsLost` | ⬜ Not used |
| `adjQBR` | ⬜ Not used |
| `QBRating` | ⬜ Not used |

#### players · rushing — 5 fields, 3 used

| Field | Status |
|---|---|
| `rushingAttempts` | ✅ Used |
| `rushingYards` | ✅ Used |
| `yardsPerRushAttempt` | ⬜ Not used |
| `rushingTouchdowns` | ✅ Used |
| `longRushing` | ⬜ Not used |

#### players · receiving — 6 fields, 4 used

| Field | Status |
|---|---|
| `receptions` | ✅ Used |
| `receivingYards` | ✅ Used |
| `yardsPerReception` | ⬜ Not used |
| `receivingTouchdowns` | ✅ Used |
| `longReception` | ⬜ Not used |
| `receivingTargets` | ✅ Used |

#### players · fumbles — 3 fields, 1 used

> fumblesLost is parsed but never shown in the stat line.

| Field | Status |
|---|---|
| `fumbles` | ⬜ Not used |
| `fumblesLost` | ✅ Used |
| `fumblesRecovered` | ⬜ Not used |

#### players · defensive — 7 fields

| Field | Status |
|---|---|
| `totalTackles` | ✅ Used |
| `soloTackles` | ⬜ Not used |
| `sacks` | ✅ Used |
| `tacklesForLoss` | ⬜ Not used |
| `passesDefended` | ⬜ Not used |
| `QBHits` | ⬜ Not used |
| `defensiveTouchdowns` | ⬜ Not used |

#### players · interceptions — 3 fields

| Field | Status |
|---|---|
| `interceptions` | ✅ Used |
| `interceptionYards` | ⬜ Not used |
| `interceptionTouchdowns` | ⬜ Not used |

#### players · kick + punt returns — 10 fields

| Field | Status |
|---|---|
| `kickReturns` | ⬜ Not used |
| `kickReturnYards` | ⬜ Not used |
| `yardsPerKickReturn` | ⬜ Not used |
| `longKickReturn` | ⬜ Not used |
| `kickReturnTouchdowns` | ⬜ Not used |
| `puntReturns` | ⬜ Not used |
| `puntReturnYards` | ⬜ Not used |
| `yardsPerPuntReturn` | ⬜ Not used |
| `longPuntReturn` | ⬜ Not used |
| `puntReturnTouchdowns` | ⬜ Not used |

#### players · kicking + punting — 11 fields

| Field | Status |
|---|---|
| `fieldGoalsMade/fieldGoalAttempts` | ✅ Used |
| `fieldGoalPct` | ⬜ Not used |
| `longFieldGoalMade` | ✅ Used |
| `extraPointsMade/extraPointAttempts` | ✅ Used |
| `totalKickingPoints` | ⬜ Not used |
| `punts` | ⬜ Not used |
| `puntYards` | ⬜ Not used |
| `grossAvgPuntYards` | ⬜ Not used |
| `touchbacks` | ⬜ Not used |
| `puntsInside20` | ⬜ Not used |
| `longPunt` | ⬜ Not used |

#### drives[] + plays[] — 21 fields

| Field | Status |
|---|---|
| `drive.description` | ⬜ Not used |
| `drive.yards` | ⬜ Not used |
| `drive.offensivePlays` | ⬜ Not used |
| `drive.timeElapsed` | ⬜ Not used |
| `drive.result` | ⬜ Not used |
| `drive.isScore` | ⬜ Not used |
| `drive.start.yardLine` | ⬜ Not used |
| `drive.end.yardLine` | ⬜ Not used |
| `play.type` | ⬜ Not used |
| `play.text` | ⬜ Not used |
| `play.down` | ⬜ Not used |
| `play.distance` | ⬜ Not used |
| `play.yardLine` | ⬜ Not used |
| `play.yardsToEndzone` | ⬜ Not used |
| `play.statYardage` | ⬜ Not used |
| `play.isPenalty` | ⬜ Not used |
| `play.isTurnover` | ⬜ Not used |
| `play.scoringPlay` | ⬜ Not used |
| `play.homeScore` | ⬜ Not used |
| `play.awayScore` | ⬜ Not used |
| `play.wallclock` | ⬜ Not used |

#### play types seen — 18 fields

| Field | Status |
|---|---|
| `Kickoff` | ⬜ Not used |
| `Rush` | ⬜ Not used |
| `Pass Reception` | ⬜ Not used |
| `Pass Incompletion` | ⬜ Not used |
| `Pass Interception Return` | ⬜ Not used |
| `Passing Touchdown` | ⬜ Not used |
| `Rushing Touchdown` | ⬜ Not used |
| `Sack` | ⬜ Not used |
| `Punt` | ⬜ Not used |
| `Field Goal Good` | ⬜ Not used |
| `Penalty` | ⬜ Not used |
| `Timeout` | ⬜ Not used |
| `Official Timeout` | ⬜ Not used |
| `Two-minute warning` | ⬜ Not used |
| `End Period` | ⬜ Not used |
| `End of Half` | ⬜ Not used |
| `End of Game` | ⬜ Not used |
| `Fumble Recovery (Own)` | ⬜ Not used |

#### scoringPlays[] + winprobability[] — 11 fields

| Field | Status |
|---|---|
| `scoringPlay.type` | ✅ Used |
| `scoringPlay.text` | ✅ Used |
| `scoringPlay.awayScore` | ✅ Used |
| `scoringPlay.homeScore` | ✅ Used |
| `scoringPlay.period` | ✅ Used |
| `scoringPlay.clock` | ✅ Used |
| `scoringPlay.team` | ✅ Used |
| `scoringPlay.scoringType` | ⬜ Not used |
| `wp.homeWinPercentage` | ✅ Used |
| `wp.tiePercentage` | ⬜ Not used |
| `wp.playId` | ⬜ Not used |

#### pickcenter[] — 16 fields

> On finished games the moneyline and spread show OFF.

| Field | Status |
|---|---|
| `provider` | ⬜ Not used |
| `details` | ⬜ Not used |
| `overUnder` | ⬜ Not used |
| `spread` | ⬜ Not used |
| `overOdds` | ⬜ Not used |
| `underOdds` | ⬜ Not used |
| `awayTeamOdds.favorite` | ⬜ Not used |
| `awayTeamOdds.underdog` | ⬜ Not used |
| `awayTeamOdds.moneyLine` | ⬜ Not used |
| `awayTeamOdds.spreadOdds` | ⬜ Not used |
| `homeTeamOdds.moneyLine` | ⬜ Not used |
| `homeTeamOdds.spreadOdds` | ⬜ Not used |
| `favoriteAtOpen` | ⬜ Not used |
| `moneyline` | ⬜ Not used |
| `pointSpread` | ⬜ Not used |
| `total` | ⬜ Not used |

#### gameInfo + header + meta — 25 fields, 4 used

| Field | Status |
|---|---|
| `gameInfo.venue.fullName` | ✅ Used |
| `gameInfo.venue.address` | ✅ Used |
| `gameInfo.venue.grass` | ✅ Used |
| `gameInfo.attendance` | ⬜ Not used |
| `gameInfo.officials.fullName` | ⬜ Not used |
| `gameInfo.officials.position` | ⬜ Not used |
| `gameInfo.officials.order` | ⬜ Not used |
| `gameInfo.weather.temperature` | ✅ Used |
| `gameInfo.weather.highTemperature` | ⬜ Not used |
| `gameInfo.weather.lowTemperature` | ⬜ Not used |
| `gameInfo.weather.conditionId` | ⬜ Not used |
| `gameInfo.weather.gust` | ✅ Used |
| `gameInfo.weather.precipitation` | ✅ Used |
| `header.week` | ✅ Used |
| `header.season.year` | ✅ Used |
| `header.competitions.competitors.score` | ✅ Used |
| `header.competitions.status` | ✅ Used |
| `header.competitions.possession` | ⬜ Not used |
| `header.competitions.boxscoreSource` | ⬜ Not used |
| `header.competitions.playByPlaySource` | ⬜ Not used |
| `header.competitions.commentaryAvailable` | ⬜ Not used |
| `meta.gameState` | ⬜ Not used |
| `meta.firstPlayWallClock` | ⬜ Not used |
| `meta.lastPlayWallClock` | ⬜ Not used |
| `meta.syncUrl` | ⬜ Not used |

#### predictor + lastFiveGames (pregame) — 9 fields

| Field | Status |
|---|---|
| `predictor.header` | ⬜ Not used |
| `predictor.homeTeam.gameProjection` | ⬜ Not used |
| `predictor.awayTeam.gameProjection` | ⬜ Not used |
| `lastFive.week` | ⬜ Not used |
| `lastFive.atVs` | ⬜ Not used |
| `lastFive.gameDate` | ⬜ Not used |
| `lastFive.score` | ⬜ Not used |
| `lastFive.gameResult` | ⬜ Not used |
| `lastFive.opponent` | ⬜ Not used |

#### game sections — 20 fields, 2 used, 2 empty/wrong

> predictor, gameInfo.weather and lastFiveGames appear only before kickoff. injuries shows today's injuries, not the injuries as of that game. odds is always []; use pickcenter.

| Field | Status |
|---|---|
| `scoringPlays` | ✅ Used |
| `winprobability` | ✅ Used |
| `leaders(sacks,totalTackles…)` | ⬜ Not used |
| `pickcenter` | ⬜ Not used |
| `gameInfo.venue` | ✅ Used |
| `gameInfo.attendance` | ⬜ Not used |
| `gameInfo.officials` | ⬜ Not used |
| `gameInfo.weather` | ✅ Used |
| `predictor` | ⬜ Not used |
| `lastFiveGames` | ⬜ Not used |
| `injuries` | ⬜ Not used |
| `news` | ⬜ Not used |
| `article.headline` | ✅ Used |
| `videos` | ⬜ Not used |
| `header` | ✅ Used |
| `standings` | ⬜ Not used |
| `broadcasts` | ⬜ Not used |
| `meta` | ⬜ Not used |
| `odds` | ❌ Empty / wrong |
| `againstTheSpread` | ❌ Empty / wrong |

### Team season stats (curated)

⬜ **Available, not used**

- **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}/statistics?season={yr}`
- **Notes:** A smaller list (167 stats, per-game values, no league rank) than the Core endpoint, with own and opponent in one response. Adds combined strings: completionAttempts, sacksYardsLost, thirdDownEff, fourthDownEff, totalPenaltiesYards, fumblesAndLost.

#### combined fields only here — 13 fields, 2 empty/wrong

> Two opponent values are wrong (fumblesForced = 110, redzoneEfficiencyPct = 0).

| Field | Status |
|---|---|
| `completionAttempts` | ⬜ Not used |
| `sacksYardsLost` | ⬜ Not used |
| `thirdDownEff` | ⬜ Not used |
| `fourthDownEff` | ⬜ Not used |
| `totalPenaltiesYards` | ⬜ Not used |
| `totalInterceptionsYards` | ⬜ Not used |
| `fumblesAndLost` | ⬜ Not used |
| `totalPuntReturnsYards` | ⬜ Not used |
| `totalKickoffYards` | ⬜ Not used |
| `totalGoalsVsAttemps` | ⬜ Not used |
| `totalPuntsYards` | ⬜ Not used |
| `opponent.fumblesForced` | ❌ Empty / wrong |
| `opponent.redzoneEfficiencyPct` | ❌ Empty / wrong |

### Teams + team page

⬜ **Available, not used**

- **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams  ·  /teams/{id}`
- **Notes:** Team identity plus a record block with splits. Logos and colors are trademarked; see config/teamIdentity.ts.

#### team — 13 fields

| Field | Status |
|---|---|
| `abbreviation` | ⬜ Not used |
| `displayName` | ⬜ Not used |
| `shortDisplayName` | ⬜ Not used |
| `nickname` | ⬜ Not used |
| `location` | ⬜ Not used |
| `slug` | ⬜ Not used |
| `color` | ⬜ Not used |
| `alternateColor` | ⬜ Not used |
| `logos` | ⬜ Not used |
| `franchise` | ⬜ Not used |
| `groups` | ⬜ Not used |
| `standingSummary` | ⬜ Not used |
| `nextEvent` | ⬜ Not used |

#### record.items (total) — 24 fields

| Field | Status |
|---|---|
| `wins` | ⬜ Not used |
| `losses` | ⬜ Not used |
| `ties` | ⬜ Not used |
| `winPercent` | ⬜ Not used |
| `OTWins` | ⬜ Not used |
| `OTLosses` | ⬜ Not used |
| `gamesPlayed` | ⬜ Not used |
| `points` | ⬜ Not used |
| `pointsFor` | ⬜ Not used |
| `pointsAgainst` | ⬜ Not used |
| `avgPointsFor` | ⬜ Not used |
| `avgPointsAgainst` | ⬜ Not used |
| `pointDifferential` | ⬜ Not used |
| `differential` | ⬜ Not used |
| `streak` | ⬜ Not used |
| `playoffSeed` | ⬜ Not used |
| `gamesBehind` | ⬜ Not used |
| `divisionWins` | ⬜ Not used |
| `divisionLosses` | ⬜ Not used |
| `divisionTies` | ⬜ Not used |
| `divisionRecord` | ⬜ Not used |
| `divisionWinPercent` | ⬜ Not used |
| `leagueWinPercent` | ⬜ Not used |
| `lockedDivRank` | ⬜ Not used |

#### record.items (splits) — 4 fields

| Field | Status |
|---|---|
| `home.wins` | ⬜ Not used |
| `home.losses` | ⬜ Not used |
| `road.wins` | ⬜ Not used |
| `road.losses` | ⬜ Not used |

### Roster

⬜ **Available, not used**

- **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}/roster`

#### athlete — 23 fields

| Field | Status |
|---|---|
| `id` | ⬜ Not used |
| `fullName` | ⬜ Not used |
| `displayName` | ⬜ Not used |
| `shortName` | ⬜ Not used |
| `firstName` | ⬜ Not used |
| `lastName` | ⬜ Not used |
| `jersey` | ⬜ Not used |
| `position` | ⬜ Not used |
| `age` | ⬜ Not used |
| `dateOfBirth` | ⬜ Not used |
| `height` | ⬜ Not used |
| `displayHeight` | ⬜ Not used |
| `weight` | ⬜ Not used |
| `displayWeight` | ⬜ Not used |
| `college` | ⬜ Not used |
| `birthPlace` | ⬜ Not used |
| `experience` | ⬜ Not used |
| `headshot` | ⬜ Not used |
| `injuries` | ⬜ Not used |
| `status` | ⬜ Not used |
| `contract` | ⬜ Not used |
| `contracts` | ⬜ Not used |
| `alternateIds` | ⬜ Not used |

#### groups — 7 fields

| Field | Status |
|---|---|
| `offense` | ⬜ Not used |
| `defense` | ⬜ Not used |
| `specialTeam` | ⬜ Not used |
| `injuredReserveOrOut` | ⬜ Not used |
| `suspended` | ⬜ Not used |
| `practiceSquad` | ⬜ Not used |
| `coach` | ⬜ Not used |

### Team schedule

⬜ **Available, not used**

- **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}/schedule?season={yr}`

#### events[] — 12 fields

| Field | Status |
|---|---|
| `week` | ⬜ Not used |
| `date` | ⬜ Not used |
| `opponent` | ⬜ Not used |
| `competitors.score` | ⬜ Not used |
| `competitors.record` | ⬜ Not used |
| `competitors.winner` | ⬜ Not used |
| `boxscoreAvailable` | ⬜ Not used |
| `broadcasts` | ⬜ Not used |
| `venue` | ⬜ Not used |
| `status` | ⬜ Not used |
| `byeWeek` | ⬜ Not used |
| `requestedSeason` | ⬜ Not used |

### Depth chart

⬜ **Available, not used**

- **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}/depthcharts?season={yr}`
- **Notes:** Three charts per team, each slot listing athletes in order with injury tags.

#### offense (3WR 1TE) — 12 fields

| Field | Status |
|---|---|
| `qb` | ⬜ Not used |
| `rb` | ⬜ Not used |
| `fb` | ⬜ Not used |
| `wr1` | ⬜ Not used |
| `wr2` | ⬜ Not used |
| `wr3` | ⬜ Not used |
| `te` | ⬜ Not used |
| `lt` | ⬜ Not used |
| `lg` | ⬜ Not used |
| `c` | ⬜ Not used |
| `rg` | ⬜ Not used |
| `rt` | ⬜ Not used |

#### defense (base) — 12 fields

| Field | Status |
|---|---|
| `lde` | ⬜ Not used |
| `nt` | ⬜ Not used |
| `rde` | ⬜ Not used |
| `wlb` | ⬜ Not used |
| `lilb` | ⬜ Not used |
| `rilb` | ⬜ Not used |
| `slb` | ⬜ Not used |
| `lcb` | ⬜ Not used |
| `ss` | ⬜ Not used |
| `fs` | ⬜ Not used |
| `rcb` | ⬜ Not used |
| `nb` | ⬜ Not used |

#### special teams — 6 fields

| Field | Status |
|---|---|
| `pk` | ⬜ Not used |
| `p` | ⬜ Not used |
| `h` | ⬜ Not used |
| `pr` | ⬜ Not used |
| `kr` | ⬜ Not used |
| `ls` | ⬜ Not used |

### League injuries

⬜ **Available, not used**

- **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries`
- **Notes:** Evaluated for My Team and rejected; Sleeper's injury_status is used instead (DATA_SOURCES.md §5). Has return dates Sleeper lacks.

#### injury — 14 fields

| Field | Status |
|---|---|
| `status` | ⬜ Not used |
| `date` | ⬜ Not used |
| `shortComment` | ⬜ Not used |
| `longComment` | ⬜ Not used |
| `type.name` | ⬜ Not used |
| `type.abbreviation` | ⬜ Not used |
| `details.fantasyStatus` | ⬜ Not used |
| `details.type` | ⬜ Not used |
| `details.location` | ⬜ Not used |
| `details.detail` | ⬜ Not used |
| `details.side` | ⬜ Not used |
| `details.returnDate` | ⬜ Not used |
| `athlete` | ⬜ Not used |
| `source` | ⬜ Not used |

### News + transactions + groups

⬜ **Available, not used**

- **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/news  ·  /transactions  ·  /groups`

#### news — 8 fields

| Field | Status |
|---|---|
| `headline` | ⬜ Not used |
| `description` | ⬜ Not used |
| `published` | ⬜ Not used |
| `images` | ⬜ Not used |
| `byline` | ⬜ Not used |
| `categories` | ⬜ Not used |
| `premium` | ⬜ Not used |
| `links` | ⬜ Not used |

#### transactions (paged) — 3 fields

| Field | Status |
|---|---|
| `date` | ⬜ Not used |
| `description` | ⬜ Not used |
| `team` | ⬜ Not used |

#### groups — 3 fields

| Field | Status |
|---|---|
| `conference` | ⬜ Not used |
| `division` | ⬜ Not used |
| `teams` | ⬜ Not used |

### Team leaders (site.web)

⬜ **Available, not used**

- **URL:** `https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}/athletes/statistics?season={yr}`

#### results[] by category — 9 fields

| Field | Status |
|---|---|
| `passing` | ⬜ Not used |
| `rushing` | ⬜ Not used |
| `receiving` | ⬜ Not used |
| `defensive` | ⬜ Not used |
| `kicking` | ⬜ Not used |
| `punting` | ⬜ Not used |
| `returning` | ⬜ Not used |
| `scoring` | ⬜ Not used |
| `teamTotals` | ⬜ Not used |

### Game page mirror

⬜ **Available, not used**

- **URL:** `https://cdn.espn.com/core/nfl/game?xhr=1&gameId={id}`
- **Notes:** Same content as /summary inside gamepackageJSON. Only useful as a backup host.

### Empty or dead (site)

❌ **Empty, dead or wrong — don't use**

- **URL:** `returns {} · 404`

#### don't use — 6 fields, 6 empty/wrong

| Field | Status |
|---|---|
| `/teams/{id}/injuries` | ❌ Empty / wrong |
| `/teams/{id}/news` | ❌ Empty / wrong |
| `/teams/{id}/record` | ❌ Empty / wrong |
| `/teams/{id}/leaders` | ❌ Empty / wrong |
| `/calendar` | ❌ Empty / wrong |
| `/athletes/{id}` | ❌ Empty / wrong |

---

## ESPN · Standings

Base: `https://site.api.espn.com/apis/v2/sports/football/nfl`

### Standings

✅ **Used by Pare**

- **URL:** `https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season={yr}  (&level=3 for divisions)`
- **Pare uses it for:** Standings tab; Compare defense points allowed + W-L under each team
- **Code:** `lib/standings.ts`, `lib/espnStats.ts`
- **Cache:** no-store, last-good on failure (Standings) · 10 min (Compare)

#### entries[].stats — 22 fields, 11 used

> avgPointsFor / avgPointsAgainst are only on the team record, not here.

| Field | Status |
|---|---|
| `wins` | ✅ Used |
| `losses` | ✅ Used |
| `ties` | ✅ Used |
| `winPercent` | ✅ Used |
| `pointsFor` | ✅ Used |
| `pointsAgainst` | ✅ Used |
| `pointDifferential` | ✅ Used |
| `differential` | ✅ Used |
| `streak` | ✅ Used |
| `divisionRecord` | ✅ Used |
| `playoffSeed` | ✅ Used |
| `clincher` | ✅ Used |
| `gamesBehind` | ⬜ Not used |
| `divisionWins` | ⬜ Not used |
| `divisionLosses` | ⬜ Not used |
| `divisionTies` | ⬜ Not used |
| `lockedDivRank` | ⬜ Not used |
| `overall` | ⬜ Not used |
| `Home` | ✅ Used |
| `Road` | ✅ Used |
| `vs.Div.` | ⬜ Not used |
| `vs.Conf.` | ✅ Used |

---

## ESPN · Core API

Base: `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl`

### Team season stats (288 stats, with league rank)

✅ **Used by Pare**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{yr}/types/2/teams/{id}/statistics`
- **Pare uses it for:** Compare offense (season mode): 30 fields via ESPN_FIELD_MAP + 3 derived (yds/play, explosive plays, possession minutes) since 2026-10-23
- **Code:** `lib/espnStats.ts:52-72`
- **Cache:** 10 min (fetch + route ISR)
- **Notes:** Each stat carries value, displayValue, perGameValue, rank and rankDisplayValue. Pare computes ranks itself (useRanking). Gold marks the exact category Pare reads each stat from, so interceptions under defensiveInterceptions (INTs made) stay unused.

#### general — 14 fields, 2 used, 5 empty/wrong

| Field | Status |
|---|---|
| `fumbles` | ⬜ Not used |
| `fumblesLost` | ✅ Used |
| `fumblesForced` | ⬜ Not used |
| `defensiveFumblesForced` | ⬜ Not used |
| `miscFumblesForced` | ❌ Empty / wrong |
| `specialTeamsFumblesForced` | ⬜ Not used |
| `fumblesRecovered` | ⬜ Not used |
| `fumblesTouchdowns` | ❌ Empty / wrong |
| `gamesPlayed` | ✅ Used |
| `offensiveTwoPtReturns` | ❌ Empty / wrong |
| `offensiveFumblesTouchdowns` | ❌ Empty / wrong |
| `defensiveFumblesTouchdowns` | ❌ Empty / wrong |
| `totalPenalties` | ✅ Used |
| `totalPenaltyYards` | ✅ Used |

#### passing — 47 fields, 9 used, 7 empty/wrong

| Field | Status |
|---|---|
| `avgGain` | ❌ Empty / wrong |
| `completionPct` | ✅ Used |
| `completions` | ✅ Used |
| `ESPNQBRating` | ❌ Empty / wrong |
| `interceptionPct` | ⬜ Not used |
| `interceptions` | ✅ Used |
| `longPassing` | ⬜ Not used |
| `miscYards` | ❌ Empty / wrong |
| `netPassingYards` | ✅ Used |
| `netPassingYardsPerGame` | ⬜ Not used |
| `netTotalYards` | ✅ Used |
| `netYardsPerGame` | ⬜ Not used |
| `passingAttempts` | ✅ Used |
| `passingBigPlays` | ✅ Used |
| `passingFirstDowns` | ✅ Used |
| `passingFumbles` | ⬜ Not used |
| `passingFumblesLost` | ⬜ Not used |
| `passingTouchdownPct` | ⬜ Not used |
| `passingTouchdowns` | ✅ Used |
| `passingYards` | ⬜ Not used |
| `passingYardsAfterCatch` | ⬜ Not used |
| `passingYardsAtCatch` | ⬜ Not used |
| `passingYardsPerGame` | ⬜ Not used |
| `QBRating` | ✅ Used |
| `sacks` | ✅ Used |
| `sackYardsLost` | ⬜ Not used |
| `netPassingAttempts` | ⬜ Not used |
| `teamGamesPlayed` | ✅ Used |
| `totalOffensivePlays` | ✅ Used |
| `totalPoints` | ✅ Used |
| `totalPointsPerGame` | ⬜ Not used |
| `totalTouchdowns` | ⬜ Not used |
| `totalYards` | ⬜ Not used |
| `totalYardsFromScrimmage` | ⬜ Not used |
| `twoPointPassConvs` | ⬜ Not used |
| `twoPtPass` | ⬜ Not used |
| `twoPtPassAttempts` | ⬜ Not used |
| `yardsFromScrimmagePerGame` | ⬜ Not used |
| `yardsPerCompletion` | ⬜ Not used |
| `yardsPerGame` | ⬜ Not used |
| `yardsPerPassAttempt` | ⬜ Not used |
| `netYardsPerPassAttempt` | ✅ Used |
| `quarterbackRating` | ⬜ Not used |
| `offensiveSnapPct` | ❌ Empty / wrong |
| `targetSharePct` | ❌ Empty / wrong |
| `yardsPerRouteRun` | ❌ Empty / wrong |
| `avgDepthOfTarget` | ❌ Empty / wrong |

#### rushing — 29 fields, 3 used, 3 empty/wrong

| Field | Status |
|---|---|
| `avgGain` | ❌ Empty / wrong |
| `ESPNRBRating` | ❌ Empty / wrong |
| `longRushing` | ⬜ Not used |
| `miscYards` | ❌ Empty / wrong |
| `netTotalYards` | ⬜ Not used |
| `netYardsPerGame` | ⬜ Not used |
| `rushingAttempts` | ✅ Used |
| `rushingBigPlays` | ✅ Used |
| `rushingFirstDowns` | ✅ Used |
| `rushingFumbles` | ⬜ Not used |
| `rushingFumblesLost` | ⬜ Not used |
| `rushingTouchdowns` | ✅ Used |
| `rushingYards` | ✅ Used |
| `rushingYardsPerGame` | ⬜ Not used |
| `stuffs` | ⬜ Not used |
| `stuffYardsLost` | ⬜ Not used |
| `teamGamesPlayed` | ⬜ Not used |
| `totalOffensivePlays` | ⬜ Not used |
| `totalPoints` | ⬜ Not used |
| `totalPointsPerGame` | ⬜ Not used |
| `totalTouchdowns` | ⬜ Not used |
| `totalYards` | ⬜ Not used |
| `totalYardsFromScrimmage` | ⬜ Not used |
| `twoPointRushConvs` | ⬜ Not used |
| `twoPtRush` | ⬜ Not used |
| `twoPtRushAttempts` | ⬜ Not used |
| `yardsFromScrimmagePerGame` | ⬜ Not used |
| `yardsPerGame` | ⬜ Not used |
| `yardsPerRushAttempt` | ✅ Used |

#### receiving — 30 fields, 4 empty/wrong

| Field | Status |
|---|---|
| `avgGain` | ❌ Empty / wrong |
| `ESPNWRRating` | ❌ Empty / wrong |
| `longReception` | ⬜ Not used |
| `miscYards` | ❌ Empty / wrong |
| `netTotalYards` | ⬜ Not used |
| `netYardsPerGame` | ⬜ Not used |
| `receivingBigPlays` | ⬜ Not used |
| `receivingFirstDowns` | ⬜ Not used |
| `receivingFumbles` | ⬜ Not used |
| `receivingFumblesLost` | ⬜ Not used |
| `receivingTargets` | ⬜ Not used |
| `receivingTouchdowns` | ⬜ Not used |
| `receivingYards` | ⬜ Not used |
| `receivingYardsAfterCatch` | ⬜ Not used |
| `receivingYardsAtCatch` | ⬜ Not used |
| `receivingYardsPerGame` | ⬜ Not used |
| `receptions` | ⬜ Not used |
| `teamGamesPlayed` | ⬜ Not used |
| `totalOffensivePlays` | ⬜ Not used |
| `totalPoints` | ⬜ Not used |
| `totalPointsPerGame` | ⬜ Not used |
| `totalTouchdowns` | ⬜ Not used |
| `totalYards` | ⬜ Not used |
| `totalYardsFromScrimmage` | ⬜ Not used |
| `twoPointRecConvs` | ❌ Empty / wrong |
| `twoPtReception` | ⬜ Not used |
| `twoPtReceptionAttempts` | ⬜ Not used |
| `yardsFromScrimmagePerGame` | ⬜ Not used |
| `yardsPerGame` | ⬜ Not used |
| `yardsPerReception` | ⬜ Not used |

#### defensive (made by this team) — 28 fields, 7 empty/wrong

| Field | Status |
|---|---|
| `assistTackles` | ⬜ Not used |
| `avgInterceptionYards` | ⬜ Not used |
| `avgSackYards` | ⬜ Not used |
| `avgStuffYards` | ⬜ Not used |
| `blockedFieldGoalTouchdowns` | ⬜ Not used |
| `blockedPuntTouchdowns` | ⬜ Not used |
| `defensiveTouchdowns` | ⬜ Not used |
| `hurries` | ❌ Empty / wrong |
| `kicksBlocked` | ⬜ Not used |
| `longInterception` | ⬜ Not used |
| `miscTouchdowns` | ⬜ Not used |
| `passesBattedDown` | ❌ Empty / wrong |
| `passesDefended` | ⬜ Not used |
| `twoPtReturns` | ⬜ Not used |
| `sacks` | ⬜ Not used |
| `sackYards` | ⬜ Not used |
| `safeties` | ⬜ Not used |
| `soloTackles` | ⬜ Not used |
| `stuffs` | ⬜ Not used |
| `stuffYards` | ⬜ Not used |
| `tacklesForLoss` | ⬜ Not used |
| `teamGamesPlayed` | ⬜ Not used |
| `totalTackles` | ⬜ Not used |
| `yardsAllowed` | ❌ Empty / wrong |
| `pointsAllowed` | ❌ Empty / wrong |
| `onePtSafetiesMade` | ❌ Empty / wrong |
| `missedFieldGoalReturnTd` | ❌ Empty / wrong |
| `blockedPuntEzRecTd` | ❌ Empty / wrong |

#### defensiveInterceptions — 3 fields

| Field | Status |
|---|---|
| `interceptions` | ⬜ Not used |
| `interceptionTouchdowns` | ⬜ Not used |
| `interceptionYards` | ⬜ Not used |

#### kicking — 43 fields

| Field | Status |
|---|---|
| `avgKickoffReturnYards` | ⬜ Not used |
| `avgKickoffYards` | ⬜ Not used |
| `extraPointAttempts` | ⬜ Not used |
| `extraPointPct` | ⬜ Not used |
| `extraPointsBlocked` | ⬜ Not used |
| `extraPointsBlockedPct` | ⬜ Not used |
| `extraPointsMade` | ⬜ Not used |
| `fairCatches` | ⬜ Not used |
| `fairCatchPct` | ⬜ Not used |
| `fieldGoalAttempts` | ⬜ Not used |
| `fieldGoalAttempts1_19` | ⬜ Not used |
| `fieldGoalAttempts20_29` | ⬜ Not used |
| `fieldGoalAttempts30_39` | ⬜ Not used |
| `fieldGoalAttempts40_49` | ⬜ Not used |
| `fieldGoalAttempts50_59` | ⬜ Not used |
| `fieldGoalAttempts60_99` | ⬜ Not used |
| `fieldGoalAttempts50` | ⬜ Not used |
| `fieldGoalAttemptYards` | ⬜ Not used |
| `fieldGoalPct` | ⬜ Not used |
| `fieldGoalsBlocked` | ⬜ Not used |
| `fieldGoalsBlockedPct` | ⬜ Not used |
| `fieldGoalsMade` | ⬜ Not used |
| `fieldGoalsMade1_19` | ⬜ Not used |
| `fieldGoalsMade20_29` | ⬜ Not used |
| `fieldGoalsMade30_39` | ⬜ Not used |
| `fieldGoalsMade40_49` | ⬜ Not used |
| `fieldGoalsMade50_59` | ⬜ Not used |
| `fieldGoalsMade60_99` | ⬜ Not used |
| `fieldGoalsMade50` | ⬜ Not used |
| `fieldGoalsMadeYards` | ⬜ Not used |
| `fieldGoalsMissedYards` | ⬜ Not used |
| `kickoffReturns` | ⬜ Not used |
| `kickoffReturnTouchdowns` | ⬜ Not used |
| `kickoffReturnYards` | ⬜ Not used |
| `kickoffs` | ⬜ Not used |
| `kickoffYards` | ⬜ Not used |
| `longFieldGoalAttempt` | ⬜ Not used |
| `longFieldGoalMade` | ⬜ Not used |
| `longKickoff` | ⬜ Not used |
| `teamGamesPlayed` | ⬜ Not used |
| `totalKickingPoints` | ⬜ Not used |
| `touchbackPct` | ⬜ Not used |
| `touchbacks` | ⬜ Not used |

#### returning — 34 fields, 2 empty/wrong

| Field | Status |
|---|---|
| `defFumbleReturns` | ⬜ Not used |
| `defFumbleReturnYards` | ⬜ Not used |
| `fumbleRecoveries` | ⬜ Not used |
| `fumbleRecoveryYards` | ⬜ Not used |
| `kickReturnFairCatches` | ⬜ Not used |
| `kickReturnFairCatchPct` | ⬜ Not used |
| `kickReturnFumbles` | ⬜ Not used |
| `kickReturnFumblesLost` | ⬜ Not used |
| `kickReturns` | ⬜ Not used |
| `kickReturnTouchdowns` | ⬜ Not used |
| `kickReturnYards` | ⬜ Not used |
| `longKickReturn` | ⬜ Not used |
| `longPuntReturn` | ⬜ Not used |
| `miscFumbleReturns` | ⬜ Not used |
| `miscFumbleReturnYards` | ⬜ Not used |
| `oppFumbleRecoveries` | ⬜ Not used |
| `oppFumbleRecoveryYards` | ⬜ Not used |
| `oppSpecialTeamFumbleReturns` | ⬜ Not used |
| `oppSpecialTeamFumbleReturnYards` | ⬜ Not used |
| `puntReturnFairCatches` | ⬜ Not used |
| `puntReturnFairCatchPct` | ⬜ Not used |
| `puntReturnFumbles` | ⬜ Not used |
| `puntReturnFumblesLost` | ⬜ Not used |
| `puntReturns` | ⬜ Not used |
| `puntReturnsStartedInsideThe10` | ❌ Empty / wrong |
| `puntReturnsStartedInsideThe20` | ❌ Empty / wrong |
| `puntReturnTouchdowns` | ⬜ Not used |
| `puntReturnYards` | ⬜ Not used |
| `specialTeamFumbleReturns` | ⬜ Not used |
| `specialTeamFumbleReturnYards` | ⬜ Not used |
| `teamGamesPlayed` | ⬜ Not used |
| `yardsPerKickReturn` | ⬜ Not used |
| `yardsPerPuntReturn` | ⬜ Not used |
| `yardsPerReturn` | ⬜ Not used |

#### punting — 18 fields

| Field | Status |
|---|---|
| `avgPuntReturnYards` | ⬜ Not used |
| `fairCatches` | ⬜ Not used |
| `grossAvgPuntYards` | ⬜ Not used |
| `longPunt` | ⬜ Not used |
| `netAvgPuntYards` | ⬜ Not used |
| `puntReturns` | ⬜ Not used |
| `puntReturnYards` | ⬜ Not used |
| `punts` | ⬜ Not used |
| `puntsBlocked` | ⬜ Not used |
| `puntsBlockedPct` | ⬜ Not used |
| `puntsInside10` | ⬜ Not used |
| `puntsInside10Pct` | ⬜ Not used |
| `puntsInside20` | ⬜ Not used |
| `puntsInside20Pct` | ⬜ Not used |
| `puntYards` | ⬜ Not used |
| `teamGamesPlayed` | ⬜ Not used |
| `touchbackPct` | ⬜ Not used |
| `touchbacks` | ⬜ Not used |

#### scoring — 19 fields, 1 empty/wrong

| Field | Status |
|---|---|
| `defensivePoints` | ⬜ Not used |
| `fieldGoals` | ⬜ Not used |
| `kickExtraPoints` | ⬜ Not used |
| `kickExtraPointsMade` | ⬜ Not used |
| `miscPoints` | ⬜ Not used |
| `passingTouchdowns` | ⬜ Not used |
| `receivingTouchdowns` | ⬜ Not used |
| `returnTouchdowns` | ⬜ Not used |
| `rushingTouchdowns` | ⬜ Not used |
| `totalPoints` | ⬜ Not used |
| `totalPointsPerGame` | ⬜ Not used |
| `totalScoringPoints` | ⬜ Not used |
| `totalScoringTouchdowns` | ⬜ Not used |
| `totalTouchdowns` | ⬜ Not used |
| `totalTwoPointConvs` | ⬜ Not used |
| `twoPointPassConvs` | ⬜ Not used |
| `twoPointRecConvs` | ⬜ Not used |
| `twoPointRushConvs` | ⬜ Not used |
| `onePtSafetiesMade` | ❌ Empty / wrong |

#### miscellaneous — 23 fields, 3 used, 1 empty/wrong

> Season totalDrives is always 0, so turnover % and scoring % still need drive counts summed from box scores.

| Field | Status |
|---|---|
| `firstDowns` | ✅ Used |
| `firstDownsPassing` | ⬜ Not used |
| `firstDownsPenalty` | ✅ Used |
| `firstDownsPerGame` | ⬜ Not used |
| `firstDownsRushing` | ⬜ Not used |
| `fourthDownAttempts` | ⬜ Not used |
| `fourthDownConvPct` | ✅ Used |
| `fourthDownConvs` | ⬜ Not used |
| `fumblesLost` | ⬜ Not used |
| `possessionTimeSeconds` | ✅ Used |
| `redzoneEfficiencyPct` | ⬜ Not used |
| `redzoneFieldGoalPct` | ⬜ Not used |
| `redzoneScoringPct` | ⬜ Not used |
| `redzoneTouchdownPct` | ✅ Used |
| `thirdDownAttempts` | ⬜ Not used |
| `thirdDownConvPct` | ✅ Used |
| `thirdDownConvs` | ⬜ Not used |
| `totalGiveaways` | ✅ Used |
| `totalPenalties` | ✅ Used |
| `totalPenaltyYards` | ✅ Used |
| `totalTakeaways` | ✅ Used |
| `totalDrives` | ❌ Empty / wrong |
| `turnOverDifferential` | ✅ Used |

### Opponent split · the "allowed" side

✅ **Used by Pare** (since 2026-10-23: `fetchDefenseOpponentStats`, the allowed-only `DEFENSE_OPPONENT_FIELDS` merged into the defense route)

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{yr}/types/2/teams/{id}/statistics/900`
- **Notes:** Same 288 stat names as above, counted for this team's opponents. Checked live: DAL 2025 allowed 511 points; opponents' passing sacks = 35, which matches the sacks DAL made. One request per team would give every defense metric directly instead of standings plus summed box scores. /statistics/0 and ?opponent=true do NOT do this (they return the team's own stats).

#### highest-value "allowed" fields — 23 fields

> In this split, passing.sacks = sacks this defense made and totalGiveaways = turnovers it forced.

| Field | Status |
|---|---|
| `totalPoints` | ⬜ Not used |
| `netTotalYards` | ✅ Used |
| `netPassingYards` | ⬜ Not used |
| `rushingYards` | ⬜ Not used |
| `totalOffensivePlays` | ✅ Used |
| `firstDowns` | ✅ Used |
| `passingFirstDowns` | ✅ Used |
| `rushingFirstDowns` | ✅ Used |
| `thirdDownConvPct` | ⬜ Not used |
| `fourthDownConvPct` | ✅ Used |
| `redzoneScoringPct` | ⬜ Not used |
| `redzoneTouchdownPct` | ✅ Used |
| `netYardsPerPassAttempt` | ✅ Used |
| `yardsPerRushAttempt` | ✅ Used |
| `passingTouchdowns` | ✅ Used |
| `rushingTouchdowns` | ✅ Used |
| `completionPct` | ✅ Used |
| `passing.sacks` | ⬜ Not used |
| `passing.interceptions` | ⬜ Not used |
| `totalGiveaways` | ⬜ Not used |
| `passingBigPlays` | ✅ Used |
| `rushingBigPlays` | ✅ Used |
| `possessionTimeSeconds` | ✅ Used |

### Per-game team stats (310)

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{id}/competitions/{id}/competitors/{teamId}/statistics`
- **Notes:** Same categories as the season stats, per game, plus fields the season totals don't have. Pare's L4 and defense use /summary instead.

#### extras not in season totals — 26 fields

| Field | Status |
|---|---|
| `fumblesRecoveredYards` | ⬜ Not used |
| `QBHits` | ⬜ Not used |
| `sacksAssisted` | ⬜ Not used |
| `sacksUnassisted` | ⬜ Not used |
| `tacklesYardsLost` | ⬜ Not used |
| `kickoffOB` | ⬜ Not used |
| `puntsOver50` | ⬜ Not used |
| `redzoneAttempts` | ⬜ Not used |
| `redzoneConversion` | ⬜ Not used |
| `redzoneTouchdowns` | ⬜ Not used |
| `redzoneTouchdownPass` | ⬜ Not used |
| `redzoneTouchdownRush` | ⬜ Not used |
| `redzoneFieldGoals` | ⬜ Not used |
| `redzoneFieldGoalsMissed` | ⬜ Not used |
| `redzoneFumble` | ⬜ Not used |
| `redzoneInterception` | ⬜ Not used |
| `redzoneEndDowns` | ⬜ Not used |
| `redzoneEndHalf` | ⬜ Not used |
| `redzoneEndGame` | ⬜ Not used |
| `redzoneAttemptPoints` | ⬜ Not used |
| `redzoneTouchdownPoints` | ⬜ Not used |
| `redzoneFieldGoalPoints` | ⬜ Not used |
| `redzoneTotalPoints` | ⬜ Not used |
| `timeoutsUsed` | ⬜ Not used |
| `totalPlays` | ⬜ Not used |
| `totalDrives` | ⬜ Not used |

### Game odds (3 books)

✅ **Used by Pare**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{id}/competitions/{id}/odds`
- **Pare uses it for:** Home closing line on final games (fallback when the scoreboard has dropped odds)
- **Code:** `lib/schedule.ts:208-236`
- **Cache:** 6h
- **Notes:** Providers: DraftKings (100), ESPN BET (58), ESPN Bet Live (59) — which ones appear changes per game (the upcoming 2026 game had DraftKings only). Pare reads only the first item's details + overUnder. Upcoming probe: home spread open -3 → current +4.5.

#### line — 9 fields, 2 used

| Field | Status |
|---|---|
| `provider` | ✅ Used |
| `details` | ✅ Used |
| `overUnder` | ✅ Used |
| `spread` | ⬜ Not used |
| `overOdds` | ⬜ Not used |
| `underOdds` | ⬜ Not used |
| `moneylineWinner` | ⬜ Not used |
| `spreadWinner` | ⬜ Not used |
| `propBets` | ⬜ Not used — a `$ref` to the [propBets](#player--game-props-propbets) list |

#### prices (open / close / current) — 16 fields

> Each price comes as american, decimal and fraction.

| Field | Status |
|---|---|
| `open.total` | ✅ Used |
| `close.total` | ⬜ Not used |
| `current.total` | ✅ Used |
| `open.over` | ⬜ Not used |
| `open.under` | ⬜ Not used |
| `close.over` | ⬜ Not used |
| `close.under` | ⬜ Not used |
| `homeTeamOdds.moneyLine` | ✅ Used |
| `awayTeamOdds.moneyLine` | ✅ Used |
| `homeTeamOdds.spreadOdds` | ⬜ Not used |
| `awayTeamOdds.spreadOdds` | ⬜ Not used |
| `homeTeamOdds.open.pointSpread` | ✅ Used |
| `homeTeamOdds.close.pointSpread` | ⬜ Not used |
| `homeTeamOdds.current.pointSpread` | ✅ Used |
| `favorite` | ⬜ Not used |
| `underdog` | ⬜ Not used |

### Player + game props (propBets)

✅ **Used by Pare**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{id}/competitions/{id}/odds/{providerId}/propBets?limit=1000&page={n}`
- **Pare uses it for:** Leans props, auto-filled (types 12/13/14/20/31) — list PROP LEANS, game Props, prop screen
- **Code:** `lib/leans/propLines.ts`, `lib/leans/propLinesServer.ts`, `lib/leans/autoProps.ts`, `app/api/leans/props/route.ts`; backtest `scripts/leans-backtest.ts`
- **Cache:** 10 min per game (shared)
- **Notes:** Player, team and game prop lines from one book. ~1,044 items (upcoming 2026 game, DraftKings 100) and ~1,105 (2025 final, ESPN BET 58), 2 pages each. Still served for finished 2025 games, with the last pregame line in `current` — enough history for a backtest. Player name/position = follow the `athlete` `$ref`. Traps: see [Traps](#traps-found-while-probing) (provider per game, paging, alternate lines, partial prices).

#### item — 10 fields

> Each price comes as `american`, `decimal`, `fraction` and `value` (decimal). A finished game has no `close`.

| Field | Status |
|---|---|
| `athlete` | ✅ Used |
| `team` | ⬜ Not used |
| `type.id` | ✅ Used |
| `type.name` | ⬜ Not used |
| `open.target` | ✅ Used |
| `current.target` | ✅ Used |
| `open.over` / `open.under` | ✅ Used |
| `current.over` / `current.under` | ✅ Used |
| `lastUpdated` | ✅ Used |
| `provider` | ⬜ Not used |

#### markets (by `type.id`) — 8 fields

> 2026 DraftKings had 68 market types, 2025 ESPN BET 42. Names end in "(incl. overtime)" for full-game player totals.

| Field | Status |
|---|---|
| `8–24` player totals: pass yds/cmp/att/TD/INT, carries, rush yds, rec yds, receptions, longest pass/rush/rec, pass+rush, rush+rec, kicking pts, XP, FG | ✅ Used (12, 13, 14, 20 → Leans props) |
| `26–28`, `71` defensive player: tackles, tackles+assists, sacks, INTs (2025 only) | ⬜ Not used |
| `29–33`, `66`, `67`, `181` TD scorer: first, last, anytime, 2+, 3+, 1st half, 1st quarter, first team TD | ✅ Used (31 anytime TD, when posted) |
| `72–86` halves + quarters: total, moneyline, spread | ⬜ Not used |
| `98`, `99`, `104` team: total points, 1st-half points, total TDs | ⬜ Not used |
| `153` overtime yes/no | ⬜ Not used |
| `161–163` generic player / team / game props (2025 only) | ⬜ Not used |
| `186–216` 1st-half / 1st-quarter yardage + milestones (2026 DraftKings) | ⬜ Not used |

### Win probability (per play)

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{id}/competitions/{id}/probabilities`

#### item — 10 fields

| Field | Status |
|---|---|
| `homeWinPercentage` | ⬜ Not used |
| `awayWinPercentage` | ⬜ Not used |
| `tiePercentage` | ⬜ Not used |
| `secondsLeft` | ⬜ Not used |
| `spreadCoverProbHome` | ⬜ Not used |
| `spreadPushProb` | ⬜ Not used |
| `totalOverProb` | ⬜ Not used |
| `totalPushProb` | ⬜ Not used |
| `sequenceNumber` | ⬜ Not used |
| `play` | ⬜ Not used |

### Matchup predictor

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{id}/competitions/{id}/predictor`
- **Notes:** Works before and after the game (summary.predictor is pregame only).

#### per team — 12 fields, 1 empty/wrong

| Field | Status |
|---|---|
| `gameProjection` | ✅ Used |
| `matchupQuality` | ⬜ Not used |
| `teamPredPtDiff` | ✅ Used |
| `teamChanceLoss` | ⬜ Not used |
| `teamChanceTie` | ⬜ Not used |
| `teamAvgWp` | ⬜ Not used |
| `teamOffEff` | ⬜ Not used |
| `teamDefEff` | ⬜ Not used |
| `teamSTEff` | ⬜ Not used |
| `teamTotEff` | ⬜ Not used |
| `oppSeasonStrengthRating` | ⬜ Not used |
| `oppSeasonStrengthFbsRank` | ❌ Empty / wrong |

### Live game details

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{id}/competitions/{id}/situation | drives | plays | officials | broadcasts`

#### situation — 7 fields

| Field | Status |
|---|---|
| `down` | ⬜ Not used |
| `distance` | ⬜ Not used |
| `yardLine` | ⬜ Not used |
| `isRedZone` | ⬜ Not used |
| `homeTimeouts` | ⬜ Not used |
| `awayTimeouts` | ⬜ Not used |
| `lastPlay` | ⬜ Not used |

#### plays — 6 fields

> Every play lists the athletes involved, each with their stats on that play.

| Field | Status |
|---|---|
| `shortText` | ⬜ Not used |
| `alternativeText` | ⬜ Not used |
| `scoreValue` | ⬜ Not used |
| `participants` | ⬜ Not used |
| `participants.stats` | ⬜ Not used |
| `probability` | ⬜ Not used |

### FPI · Football Power Index

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{yr}/powerindex  ·  /powerindex/{teamId}`
- **Notes:** ESPN's team model, updated daily. EPA by unit plus playoff odds.

#### predictives — 35 fields, 12 empty/wrong

| Field | Status |
|---|---|
| `fpi` | ⬜ Not used |
| `fpirank` | ⬜ Not used |
| `projectedw` | ⬜ Not used |
| `projectedl` | ⬜ Not used |
| `projectedt` | ⬜ Not used |
| `probwinout` | ⬜ Not used |
| `probwindiv` | ⬜ Not used |
| `probmakeplayoffs` | ⬜ Not used |
| `probmakedivplayoffs` | ⬜ Not used |
| `probmakeconfchamp` | ⬜ Not used |
| `probmaketitlegame` | ⬜ Not used |
| `probwintitle` | ⬜ Not used |
| `prob6wins` | ⬜ Not used |
| `avgingamewp` | ⬜ Not used |
| `avgingamewprank` | ⬜ Not used |
| `avgsosrank` | ⬜ Not used |
| `epaoffense` | ⬜ Not used |
| `epadefense` | ⬜ Not used |
| `epaspecialteams` | ⬜ Not used |
| `rankchange7days` | ⬜ Not used |
| `numwins` | ⬜ Not used |
| `numlosses` | ⬜ Not used |
| `numties` | ⬜ Not used |
| `record` | ❌ Empty / wrong |
| `probwinconf` | ❌ Empty / wrong |
| `sosremainingrank` | ❌ Empty / wrong |
| `accomplishment` | ❌ Empty / wrong |
| `accomplishmentrank` | ❌ Empty / wrong |
| `adjwins` | ❌ Empty / wrong |
| `adjlosses` | ❌ Empty / wrong |
| `adjwinpctrank` | ❌ Empty / wrong |
| `gamecontrol` | ❌ Empty / wrong |
| `gamecontrolrank` | ❌ Empty / wrong |
| `adjavgingamewp` | ❌ Empty / wrong |
| `adjavgingamewprank` | ❌ Empty / wrong |

#### efficiencies — 8 fields

| Field | Status |
|---|---|
| `offefficiency` | ⬜ Not used |
| `offefficiencyrank` | ⬜ Not used |
| `defefficiency` | ⬜ Not used |
| `defefficiencyrank` | ⬜ Not used |
| `stefficiency` | ⬜ Not used |
| `stefficiencyrank` | ⬜ Not used |
| `totefficiency` | ⬜ Not used |
| `totefficiencyrank` | ⬜ Not used |

### ESPN QBR + EPA

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{yr}/types/2/groups/9/qbr/10000 (weekly)  ·  /qbr/0 (season)`

#### per QB — 19 fields

> schedAdjQBR = Total QBR; cwepaTotal = total EPA; qbpaa = points added.

| Field | Status |
|---|---|
| `schedAdjQBR` | ⬜ Not used |
| `qbr` | ⬜ Not used |
| `qbpaa` | ⬜ Not used |
| `cwepaTotal` | ⬜ Not used |
| `cwepaPasses` | ⬜ Not used |
| `cwepaPassesCondensed` | ⬜ Not used |
| `cwepaRushes` | ⬜ Not used |
| `cwepaRuns` | ⬜ Not used |
| `cwepaScrambles` | ⬜ Not used |
| `cwepaSacked` | ⬜ Not used |
| `cwepaSackedCondensed` | ⬜ Not used |
| `cwepaInterceptions` | ⬜ Not used |
| `cwepaFumbles` | ⬜ Not used |
| `cwepaPenalties` | ⬜ Not used |
| `cwepaYardsAfterCarry` | ⬜ Not used |
| `actionPlays` | ⬜ Not used |
| `cwAverage` | ⬜ Not used |
| `avgOppDQBR` | ⬜ Not used |
| `unqualifiedRank` | ⬜ Not used |

### Athlete season + game stats

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{yr}/types/2/athletes/{id}/statistics  ·  /events/{e}/competitions/{e}/competitors/{t}/roster/{athlete}/statistics/0`
- **Notes:** Season returns only the categories that apply to that player (QB: 166 stats). Game returns 146 stats with TD-distance buckets. Same names as team stats plus the extras below.

#### player-only extras — 5 fields

| Field | Status |
|---|---|
| `QBR` | ⬜ Not used |
| `adjQBR` | ⬜ Not used |
| `QBHits` | ⬜ Not used |
| `tacklesYardsLost` | ⬜ Not used |
| `fumblesRecoveredYards` | ⬜ Not used |

#### per-game TD buckets — 10 fields

> Buckets exist for every range for passing, rushing and receiving.

| Field | Status |
|---|---|
| `passingTouchdownsOf0to9Yds` | ⬜ Not used |
| `passingTouchdownsOf10to19Yds` | ⬜ Not used |
| `passingTouchdownsOf20to29Yds` | ⬜ Not used |
| `passingTouchdownsOf30to39Yds` | ⬜ Not used |
| `passingTouchdownsOf40to49Yds` | ⬜ Not used |
| `passingTouchdownsOf50PlusYds` | ⬜ Not used |
| `rushingTouchdownsOf0to9Yds` | ⬜ Not used |
| `rushingTouchdownsOf50PlusYds` | ⬜ Not used |
| `receivingTouchdownsOf0to9Yds` | ⬜ Not used |
| `receivingTouchdownsOf50PlusYds` | ⬜ Not used |

#### game roster entry — 6 fields

| Field | Status |
|---|---|
| `playerId` | ⬜ Not used |
| `starter` | ⬜ Not used |
| `jersey` | ⬜ Not used |
| `didNotPlay` | ⬜ Not used |
| `active` | ⬜ Not used |
| `position` | ⬜ Not used |

### Athlete profile + logs

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{yr}/athletes/{id}  ·  /eventlog  ·  /athletes/{id}/statisticslog  ·  /contracts`
- **Notes:** Use the season-scoped eventlog path; /athletes/{id}/eventlog?season= ignores the season.

### Leaders

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{yr}/types/2/leaders  ·  /teams/{id}/leaders`
- **Notes:** Top 25 per category. Pare's Leaders tab uses the web byathlete table instead (it supports rookie scans).

#### league categories — 16 fields

| Field | Status |
|---|---|
| `passingYards` | ⬜ Not used |
| `rushingYards` | ⬜ Not used |
| `receivingYards` | ⬜ Not used |
| `totalTackles` | ⬜ Not used |
| `sacks` | ⬜ Not used |
| `kickoffYards` | ⬜ Not used |
| `interceptions` | ⬜ Not used |
| `passingTouchdowns` | ⬜ Not used |
| `quarterbackRating` | ⬜ Not used |
| `rushingTouchdowns` | ⬜ Not used |
| `receptions` | ⬜ Not used |
| `receivingTouchdowns` | ⬜ Not used |
| `totalPoints` | ⬜ Not used |
| `totalTouchdowns` | ⬜ Not used |
| `puntYards` | ⬜ Not used |
| `passesDefended` | ⬜ Not used |

### Futures

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{yr}/futures`
- **Notes:** 2026 (probed 2026-10-23): 19 markets from DraftKings. Shape: `items[].name` + `futures[].provider` + `futures[].books[] = { athlete or team $ref, value: "+185" }` (American odds as a string). The season-yardage markets were in an earlier probe and aren't in 2026 yet.

#### markets — 14 fields

| Field | Status |
|---|---|
| `MVP` | ⬜ Not used |
| `OPOY` | ⬜ Not used |
| `DPOY` | ⬜ Not used |
| `OROY` | ⬜ Not used |
| `DROY` | ⬜ Not used |
| `CoachOfTheYear` | ⬜ Not used |
| `ComebackPlayer` | ⬜ Not used |
| `SuperBowlWinner` | ⬜ Not used |
| `AFCWinner` | ⬜ Not used |
| `NFCWinner` | ⬜ Not used |
| `DivisionWinners(8)` | ⬜ Not used |
| `TeamToWinMostGames` | ⬜ Not used |
| `SeasonRushingYards` | ⬜ Not used |
| `SeasonReceivingYards` | ⬜ Not used |
| `SeasonRushingTDs` | ⬜ Not used |

### Team + season structure

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{yr}/types/2/teams/{id}/record | attendance  ·  /seasons/{yr}/teams/{id}/depthcharts | events | athletes | coaches  ·  /teams/{id}/injuries`

#### records — 6 fields

| Field | Status |
|---|---|
| `total` | ⬜ Not used |
| `home` | ⬜ Not used |
| `road` | ⬜ Not used |
| `vs.Div.` | ⬜ Not used |
| `vs.Conf.` | ⬜ Not used |
| `clincher` | ⬜ Not used |

#### attendance — 4 fields, 1 empty/wrong

| Field | Status |
|---|---|
| `games` | ⬜ Not used |
| `total` | ⬜ Not used |
| `avg` | ⬜ Not used |
| `pct` | ❌ Empty / wrong |

### Draft, transactions, awards, misc

⬜ **Available, not used**

- **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{yr}/draft | draft/rounds | draft/athletes  ·  /seasons/{yr}/transactions | awards  ·  talentpicks  ·  franchises/{id}  ·  venues/{id}  ·  positions`

### Empty or dead (core)

❌ **Empty, dead or wrong — don't use**

- **URL:** `count 0 · 404`

#### don't use — 13 fields, 13 empty/wrong

> odds-records is 404 for 2025 and returns impossible records for 2026.

| Field | Status |
|---|---|
| `teams/{id}/ats` | ❌ Empty / wrong |
| `odds-records` | ❌ Empty / wrong |
| `teams/{id}/ranks` | ❌ Empty / wrong |
| `teams/{id}/notes` | ❌ Empty / wrong |
| `teams/{id}/awards` | ❌ Empty / wrong |
| `teams/{id}/transactions` | ❌ Empty / wrong |
| `seasons/{yr}/rankings` | ❌ Empty / wrong |
| `powerindex/leaders` | ❌ Empty / wrong |
| `freeagents` | ❌ Empty / wrong |
| `types/2/powerindex` | ❌ Empty / wrong |
| `athletes/{id}/injuries` | ❌ Empty / wrong |
| `athletes/{id}/notes` | ❌ Empty / wrong |
| `athletes/{id}/projections` | ❌ Empty / wrong |

---

## ESPN · Web API

Base: `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl`

### Player stats table (byathlete)

✅ **Used by Pare**

- **URL:** `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byathlete?isqualified=false&limit={25|300}&sort={category}.{stat}:desc`
- **Pare uses it for:** Leaders tab: 12 boards + rookie versions
- **Code:** `lib/leaders.ts:106-122`
- **Cache:** 30 min (unstable_cache) · page ISR 5 min
- **Notes:** 2,185 players with isqualified=false. Each row has totals, values and league ranks.

#### passing — 14 fields, 2 used

| Field | Status |
|---|---|
| `completions` | ⬜ Not used |
| `passingAttempts` | ⬜ Not used |
| `completionPct` | ⬜ Not used |
| `passingYards` | ✅ Used |
| `yardsPerPassAttempt` | ⬜ Not used |
| `passingYardsPerGame` | ⬜ Not used |
| `longPassing` | ⬜ Not used |
| `passingTouchdowns` | ✅ Used |
| `interceptions` | ⬜ Not used |
| `sacks` | ⬜ Not used |
| `sackYardsLost` | ⬜ Not used |
| `QBR` | ⬜ Not used |
| `QBRating` | ⬜ Not used |
| `adjQBR` | ⬜ Not used |

#### rushing — 10 fields, 2 used

| Field | Status |
|---|---|
| `rushingAttempts` | ⬜ Not used |
| `rushingYards` | ✅ Used |
| `yardsPerRushAttempt` | ⬜ Not used |
| `longRushing` | ⬜ Not used |
| `rushingBigPlays` | ⬜ Not used |
| `rushingTouchdowns` | ✅ Used |
| `rushingYardsPerGame` | ⬜ Not used |
| `rushingFumbles` | ⬜ Not used |
| `rushingFumblesLost` | ⬜ Not used |
| `rushingFirstDowns` | ⬜ Not used |

#### receiving — 12 fields, 2 used

| Field | Status |
|---|---|
| `receptions` | ✅ Used |
| `receivingTargets` | ⬜ Not used |
| `receivingYards` | ✅ Used |
| `yardsPerReception` | ⬜ Not used |
| `receivingTouchdowns` | ✅ Used |
| `longReception` | ⬜ Not used |
| `receivingBigPlays` | ⬜ Not used |
| `receivingYardsPerGame` | ⬜ Not used |
| `receivingFumbles` | ⬜ Not used |
| `receivingFumblesLost` | ⬜ Not used |
| `receivingYardsAfterCatch` | ⬜ Not used |
| `receivingFirstDowns` | ⬜ Not used |

#### defensive + interceptions — 11 fields, 3 used

| Field | Status |
|---|---|
| `soloTackles` | ⬜ Not used |
| `assistTackles` | ⬜ Not used |
| `totalTackles` | ✅ Used |
| `sacks` | ✅ Used |
| `sackYards` | ⬜ Not used |
| `tacklesForLoss` | ✅ Used |
| `passesDefended` | ✅ Used |
| `longInterception` | ⬜ Not used |
| `interceptions` | ✅ Used |
| `interceptionYards` | ⬜ Not used |
| `interceptionTouchdowns` | ⬜ Not used |

#### general + scoring — 11 fields

| Field | Status |
|---|---|
| `gamesPlayed` | ⬜ Not used |
| `fumblesForced` | ⬜ Not used |
| `fumblesRecovered` | ⬜ Not used |
| `fumblesTouchdowns` | ⬜ Not used |
| `returnTouchdowns` | ⬜ Not used |
| `totalTouchdowns` | ⬜ Not used |
| `fieldGoals` | ⬜ Not used |
| `kickExtraPoints` | ⬜ Not used |
| `totalTwoPointConvs` | ⬜ Not used |
| `totalPoints` | ⬜ Not used |
| `totalPointsPerGame` | ⬜ Not used |

#### kicking — 12 fields, 1 used

| Field | Status |
|---|---|
| `fieldGoalsMade` | ✅ Used |
| `fieldGoalAttempts` | ⬜ Not used |
| `fieldGoalPct` | ⬜ Not used |
| `longFieldGoalMade` | ⬜ Not used |
| `fieldGoalsMade1_19` | ⬜ Not used |
| `fieldGoalsMade20_29` | ⬜ Not used |
| `fieldGoalsMade30_39` | ⬜ Not used |
| `fieldGoalsMade40_49` | ⬜ Not used |
| `fieldGoalsMade50` | ⬜ Not used |
| `extraPointsMade` | ⬜ Not used |
| `extraPointAttempts` | ⬜ Not used |
| `extraPointPct` | ⬜ Not used |

#### punting — 12 fields, 1 used

| Field | Status |
|---|---|
| `punts` | ⬜ Not used |
| `puntYards` | ⬜ Not used |
| `longPunt` | ⬜ Not used |
| `grossAvgPuntYards` | ✅ Used |
| `netAvgPuntYards` | ⬜ Not used |
| `puntsBlocked` | ⬜ Not used |
| `puntsInside20` | ⬜ Not used |
| `touchbacks` | ⬜ Not used |
| `fairCatches` | ⬜ Not used |
| `puntReturns` | ⬜ Not used |
| `puntReturnYards` | ⬜ Not used |
| `avgPuntReturnYards` | ⬜ Not used |

#### returning — 11 fields, 1 used

| Field | Status |
|---|---|
| `kickReturns` | ⬜ Not used |
| `kickReturnYards` | ⬜ Not used |
| `yardsPerKickReturn` | ⬜ Not used |
| `longKickReturn` | ⬜ Not used |
| `kickReturnTouchdowns` | ⬜ Not used |
| `puntReturns` | ⬜ Not used |
| `puntReturnYards` | ✅ Used |
| `yardsPerPuntReturn` | ⬜ Not used |
| `longPuntReturn` | ⬜ Not used |
| `puntReturnTouchdowns` | ⬜ Not used |
| `puntReturnFairCatches` | ⬜ Not used |

### Team stats table (byteam) · all 32, own + opponent

⬜ **Available, not used**

- **URL:** `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byteam?season={yr}&seasontype=2`
- **Notes:** One request returns all 32 teams, each category twice (splitId 0 = own, 900 = opponent) with league ranks. That replaces 32 Core calls. Fewer fields than Core: no red zone, no possession time.

#### passing (21) — 21 fields

| Field | Status |
|---|---|
| `totalYards` | ⬜ Not used |
| `yardsPerGame` | ⬜ Not used |
| `netPassingYards` | ⬜ Not used |
| `netPassingYardsPerGame` | ⬜ Not used |
| `totalPoints` | ⬜ Not used |
| `totalPointsPerGame` | ⬜ Not used |
| `completions` | ⬜ Not used |
| `passingYards` | ⬜ Not used |
| `passingYardsPerGame` | ⬜ Not used |
| `passingAttempts` | ⬜ Not used |
| `completionPct` | ⬜ Not used |
| `netTotalYards` | ⬜ Not used |
| `netYardsPerGame` | ⬜ Not used |
| `netYardsPerPassAttempt` | ⬜ Not used |
| `yardsPerPassAttempt` | ⬜ Not used |
| `longPassing` | ⬜ Not used |
| `passingTouchdowns` | ⬜ Not used |
| `interceptions` | ⬜ Not used |
| `sacks` | ⬜ Not used |
| `sackYardsLost` | ⬜ Not used |
| `QBRating` | ⬜ Not used |

#### rushing + receiving — 16 fields

| Field | Status |
|---|---|
| `rushingYards` | ⬜ Not used |
| `rushingYardsPerGame` | ⬜ Not used |
| `rushingAttempts` | ⬜ Not used |
| `yardsPerRushAttempt` | ⬜ Not used |
| `longRushing` | ⬜ Not used |
| `rushingTouchdowns` | ⬜ Not used |
| `rushingFumbles` | ⬜ Not used |
| `rushingFumblesLost` | ⬜ Not used |
| `receptions` | ⬜ Not used |
| `receivingYards` | ⬜ Not used |
| `yardsPerReception` | ⬜ Not used |
| `longReception` | ⬜ Not used |
| `receivingTouchdowns` | ⬜ Not used |
| `receivingFumbles` | ⬜ Not used |
| `receivingFumblesLost` | ⬜ Not used |
| `receivingYardsPerGame` | ⬜ Not used |

#### miscellaneous — 15 fields

| Field | Status |
|---|---|
| `firstDowns` | ⬜ Not used |
| `firstDownsRushing` | ⬜ Not used |
| `firstDownsPassing` | ⬜ Not used |
| `firstDownsPenalty` | ⬜ Not used |
| `thirdDownConvs` | ⬜ Not used |
| `thirdDownAttempts` | ⬜ Not used |
| `thirdDownConvPct` | ⬜ Not used |
| `fourthDownConvs` | ⬜ Not used |
| `fourthDownAttempts` | ⬜ Not used |
| `fourthDownConvPct` | ⬜ Not used |
| `totalPenalties` | ⬜ Not used |
| `totalPenaltyYards` | ⬜ Not used |
| `turnOverDifferential` | ⬜ Not used |
| `totalTakeaways` | ⬜ Not used |
| `totalGiveaways` | ⬜ Not used |

#### other — 7 fields

| Field | Status |
|---|---|
| `gamesPlayed` | ⬜ Not used |
| `fumblesRecovered` | ⬜ Not used |
| `fumblesLost` | ⬜ Not used |
| `interceptions(defensive)` | ⬜ Not used |
| `returning` | ⬜ Not used |
| `kicking` | ⬜ Not used |
| `punting` | ⬜ Not used |

### Player page

⬜ **Available, not used**

- **URL:** `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/{id}  ·  /gamelog?season=  ·  /splits?season=  ·  /stats  ·  /overview  ·  /bio`

#### gamelog (QB columns) — 19 fields

> Columns change by position.

| Field | Status |
|---|---|
| `completions` | ⬜ Not used |
| `passingAttempts` | ⬜ Not used |
| `passingYards` | ⬜ Not used |
| `completionPct` | ⬜ Not used |
| `yardsPerPassAttempt` | ⬜ Not used |
| `passingTouchdowns` | ⬜ Not used |
| `interceptions` | ⬜ Not used |
| `longPassing` | ⬜ Not used |
| `sacks` | ⬜ Not used |
| `QBRating` | ⬜ Not used |
| `adjQBR` | ⬜ Not used |
| `rushingAttempts` | ⬜ Not used |
| `rushingYards` | ⬜ Not used |
| `yardsPerRushAttempt` | ⬜ Not used |
| `rushingTouchdowns` | ⬜ Not used |
| `longRushing` | ⬜ Not used |
| `events.opponent` | ⬜ Not used |
| `events.gameResult` | ⬜ Not used |
| `events.score` | ⬜ Not used |

#### splits that work — 17 fields

| Field | Status |
|---|---|
| `split` | ⬜ Not used |
| `byOutcome` | ⬜ Not used |
| `byVictoryMargin` | ⬜ Not used |
| `byClose` | ⬜ Not used |
| `bySeasonGames` | ⬜ Not used |
| `byMonth` | ⬜ Not used |
| `byDayOfWeek` | ⬜ Not used |
| `byLocation` | ⬜ Not used |
| `byWeather` | ⬜ Not used |
| `byDepthChart` | ⬜ Not used |
| `byGroup` | ⬜ Not used |
| `byOpponent` | ⬜ Not used |
| `byHalf` | ⬜ Not used |
| `byQuarter` | ⬜ Not used |
| `byDown` | ⬜ Not used |
| `byPtDiff` | ⬜ Not used |
| `byFieldPosition` | ⬜ Not used |

#### splits that come back empty — 11 fields, 11 empty/wrong

| Field | Status |
|---|---|
| `byPassAttempts` | ❌ Empty / wrong |
| `byRushAttempts` | ❌ Empty / wrong |
| `byDownAndLength` | ❌ Empty / wrong |
| `byDownAndDistance` | ❌ Empty / wrong |
| `byWinningPtDiff` | ❌ Empty / wrong |
| `byLosingPtDiff` | ❌ Empty / wrong |
| `byOffensiveFormation` | ❌ Empty / wrong |
| `byWrFormation` | ❌ Empty / wrong |
| `byTeFormation` | ❌ Empty / wrong |
| `byOffensiveMotion` | ❌ Empty / wrong |
| `byDefensiveMotion` | ❌ Empty / wrong |

#### career /stats categories — 50 fields

> Plus kicking, punting and returning categories (same names as byathlete).

| Field | Status |
|---|---|
| `gamesPlayed` | ⬜ Not used |
| `completions` | ⬜ Not used |
| `passingAttempts` | ⬜ Not used |
| `completionPct` | ⬜ Not used |
| `passingYards` | ⬜ Not used |
| `yardsPerPassAttempt` | ⬜ Not used |
| `passingTouchdowns` | ⬜ Not used |
| `interceptions` | ⬜ Not used |
| `longPassing` | ⬜ Not used |
| `sacks` | ⬜ Not used |
| `QBRating` | ⬜ Not used |
| `adjQBR` | ⬜ Not used |
| `rushingAttempts` | ⬜ Not used |
| `rushingYards` | ⬜ Not used |
| `yardsPerRushAttempt` | ⬜ Not used |
| `rushingTouchdowns` | ⬜ Not used |
| `longRushing` | ⬜ Not used |
| `rushingFirstDowns` | ⬜ Not used |
| `rushingFumbles` | ⬜ Not used |
| `rushingFumblesLost` | ⬜ Not used |
| `receptions` | ⬜ Not used |
| `receivingTargets` | ⬜ Not used |
| `receivingYards` | ⬜ Not used |
| `yardsPerReception` | ⬜ Not used |
| `receivingTouchdowns` | ⬜ Not used |
| `longReception` | ⬜ Not used |
| `receivingFirstDowns` | ⬜ Not used |
| `receivingFumbles` | ⬜ Not used |
| `receivingFumblesLost` | ⬜ Not used |
| `totalTackles` | ⬜ Not used |
| `soloTackles` | ⬜ Not used |
| `assistTackles` | ⬜ Not used |
| `sacks` | ⬜ Not used |
| `fumblesForced` | ⬜ Not used |
| `fumblesRecovered` | ⬜ Not used |
| `fumblesRecoveredYards` | ⬜ Not used |
| `interceptionYards` | ⬜ Not used |
| `avgInterceptionYards` | ⬜ Not used |
| `interceptionTouchdowns` | ⬜ Not used |
| `longInterception` | ⬜ Not used |
| `passesDefended` | ⬜ Not used |
| `stuffs` | ⬜ Not used |
| `stuffYards` | ⬜ Not used |
| `kicksBlocked` | ⬜ Not used |
| `returnTouchdowns` | ⬜ Not used |
| `totalTouchdowns` | ⬜ Not used |
| `totalTwoPointConvs` | ⬜ Not used |
| `kickExtraPoints` | ⬜ Not used |
| `fieldGoals` | ⬜ Not used |
| `totalPoints` | ⬜ Not used |

#### root + bio — 9 fields

| Field | Status |
|---|---|
| `athlete.statsSummary` | ⬜ Not used |
| `displayDraft` | ⬜ Not used |
| `displayExperience` | ⬜ Not used |
| `playerSwitcher` | ⬜ Not used |
| `quicklinks` | ⬜ Not used |
| `standings` | ⬜ Not used |
| `videos` | ⬜ Not used |
| `awards` | ⬜ Not used |
| `teamHistory` | ⬜ Not used |

#### overview — 11 fields

| Field | Status |
|---|---|
| `statistics` | ⬜ Not used |
| `news` | ⬜ Not used |
| `nextGame` | ⬜ Not used |
| `gameLog` | ⬜ Not used |
| `rotowire.headline` | ⬜ Not used |
| `rotowire.story` | ⬜ Not used |
| `awards` | ⬜ Not used |
| `fantasy.draftRank` | ⬜ Not used |
| `fantasy.positionRank` | ⬜ Not used |
| `fantasy.percentOwned` | ⬜ Not used |
| `fantasy.projection` | ⬜ Not used |

### Dead (web)

❌ **Empty, dead or wrong — don't use**

- **URL:** `404 · 500`

#### don't use — 3 fields, 3 empty/wrong

| Field | Status |
|---|---|
| `/athletes/{id}/news` | ❌ Empty / wrong |
| `/athletes/{id}/vsathlete` | ❌ Empty / wrong |
| `/athletes/{id}/eventlog` | ❌ Empty / wrong |

---

## ESPN · Images

Base: `https://a.espncdn.com`

### Team logos

✅ **Used by Pare**

- **URL:** `https://a.espncdn.com/i/teamlogos/nfl/500/{abbr}.png  (WAS → wsh)`
- **Pare uses it for:** Leaders Fantasy boards
- **Code:** `lib/fantasy.ts:68-71`
- **Notes:** The only ESPN URL the browser loads. Logos are trademarks; flip config/teamIdentity.ts to 'name' before ads/Pro.

---

## Sleeper · v1 (documented)

Base: `https://api.sleeper.app/v1`

### Player map (~14.7 MB)

✅ **Used by Pare**

- **URL:** `https://api.sleeper.app/v1/players/nfl  (?position=QB&active=true filters)`
- **Pare uses it for:** Leaders Fantasy names + rookies, Home box-score join, My Team roster + injury tags, Leans names
- **Code:** `lib/fantasy.ts:112-160`
- **Cache:** 24h, trimmed, last-good
- **Notes:** 12,229 entries; 32 team defenses keyed by abbreviation.

#### player (53 keys) — 52 fields, 9 used

| Field | Status |
|---|---|
| `full_name` | ✅ Used |
| `first_name` | ✅ Used |
| `last_name` | ✅ Used |
| `position` | ✅ Used |
| `team` | ✅ Used |
| `years_exp` | ✅ Used |
| `espn_id` | ✅ Used |
| `injury_status` | ✅ Used |
| `fantasy_positions` | ✅ Used |
| `active` | ⬜ Not used |
| `age` | ⬜ Not used |
| `birth_date` | ⬜ Not used |
| `birth_city` | ⬜ Not used |
| `birth_state` | ⬜ Not used |
| `birth_country` | ⬜ Not used |
| `college` | ⬜ Not used |
| `high_school` | ⬜ Not used |
| `height` | ⬜ Not used |
| `weight` | ⬜ Not used |
| `number` | ⬜ Not used |
| `status` | ⬜ Not used |
| `depth_chart_order` | ⬜ Not used |
| `depth_chart_position` | ⬜ Not used |
| `injury_body_part` | ⬜ Not used |
| `injury_notes` | ⬜ Not used |
| `injury_start_date` | ⬜ Not used |
| `practice_participation` | ⬜ Not used |
| `practice_description` | ⬜ Not used |
| `news_updated` | ⬜ Not used |
| `search_rank` | ⬜ Not used |
| `search_full_name` | ⬜ Not used |
| `search_first_name` | ⬜ Not used |
| `search_last_name` | ⬜ Not used |
| `hashtag` | ⬜ Not used |
| `team_abbr` | ⬜ Not used |
| `team_changed_at` | ⬜ Not used |
| `player_id` | ⬜ Not used |
| `sport` | ⬜ Not used |
| `competitions` | ⬜ Not used |
| `metadata` | ⬜ Not used |
| `gsis_id` | ⬜ Not used |
| `sportradar_id` | ⬜ Not used |
| `stats_id` | ⬜ Not used |
| `rotowire_id` | ⬜ Not used |
| `rotoworld_id` | ⬜ Not used |
| `fantasy_data_id` | ⬜ Not used |
| `opta_id` | ⬜ Not used |
| `swish_id` | ⬜ Not used |
| `pandascore_id` | ⬜ Not used |
| `oddsjam_id` | ⬜ Not used |
| `kalshi_id` | ⬜ Not used |
| `player_shard` | ⬜ Not used |

#### value sets — 2 fields

| Field | Status |
|---|---|
| `injury_status:Questionable/Doubtful/Out/IR/PUP/Sus/NA/COV/DNR` | ⬜ Not used |
| `status:Active/Inactive/IR/PUP/NFI/PracticeSquad` | ⬜ Not used |

### Season stats

✅ **Used by Pare**

- **URL:** `https://api.sleeper.app/v1/stats/nfl/regular/{yr}`
- **Pare uses it for:** Leaders Fantasy (QB/RB/WR/TE/K/D-ST)
- **Code:** `lib/fantasy.ts:168-188`, `lib/fantasyPoints.ts`
- **Cache:** 30 min
- **Notes:** Flat map keyed by id: numeric = player, KC = D/ST unit, TEAM_KC = whole-team totals. Totals add weeks up, including *_lng and rates (wrong for those). Uses the stat keys listed under "Stat keys" below.

### Weekly stats

⬜ **Available, not used**

- **URL:** `https://api.sleeper.app/v1/stats/nfl/regular/{yr}/{week}`
- **Notes:** Documented fallback for the undocumented weekly route Pare uses. Same keys, no game/opponent context.

### Stat keys (all Sleeper stats routes · 260)

✅ **Used by Pare**

- **URL:** `shared by /stats season, weekly and api.sleeper.com`
- **Pare uses it for:** Fantasy points (pts_ppr + 3 per bonus flag), Leans (rush/rec yards, catches, TDs), My Team FPA (every key the league scores)
- **Code:** `lib/fantasyPoints.ts:19`, `lib/leans/players.ts:28-38`, `lib/myteam/fpa.ts:19-26`

#### fantasy points + ranks — 10 fields, 2 used

> Unranked weeks use 999.

| Field | Status |
|---|---|
| `pts_ppr` | ✅ Used |
| `pts_half_ppr` | ⬜ Not used |
| `pts_std` | ✅ Used |
| `pts_idp` | ⬜ Not used |
| `pos_rank_ppr` | ✅ Used |
| `pos_rank_half_ppr` | ⬜ Not used |
| `pos_rank_std` | ⬜ Not used |
| `rank_ppr` | ⬜ Not used |
| `rank_half_ppr` | ⬜ Not used |
| `rank_std` | ⬜ Not used |

#### snaps + games — 9 fields, 1 used

| Field | Status |
|---|---|
| `off_snp` | ✅ Used |
| `def_snp` | ⬜ Not used |
| `st_snp` | ⬜ Not used |
| `tm_off_snp` | ✅ Used |
| `tm_def_snp` | ⬜ Not used |
| `tm_st_snp` | ⬜ Not used |
| `gp` | ✅ Used |
| `gs` | ⬜ Not used |
| `gms_active` | ⬜ Not used |

#### passing (27) — 27 fields, 2 used

| Field | Status |
|---|---|
| `pass_att` | ⬜ Not used |
| `pass_cmp` | ⬜ Not used |
| `pass_inc` | ⬜ Not used |
| `cmp_pct` | ⬜ Not used |
| `pass_yd` | ⬜ Not used |
| `pass_td` | ⬜ Not used |
| `pass_int` | ⬜ Not used |
| `pass_int_td` | ⬜ Not used |
| `pass_2pt` | ⬜ Not used |
| `pass_fd` | ⬜ Not used |
| `pass_air_yd` | ⬜ Not used |
| `pass_lng` | ⬜ Not used |
| `pass_td_lng` | ⬜ Not used |
| `pass_ypa` | ⬜ Not used |
| `pass_ypc` | ⬜ Not used |
| `pass_rtg` | ⬜ Not used |
| `pass_rz_att` | ⬜ Not used |
| `pass_sack` | ⬜ Not used |
| `pass_sack_yds` | ⬜ Not used |
| `pass_cmp_40p` | ⬜ Not used |
| `pass_td_40p` | ⬜ Not used |
| `pass_td_50p` | ⬜ Not used |
| `pass_rush_yd` | ⬜ Not used |
| `bonus_pass_cmp_25` | ⬜ Not used |
| `bonus_pass_yd_300` | ✅ Used |
| `bonus_pass_yd_400` | ✅ Used |
| `bonus_fd_qb` | ⬜ Not used |

#### rushing (23) — 23 fields, 3 used

| Field | Status |
|---|---|
| `rush_att` | ⬜ Not used |
| `rush_yd` | ✅ Used |
| `rush_td` | ✅ Used |
| `rush_2pt` | ⬜ Not used |
| `rush_fd` | ⬜ Not used |
| `rush_lng` | ⬜ Not used |
| `rush_td_lng` | ⬜ Not used |
| `rush_ypa` | ⬜ Not used |
| `rush_yac` | ⬜ Not used |
| `rush_btkl` | ⬜ Not used |
| `rush_tkl_loss` | ⬜ Not used |
| `rush_tkl_loss_yd` | ⬜ Not used |
| `rush_rz_att` | ⬜ Not used |
| `rush_40p` | ⬜ Not used |
| `rush_td_40p` | ⬜ Not used |
| `rush_td_50p` | ⬜ Not used |
| `rush_rec_yd` | ⬜ Not used |
| `bonus_rush_att_20` | ⬜ Not used |
| `bonus_rush_yd_100` | ⬜ Not used |
| `bonus_rush_yd_200` | ✅ Used |
| `bonus_rush_rec_yd_100` | ⬜ Not used |
| `bonus_rush_rec_yd_200` | ⬜ Not used |
| `bonus_fd_rb` | ⬜ Not used |

#### receiving (29) — 29 fields, 4 used

| Field | Status |
|---|---|
| `rec` | ✅ Used |
| `rec_tgt` | ✅ Used |
| `rec_yd` | ✅ Used |
| `rec_td` | ✅ Used |
| `rec_2pt` | ⬜ Not used |
| `rec_fd` | ⬜ Not used |
| `rec_lng` | ⬜ Not used |
| `rec_td_lng` | ⬜ Not used |
| `rec_ypr` | ⬜ Not used |
| `rec_ypt` | ⬜ Not used |
| `rec_air_yd` | ✅ Used |
| `rec_yar` | ⬜ Not used |
| `rec_drop` | ⬜ Not used |
| `rec_rz_tgt` | ⬜ Not used |
| `rec_0_4` | ⬜ Not used |
| `rec_5_9` | ⬜ Not used |
| `rec_10_19` | ⬜ Not used |
| `rec_20_29` | ⬜ Not used |
| `rec_30_39` | ⬜ Not used |
| `rec_40p` | ⬜ Not used |
| `rec_td_40p` | ⬜ Not used |
| `rec_td_50p` | ⬜ Not used |
| `bonus_rec_rb` | ⬜ Not used |
| `bonus_rec_te` | ⬜ Not used |
| `bonus_rec_wr` | ⬜ Not used |
| `bonus_rec_yd_100` | ⬜ Not used |
| `bonus_rec_yd_200` | ✅ Used |
| `bonus_fd_te` | ⬜ Not used |
| `bonus_fd_wr` | ⬜ Not used |

#### kicking (26) — 26 fields

| Field | Status |
|---|---|
| `fga` | ⬜ Not used |
| `fgm` | ⬜ Not used |
| `fgm_0_19` | ⬜ Not used |
| `fgm_20_29` | ⬜ Not used |
| `fgm_30_39` | ⬜ Not used |
| `fgm_40_49` | ⬜ Not used |
| `fgm_50_59` | ⬜ Not used |
| `fgm_50p` | ⬜ Not used |
| `fgm_60p` | ⬜ Not used |
| `fgm_lng` | ⬜ Not used |
| `fgm_pct` | ⬜ Not used |
| `fgm_yds` | ⬜ Not used |
| `fgm_yds_over_30` | ⬜ Not used |
| `fgmiss` | ⬜ Not used |
| `fgmiss_20_29` | ⬜ Not used |
| `fgmiss_30_39` | ⬜ Not used |
| `fgmiss_40_49` | ⬜ Not used |
| `fgmiss_50_59` | ⬜ Not used |
| `fgmiss_50p` | ⬜ Not used |
| `fgmiss_60p` | ⬜ Not used |
| `fg_blkd` | ⬜ Not used |
| `xpa` | ⬜ Not used |
| `xpm` | ⬜ Not used |
| `xpmiss` | ⬜ Not used |
| `xp_blkd` | ⬜ Not used |
| `kick_pts` | ⬜ Not used |

#### punting — 6 fields

| Field | Status |
|---|---|
| `punts` | ⬜ Not used |
| `punt_yds` | ⬜ Not used |
| `punt_net_yd` | ⬜ Not used |
| `punt_in_20` | ⬜ Not used |
| `punt_tb` | ⬜ Not used |
| `punt_blkd` | ⬜ Not used |

#### IDP (per defender) — 21 fields

| Field | Status |
|---|---|
| `idp_tkl` | ⬜ Not used |
| `idp_tkl_solo` | ⬜ Not used |
| `idp_tkl_ast` | ⬜ Not used |
| `idp_tkl_loss` | ⬜ Not used |
| `idp_sack` | ⬜ Not used |
| `idp_sack_yd` | ⬜ Not used |
| `idp_qb_hit` | ⬜ Not used |
| `idp_int` | ⬜ Not used |
| `idp_int_ret_yd` | ⬜ Not used |
| `idp_pass_def` | ⬜ Not used |
| `idp_pass_def_3p` | ⬜ Not used |
| `idp_ff` | ⬜ Not used |
| `idp_fum_rec` | ⬜ Not used |
| `idp_fum_ret_yd` | ⬜ Not used |
| `idp_def_td` | ⬜ Not used |
| `idp_safe` | ⬜ Not used |
| `idp_blk_kick` | ⬜ Not used |
| `bonus_sack_2p` | ⬜ Not used |
| `bonus_tkl_10p` | ⬜ Not used |
| `bonus_def_int_td_50p` | ⬜ Not used |
| `bonus_def_fum_td_50p` | ⬜ Not used |

#### team D/ST unit (key = KC) — 27 fields

| Field | Status |
|---|---|
| `sack` | ⬜ Not used |
| `sack_yd` | ⬜ Not used |
| `qb_hit` | ⬜ Not used |
| `int` | ⬜ Not used |
| `int_ret_yd` | ⬜ Not used |
| `ff` | ⬜ Not used |
| `ff_misc` | ⬜ Not used |
| `fum_rec` | ⬜ Not used |
| `fum_ret_yd` | ⬜ Not used |
| `fum_rec_td` | ⬜ Not used |
| `tkl` | ⬜ Not used |
| `tkl_solo` | ⬜ Not used |
| `tkl_ast` | ⬜ Not used |
| `tkl_solo_misc` | ⬜ Not used |
| `tkl_ast_misc` | ⬜ Not used |
| `tkl_loss` | ⬜ Not used |
| `def_pass_def` | ⬜ Not used |
| `def_td` | ⬜ Not used |
| `def_2pt` | ⬜ Not used |
| `safe` | ⬜ Not used |
| `blk_kick` | ⬜ Not used |
| `blk_kick_ret_yd` | ⬜ Not used |
| `fg_ret_yd` | ⬜ Not used |
| `td` | ⬜ Not used |
| `def_3_and_out` | ⬜ Not used |
| `def_4_and_stop` | ⬜ Not used |
| `def_forced_punts` | ⬜ Not used |

#### points + yards allowed — 18 fields

| Field | Status |
|---|---|
| `pts_allow` | ⬜ Not used |
| `pts_allow_0` | ⬜ Not used |
| `pts_allow_1_6` | ⬜ Not used |
| `pts_allow_7_13` | ⬜ Not used |
| `pts_allow_14_20` | ⬜ Not used |
| `pts_allow_21_27` | ⬜ Not used |
| `pts_allow_28_34` | ⬜ Not used |
| `pts_allow_35p` | ⬜ Not used |
| `yds_allow` | ⬜ Not used |
| `yds_allow_0_100` | ⬜ Not used |
| `yds_allow_100_199` | ⬜ Not used |
| `yds_allow_200_299` | ⬜ Not used |
| `yds_allow_300_349` | ⬜ Not used |
| `yds_allow_350_399` | ⬜ Not used |
| `yds_allow_400_449` | ⬜ Not used |
| `yds_allow_450_499` | ⬜ Not used |
| `yds_allow_500_549` | ⬜ Not used |
| `yds_allow_550p` | ⬜ Not used |

#### fantasy points allowed (by position) — 7 fields

> Leans builds its own FPA table from player lines today; this is Sleeper's version.

| Field | Status |
|---|---|
| `fan_pts_allow` | ⬜ Not used |
| `fan_pts_allow_qb` | ⬜ Not used |
| `fan_pts_allow_rb` | ⬜ Not used |
| `fan_pts_allow_wr` | ⬜ Not used |
| `fan_pts_allow_te` | ⬜ Not used |
| `fan_pts_allow_k` | ⬜ Not used |
| `fan_pts_allow_def` | ⬜ Not used |

#### return defense + special teams — 31 fields

| Field | Status |
|---|---|
| `def_kr` | ⬜ Not used |
| `def_kr_yd` | ⬜ Not used |
| `def_kr_lng` | ⬜ Not used |
| `def_kr_ypa` | ⬜ Not used |
| `def_pr` | ⬜ Not used |
| `def_pr_yd` | ⬜ Not used |
| `def_pr_lng` | ⬜ Not used |
| `def_pr_ypa` | ⬜ Not used |
| `def_st_td` | ⬜ Not used |
| `def_st_ff` | ⬜ Not used |
| `def_st_fum_rec` | ⬜ Not used |
| `def_st_tkl_solo` | ⬜ Not used |
| `kr` | ⬜ Not used |
| `kr_yd` | ⬜ Not used |
| `kr_lng` | ⬜ Not used |
| `kr_td` | ⬜ Not used |
| `kr_ypa` | ⬜ Not used |
| `pr` | ⬜ Not used |
| `pr_yd` | ⬜ Not used |
| `pr_lng` | ⬜ Not used |
| `pr_td` | ⬜ Not used |
| `pr_ypa` | ⬜ Not used |
| `st_td` | ⬜ Not used |
| `st_ff` | ⬜ Not used |
| `st_fum_rec` | ⬜ Not used |
| `st_tkl_solo` | ⬜ Not used |
| `blk_kick_ret_td` | ⬜ Not used |
| `blk_pr_td` | ⬜ Not used |
| `misc_td` | ⬜ Not used |
| `misc_ret_yd` | ⬜ Not used |
| `fum_rec_ez_tds` | ⬜ Not used |

#### team efficiency (key = TEAM_KC) — 20 fields

> Use weekly rows; season rows add rates up (down_3_pct 756.67).

| Field | Status |
|---|---|
| `off_yd` | ⬜ Not used |
| `off_yd_per_play` | ⬜ Not used |
| `opp_off_yd` | ⬜ Not used |
| `opp_off_yd_per_play` | ⬜ Not used |
| `fd` | ⬜ Not used |
| `opp_fd` | ⬜ Not used |
| `opp_pass_fd` | ⬜ Not used |
| `opp_rush_fd` | ⬜ Not used |
| `down_3_att` | ⬜ Not used |
| `down_3_conv` | ⬜ Not used |
| `down_3_pct` | ⬜ Not used |
| `down_4_att` | ⬜ Not used |
| `down_4_conv` | ⬜ Not used |
| `down_4_pct` | ⬜ Not used |
| `g2g_att` | ⬜ Not used |
| `g2g_conv` | ⬜ Not used |
| `g2g_pct` | ⬜ Not used |
| `rz_att` | ⬜ Not used |
| `rz_conv` | ⬜ Not used |
| `rz_pct` | ⬜ Not used |

#### misc — 6 fields

| Field | Status |
|---|---|
| `anytime_tds` | ⬜ Not used |
| `first_td` | ⬜ Not used |
| `fum` | ⬜ Not used |
| `fum_lost` | ⬜ Not used |
| `penalty` | ⬜ Not used |
| `penalty_yd` | ⬜ Not used |

### Projections

⬜ **Available, not used**

- **URL:** `https://api.sleeper.app/v1/projections/nfl/regular/{yr}/{week}  ·  /projections/nfl/regular/{yr}`
- **Notes:** RotoWire projections. 96 keys a week: the same stat names minus snaps, air yards, red zone and team efficiency. Season projections add ADP.

#### projection-only — 14 fields

| Field | Status |
|---|---|
| `adp_dd_ppr` | ⬜ Not used |
| `pos_adp_dd_ppr` | ⬜ Not used |
| `adp_std` | ⬜ Not used |
| `adp_half_ppr` | ⬜ Not used |
| `adp_ppr` | ⬜ Not used |
| `adp_2qb` | ⬜ Not used |
| `adp_idp` | ⬜ Not used |
| `adp_idp_1qb` | ⬜ Not used |
| `adp_rookie` | ⬜ Not used |
| `adp_dynasty` | ⬜ Not used |
| `adp_dynasty_std` | ⬜ Not used |
| `adp_dynasty_half_ppr` | ⬜ Not used |
| `adp_dynasty_ppr` | ⬜ Not used |
| `adp_dynasty_2qb` | ⬜ Not used |

### Trending + NFL state

⬜ **Available, not used**

- **URL:** `https://api.sleeper.app/v1/players/nfl/trending/{add|drop}?lookback_hours=24&limit=25  ·  /state/nfl`

#### trending — 2 fields

| Field | Status |
|---|---|
| `player_id` | ✅ Used |
| `count` | ✅ Used |

#### state — 10 fields

| Field | Status |
|---|---|
| `week` | ⬜ Not used |
| `display_week` | ⬜ Not used |
| `season` | ⬜ Not used |
| `season_type` | ⬜ Not used |
| `previous_season` | ⬜ Not used |
| `season_start_date` | ⬜ Not used |
| `leg` | ⬜ Not used |
| `league_season` | ⬜ Not used |
| `league_create_season` | ⬜ Not used |
| `season_has_scores` | ⬜ Not used |

### My Team · user, leagues, league, rosters, matchups

✅ **Used by Pare**

- **URL:** `https://api.sleeper.app/v1/user/{name}  ·  /user/{id}/leagues/nfl/{yr}  ·  /league/{id}  ·  /rosters  ·  /matchups/{wk}`
- **Pare uses it for:** My Team (sign-in, league picker, start/sit, live scores)
- **Code:** `lib/myteam/sleeper/adapter.ts`
- **Cache:** 24h user · 1h leagues · 5 min rosters · 60s matchups

#### user — 11 fields, 3 used, 3 empty/wrong

> Private fields come back null.

| Field | Status |
|---|---|
| `user_id` | ✅ Used |
| `username` | ✅ Used |
| `display_name` | ✅ Used |
| `avatar` | ⬜ Not used |
| `metadata` | ⬜ Not used |
| `created` | ⬜ Not used |
| `is_bot` | ⬜ Not used |
| `deleted` | ⬜ Not used |
| `real_name` | ❌ Empty / wrong |
| `email` | ❌ Empty / wrong |
| `phone` | ❌ Empty / wrong |

#### league — 27 fields, 8 used

| Field | Status |
|---|---|
| `league_id` | ✅ Used |
| `name` | ✅ Used |
| `season` | ✅ Used |
| `season_type` | ⬜ Not used |
| `status` | ✅ Used |
| `sport` | ⬜ Not used |
| `total_rosters` | ✅ Used |
| `roster_positions` | ✅ Used |
| `scoring_settings` | ✅ Used |
| `metadata` | ⬜ Not used |
| `company_id` | ⬜ Not used |
| `group_id` | ⬜ Not used |
| `bracket_id` | ⬜ Not used |
| `loser_bracket_id` | ⬜ Not used |
| `settings.playoff_week_start` | ✅ Used |
| `settings.playoff_teams` | ⬜ Not used |
| `settings.num_teams` | ⬜ Not used |
| `settings.best_ball` | ⬜ Not used |
| `settings.waiver_type` | ⬜ Not used |
| `settings.waiver_budget` | ⬜ Not used |
| `settings.daily_waivers` | ⬜ Not used |
| `settings.trade_deadline` | ⬜ Not used |
| `settings.taxi_slots` | ⬜ Not used |
| `settings.reserve_slots` | ⬜ Not used |
| `draft_id` | ⬜ Not used |
| `previous_league_id` | ⬜ Not used |
| `avatar` | ⬜ Not used |

#### roster — 20 fields, 7 used

| Field | Status |
|---|---|
| `roster_id` | ✅ Used |
| `owner_id` | ✅ Used |
| `co_owners` | ✅ Used |
| `players` | ✅ Used |
| `starters` | ✅ Used |
| `reserve` | ✅ Used |
| `taxi` | ✅ Used |
| `keepers` | ⬜ Not used |
| `player_map` | ⬜ Not used |
| `settings.wins` | ✅ Used |
| `settings.losses` | ✅ Used |
| `settings.ties` | ✅ Used |
| `settings.fpts` | ✅ Used |
| `settings.fpts_against` | ⬜ Not used |
| `settings.ppts` | ✅ Used |
| `settings.waiver_position` | ⬜ Not used |
| `settings.waiver_budget_used` | ⬜ Not used |
| `settings.total_moves` | ⬜ Not used |
| `metadata.record` | ⬜ Not used |
| `metadata.streak` | ⬜ Not used |

#### matchup — 8 fields, 3 used

| Field | Status |
|---|---|
| `roster_id` | ✅ Used |
| `matchup_id` | ⬜ Not used |
| `points` | ✅ Used |
| `custom_points` | ⬜ Not used |
| `starters` | ⬜ Not used |
| `starters_points` | ⬜ Not used |
| `players` | ⬜ Not used |
| `players_points` | ✅ Used |

### League extras

⬜ **Available, not used**

- **URL:** `https://api.sleeper.app/v1/league/{id}/users | transactions/{wk} | traded_picks | drafts | winners_bracket | losers_bracket  ·  /draft/{id}/picks`

#### users — 5 fields

| Field | Status |
|---|---|
| `user_id` | ✅ Used |
| `display_name` | ✅ Used |
| `avatar` | ⬜ Not used |
| `is_owner` | ⬜ Not used |
| `metadata.team_name` | ✅ Used |

#### transactions — 10 fields

| Field | Status |
|---|---|
| `transaction_id` | ✅ Used |
| `type` | ✅ Used |
| `status` | ✅ Used |
| `created` | ✅ Used |
| `adds` | ✅ Used |
| `drops` | ✅ Used |
| `draft_picks` | ⬜ Not used |
| `waiver_budget` | ⬜ Not used |
| `settings.waiver_bid` | ⬜ Not used |
| `roster_ids` | ✅ Used |

#### drafts — 14 fields

| Field | Status |
|---|---|
| `draft_id` | ⬜ Not used |
| `league_id` | ⬜ Not used |
| `type` | ✅ Used |
| `status` | ✅ Used |
| `season` | ⬜ Not used |
| `start_time` | ⬜ Not used |
| `draft_order` | ⬜ Not used |
| `slot_to_roster_id` | ⬜ Not used |
| `last_picked` | ⬜ Not used |
| `metadata.name` | ⬜ Not used |
| `metadata.scoring_type` | ⬜ Not used |
| `settings.rounds` | ⬜ Not used |
| `settings.teams` | ⬜ Not used |
| `settings.pick_timer` | ⬜ Not used |

#### traded picks — 5 fields

| Field | Status |
|---|---|
| `season` | ⬜ Not used |
| `round` | ⬜ Not used |
| `roster_id` | ⬜ Not used |
| `owner_id` | ⬜ Not used |
| `previous_owner_id` | ⬜ Not used |

#### draft picks — 8 fields

| Field | Status |
|---|---|
| `pick_no` | ⬜ Not used |
| `round` | ⬜ Not used |
| `draft_slot` | ⬜ Not used |
| `roster_id` | ⬜ Not used |
| `picked_by` | ⬜ Not used |
| `player_id` | ⬜ Not used |
| `is_keeper` | ⬜ Not used |
| `metadata` | ⬜ Not used |

#### bracket — 9 fields

> The docs say loses_bracket; losers_bracket is the URL that works.

| Field | Status |
|---|---|
| `r` | ⬜ Not used |
| `m` | ⬜ Not used |
| `t1` | ⬜ Not used |
| `t2` | ⬜ Not used |
| `w` | ⬜ Not used |
| `l` | ⬜ Not used |
| `p` | ⬜ Not used |
| `t1_from` | ⬜ Not used |
| `t2_from` | ⬜ Not used |

---

## Sleeper · undocumented

Base: `https://api.sleeper.com`

### Weekly stat lines with game context

✅ **Used by Pare**

- **URL:** `https://api.sleeper.com/stats/nfl/{yr}/{week}?season_type=regular&position[]=QB&position[]=RB…`
- **Pare uses it for:** Home box-score fantasy points, Leans player lines + FPA, My Team FPA
- **Code:** `lib/myteam/sleeper/statLines.ts`
- **Cache:** 24h finished weeks · 30 min current week
- **Notes:** Rows carry the same stat keys as above, wrapped with game info and a player object.

#### wrapper — 16 fields, 6 used

| Field | Status |
|---|---|
| `player_id` | ✅ Used |
| `week` | ✅ Used |
| `team` | ✅ Used |
| `opponent` | ✅ Used |
| `player.position` | ✅ Used |
| `stats` | ✅ Used |
| `game_id` | ⬜ Not used |
| `date` | ⬜ Not used |
| `season` | ⬜ Not used |
| `season_type` | ⬜ Not used |
| `is_away_team` | ⬜ Not used |
| `company` | ⬜ Not used |
| `category` | ⬜ Not used |
| `updated_at` | ⬜ Not used |
| `last_modified` | ⬜ Not used |
| `status` | ⬜ Not used |

#### player object — 12 fields

| Field | Status |
|---|---|
| `first_name` | ⬜ Not used |
| `last_name` | ⬜ Not used |
| `position` | ⬜ Not used |
| `team` | ⬜ Not used |
| `years_exp` | ⬜ Not used |
| `fantasy_positions` | ⬜ Not used |
| `injury_status` | ⬜ Not used |
| `injury_body_part` | ⬜ Not used |
| `injury_notes` | ⬜ Not used |
| `injury_start_date` | ⬜ Not used |
| `news_updated` | ⬜ Not used |
| `metadata` | ⬜ Not used |

### Season totals table

⬜ **Available, not used**

- **URL:** `https://api.sleeper.com/stats/nfl/{yr}?season_type=regular&position[]=QB&order_by=pts_ppr`
- **Notes:** Season totals already sorted, with player info. Totals still add up *_lng and rate fields.

### One player's season by week

⬜ **Available, not used**

- **URL:** `https://api.sleeper.com/stats/nfl/player/{id}?season_type=regular&season={yr}&grouping=week|season`
- **Notes:** A player's game log in one call, each week with opponent and game_id.

### Projections with context

⬜ **Available, not used**

- **URL:** `https://api.sleeper.com/projections/nfl/{yr}/{week}?season_type=regular&position[]=WR  ·  /projections/nfl/player/{id}`
- **Notes:** RotoWire weekly projections with opponent and player info (company = rotowire).

### Roster % (owned / started)

⬜ **Available, not used**

- **URL:** `https://api.sleeper.app/players/nfl/research/regular/{yr}/{week}`
- **Notes:** No /v1 in the path (the /v1 version 404s).

#### per player — 2 fields

| Field | Status |
|---|---|
| `owned` | ⬜ Not used |
| `started` | ⬜ Not used |

### Schedule

⬜ **Available, not used**

- **URL:** `https://api.sleeper.com/schedule/nfl/regular/{yr}  ·  /schedule/nfl/post/{yr}`
- **Notes:** 272 games with Sleeper's game_id. No kickoff time, score or venue, so ESPN stays the schedule source.

#### game — 6 fields

| Field | Status |
|---|---|
| `game_id` | ⬜ Not used |
| `week` | ⬜ Not used |
| `date` | ⬜ Not used |
| `home` | ⬜ Not used |
| `away` | ⬜ Not used |
| `status` | ⬜ Not used |

### Single player

⬜ **Available, not used**

- **URL:** `https://api.sleeper.com/players/nfl/{id}`
- **Notes:** One player object, the same keys as the map.

---

_Generated 2026-10-23 from the live probe data. To update: edit the field lists, keep the page in sync, and re-check the ✅ marks against the code paths listed per endpoint._
