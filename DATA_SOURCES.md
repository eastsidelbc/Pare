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
| total_yards | `totalYards` (+ `yardsPerGame`) | passing/rushing | ✅ |
| pass_yds | `passingYards` (+ `passingYardsPerGame`) | passing | ✅ |
| rush_yds | `rushingYards` (+ `rushingYardsPerGame`) | rushing | ✅ |
| score_pct (Sc%) | ⚠️ no exact match | — | see gaps |

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

## 4. How this plugs into Pare (seams already in place)
- **Schedule:** `lib/schedule.ts` → `getCurrentWeekMatchups()` currently returns a
  mock. Replace its body with a fetch of the scoreboard endpoint, mapped to the
  existing `Matchup` shape. UI never changes.
- **Stats:** `lib/pfrCsv.ts` → `fetchAndParseCSV()` currently reads local CSV.
  Add an ESPN fetch that maps into the same `TeamStats` shape the parser outputs,
  so ranking/display/bar hooks are untouched.
- Keep a caching layer (the API routes already cache 6h) so we don't hammer ESPN.

_Last verified: 2026-09-14._

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
| ...weather | forecast, temp |
| ...leaders[] | per-game pass/rush/rec leaders |
