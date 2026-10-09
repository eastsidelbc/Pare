# 2026-10-07 — My Team data spike (P0a)

Plan: [`docs/plans/my-team-fantasy.md`](../plans/my-team-fantasy.md) · Script: [`scripts/my-team-spike.mjs`](../../scripts/my-team-spike.mjs) · Fixtures: [`lib/myteam/__fixtures__/`](../../lib/myteam/__fixtures__/)

The script was run once from the Windows PC with Kobe's username passed at run time.
- **Calls:** 24 sequential calls, ≥300 ms apart, all HTTP 200, plus 8 follow-up header-only requests.
- **Raw responses:** saved to the session scratchpad, outside the repo.
- **Fixtures:** anonymized:
  - names → `user_N` / `Team N` / `League A`
  - Sleeper user ids → `1000000000000000NN`
  - avatars → `null`
  - free-text roster nicknames and league chat metadata dropped
  - league, roster and player ids kept
- **Re-run:** `$env:SLEEPER_USER='<name>'; node scripts/my-team-spike.mjs` (optional `SLEEPER_LEAGUE`, `WEEK`, `SPIKE_RAW_DIR`).

Snapshot: 2026 season, ESPN week 5 = Sleeper week 5, last completed week 4. The fixture league is 10-team PPR (`rec=1`) superflex with `playoff_week_start=15`.

## Answers (P0a checklist)

### 1. Shapes
- **User:** `GET /v1/user/{username}` → `{ user_id, username, display_name, avatar, is_bot, … }`. The private-looking keys (`email`, `phone`, `real_name`, `token`, `cookies`) all come back `null` publicly. The adapter should whitelist fields anyway.
- **Unknown username:** returns **HTTP 200 with body `null`**, not a 404. The adapter must treat `null` as not-found.
- **Leagues:** `GET /v1/user/{user_id}/leagues/nfl/2026` → array with `league_id`, `name`, `status` (`in_season` seen), `total_rosters`, `settings`, `scoring_settings`, `roster_positions`, plus chat metadata (`last_message_*`, `last_author_*`, which we drop).
- **League:** `GET /v1/league/{id}`:
  - `scoring_settings`: 133 keys in the fixture league.
  - `roster_positions`: includes `FLEX` and `SUPER_FLEX`; `BN` slots are listed individually.
  - `settings.playoff_week_start`.
- **Rosters:** `GET /v1/league/{id}/rosters` → `{ roster_id, owner_id, co_owners, players[], starters[], reserve (IR), taxi, keepers, player_map, settings, metadata }`.
  - My roster is found via `owner_id` (or `co_owners` contains the user id).
  - Starters is an ordered list aligned to `roster_positions`.
  - Roster `metadata` can hold free-text `p_nick_*` nicknames, which are dropped from the fixtures.
- **Co-owners:** the field exists on every roster (array or null). 0 of 10 rosters had co-owners, so the matching path is untested on real data and needs a synthetic fixture case in P1.
- **pre_draft:** not observed (both leagues were `in_season`). Sleeper's documented behaviour of rosters with null players is **unverified**, so P1 needs a synthetic fixture.
- **League users:** `GET /v1/league/{id}/users` → `{ user_id, display_name, avatar, is_owner, is_bot, metadata.team_name, settings, league_id }`.
- **Matchups:** `GET /v1/league/{id}/matchups/{week}` → `{ roster_id, matchup_id, points, custom_points, starters, starters_points[], players, players_points{} }`.

### 2. Live points
- `players_points` (map of player id → points) and `starters_points` (array) are **present**. `points` is the roster total. Week 4 was non-zero (complete) and week 5 was 0 (not started).
- **Update cadence:** not measured in P0a, since no game was live. Measured in **P0b** during TNF: see [P0b — Live cadence](#p0b--live-cadence-tnf-week-5-2026-10-07).
- **Ceiling from headers:** the matchups endpoint sends `s-maxage=60, stale-while-revalidate=300`, so Sleeper's own CDN refreshes it at most about every 60s. Polling faster than 60s cannot get fresher data.

### 3. Rate limits and caching
- **No rate-limit headers.** Responses come through Cloudflare (`server: cloudflare`, `cf-cache-status: HIT|MISS|EXPIRED|UPDATING`), with an `x-request-id` and `x-time`.
- **Documented guidance** (docs.sleeper.com, fetched today): *"A general rule is to stay under 1000 API calls per minute, otherwise, you risk being IP-blocked."*
- **Sleeper's own CDN cache per endpoint (`s-maxage`):**

| Endpoint | s-maxage | SWR |
|---|---|---|
| `state/nfl` | 60s | 180s |
| `league/{id}`, `/rosters`, `/users` | 300s | 300s |
| `league/{id}/matchups/{w}` | 60s | 300s |
| `api.sleeper.com/stats/…` | 300s | 600s |
| `players/nfl` | 600s | 300s |

### 4. Weekly stats
- **`api.sleeper.com/stats/nfl/2026/{w}?season_type=regular&position[]=…`** (undocumented host):
  - Returns an array of lines `{ player_id, week, team, opponent, game_id, date, company: sportradar, stats{…}, player{position, injury_status, …} }`.
  - Weeks 1–4: 737–758 KB per week, 764–780 lines, 37–131 ms.
  - **Every QB/RB/WR/TE/K/DEF line had `team` and `opponent`** across weeks 1–4 (QB 338, RB 671, WR 1122, TE 660, K 142, DEF 128).
  - DEF lines are keyed by team abbreviation and include Sleeper's own `fan_pts_allow_{qb,rb,wr,te,k,def}`. That's a useful **test oracle** for our FPA engine; it's probably Sleeper's default scoring, so expect exact matches only for matching scoring.
- **`api.sleeper.app/v1/stats/nfl/regular/2026/{w}`** (documented): 572 KB, keyed by player id. It has **no** team or opponent, so it would need team-at-week from the schedule.
- **Player map** `players/nfl`: 14.0 MB (not 20), 12,229 players, includes `injury_status`, `espn_id`, `fantasy_positions`.

### 5. Scoring keys → stat keys
- 123 of 133 league scoring keys appear as stat keys in weeks 1–4.
- **Unmapped** (all rare events that simply didn't happen yet; zero-valued stats are omitted from lines): `pts_allow_0`, `fg_ret_yd`, `bonus_def_fum_td_50p`, `def_2pt`, `fgm_0_19`, `fgmiss_0_19`, `bonus_rec_yd_200`, `bonus_rush_yd_200`, `yds_allow_0_100`, `fum_rec_td`.
- **Non-zero weights among them:** `pts_allow_0=10`, `fgm_0_19=3`, `fum_rec_td=6`.
- **Rule for the engine:** a missing stat key scores 0. Unknown scoring keys are reported, not dropped. DEF points-allowed and yards-allowed buckets (`pts_allow_*`, `yds_allow_*`) arrive as precomputed flag stats.

### 6. ESPN box score (`summary?event=`)
- **Team stats:** `firstDowns…`, `thirdDownEff`, `fourthDownEff`, `totalOffensivePlays`, `totalYards`, `yardsPerPlay`, **`totalDrives`**, `netPassingYards`, `completionAttempts`, `interceptions`, **`sacksYardsLost`** ("3-21"), `rushingYards`, `rushingAttempts`, **`redZoneAttempts`**, `totalPenaltiesYards`, **`turnovers`**, **`fumblesLost`**, **`defensiveTouchdowns`**, `possessionTime`.
- **TDs by type:** from the player category totals: `passing` / `rushing` / `receiving` each carry a `TD` column (also `interceptions` and `kicking`).
- **Everything the sheet's "why" stats need is there**, including `totalDrives` + `redZoneAttempts` for the K proxy (F11: red-zone trips allowed per drive).

### 7. Season and week
- ESPN `season.year=2026`, `config/constants.ts SEASON=2026`, Sleeper `season=2026`.
- ESPN week 5 = Sleeper `week` 5 = `display_week` 5 → **agree** today (Wednesday). The Tuesday roll-over timing is still unobserved; ESPN wins per Q7.

### 8. Injuries
- **ESPN league-wide** `site.api.espn.com/…/nfl/injuries`: one call, 8.5 MB, 81 ms (CDN), 32 teams.
  - Statuses: Active 588, Questionable 125, Injured Reserve 52, Out 25, Doubtful 10. All map: Active = no tag; Q, D, O, IR.
- **ESPN core per-team** `…/teams/{id}/injuries`: items are `$ref` links only, so N+1 calls. Rejected.
- **Resolution test:** the fixture league's rostered players that Sleeper marks Q/D/O/IR = 64. Of those, ESPN resolved 48 (14 by `espn_id`, 34 by name + team) = **75.0%**; 47 had the same status.
- **All 16 misses are Sleeper `IR` players absent from ESPN's feed entirely**: not even the last name appears for that team. This is an ESPN coverage gap (its feed lists only 52 IR players league-wide), not a matching bug.

### 9. nflverse backup
- Release tag `stats_player` has `stats_player_week_2026.csv` (+ `.csv.gz` / `.parquet` / `.rds`, plus `reg` and `regpost` variants).
- Tag `player_stats` has no 2026 assets.
- Stays a documented last resort; not built.

## Decisions (by the plan's rules)

| Decision | Result | Rule evidence |
|---|---|---|
| **Weekly stats source** | **`api.sleeper.com`** | Every QB/RB/WR/TE/K/DEF line in weeks 1–4 carries `team` + `opponent`. |
| **Injury source** | **Sleeper player map (≤24h)** | ESPN met 3 of 4 conditions (32/32 teams, 81 ms <5s, 0 unmapped statuses), but resolved only 75.0% of rostered injured players (<95%). The misses are long-term IR players ESPN doesn't list. |
| **Live poll default** | 30s until P0b → **60s (P0b confirmed)** | Sleeper's CDN `s-maxage=60` on matchups makes 60s the useful floor. The TNF log showed a 120s median between changes, never closer than 60s (see P0b below). |

## Plan adjustments (approved by Kobe 2026-10-07; 1, 2, 4 applied to the plan)

1. **Live poll interval:** use 60s, not 30s. Sleeper caches matchups for 60s at its CDN, so 30s polls return the same data half the time. P0b confirms.
2. **Roster cache:** 5 min, not 2. Sleeper's CDN already serves rosters up to 300s old, so our 2-min cache adds calls without adding freshness.
3. **Possible future hybrid for injuries:** use ESPN for Q/D/O (fresher on game day) and Sleeper for IR. This is out of v1 per the rule; revisit if 24h staleness hurts.
4. **The P1 fixture set needs synthetic cases** for co-owners and `pre_draft` leagues (neither was observed).

## P0b — Live cadence (TNF, Week 5, 2026-10-07)

Kobe ran the P0b loop against the fixture league during Thursday Night Football and polled `league/{id}/matchups/5` every 30s. Each line is the sum of `points` across all 10 rosters. That league-wide sum is a sensitive detector: it moves whenever any rostered player scores. Window: 19:57:59 → 20:11:30 local, 28 polls (~13.5 min).

```
19:57:59 teams=10 pts=30.44   (×3)
19:59:29 teams=10 pts=30.64   (×4)   ← change 1
20:01:29 teams=10 pts=30.44   (×5)   ← change 2 (went DOWN: stat correction)
20:03:59 teams=10 pts=32.9    (×2)   ← change 3
20:04:59 teams=10 pts=33      (×14)  ← change 4, unchanged to 20:11:30
```

| Measure | Value |
|---|---|
| Changes seen | 4 in 27 intervals. 23 of 27 back-to-back 30s polls (85%) returned identical data. |
| Gaps between changes | 120s, 150s, 60s |
| **Median gap** | **120s** |
| **Longest gap** | **150s** between changes; ≥391s quiet at the end of the window (20:04:59 → 20:11:30, still unchanged when the log stopped) |
| Shortest gap | 60s, which is Sleeper's matchups `s-maxage=60`. At 30s sampling the true gap is anywhere from 30 to 90s. |
| Shortest-lived value | 32.9, seen on 2 consecutive polls (~60s) |

**Verdict: keep `LIVE_POLL_MS = 60_000`. Not changed.**
- **Faster isn't fresher.** No two changes were closer than 60s, the same as Sleeper's CDN cache. 85% of the 30s polls were wasted, so 30s would double the calls for nothing.
- **Slower would miss values.** Every value lasted at least 2 consecutive 30s polls, so a 60s poll lands on each one. A 120s poll (the median) could have skipped 32.9 entirely and doubled the worst-case lag.
- **Caveat:** this is one ~13.5-min TNF sample with 28 polls. It's enough to rule out a change, not to tune one. Recheck on a full Sunday window if the P6 "within one interval of the Sleeper app" check ever slips.

**Gotcha:** points can go **down** mid-game (30.64 → 30.44, a stat correction). Live points must not assume they only rise. Today they're plain text with no "gain" animation, so nothing needs changing.

## Gotchas found
- An unknown username gives **200 + `null`**, not a 404.
- `api.sleeper.com` weekly payloads are about 750 KB per week. Fetch per week and trim to scoring keys server-side; never send them to the browser.
- `espn_id` coverage on Sleeper players is thin (14 of 48 hits); name + team normalization does most of the matching. This mirrors the 2026-10-06 rookie finding.
- The Sleeper user object exposes (null) private-sounding fields. Whitelist what we keep, and never log responses.
