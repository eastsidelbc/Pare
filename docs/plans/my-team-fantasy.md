# Plan — "My Team": Sleeper fantasy matchup helper

**On approval:** `git switch -c feat/my-team-sleeper` (off `main`), write this plan to `docs/plans/my-team-fantasy.md` (new folder), and commit locally as `docs: My Team (Sleeper) feature plan`. Never push.

## Context

Pare compares NFL teams. Fantasy players want the same insight applied to their own roster: for each player, who his NFL team plays this week and in the coming weeks, and how friendly that defense is to his position. That turns start/sit into a glance.

v1 scope:
- Sleeper only, read-only; username + selected league kept on the device.
- New 5th nav tab, added in the design pass.
- Chip color from **fantasy points allowed per game (FPA) under the league's own scoring**. Pare's per-position defense stats appear in the player sheet as the "why".
- Season / Last 4 toggle; look-ahead strip; injury tags.
- Live points on game day: my players and my roster total.
- Player sheet with "Open in Compare".

What exists today (from exploration):
- `lib/fantasy.ts`: Sleeper **season totals** only (`api.sleeper.app/v1/stats/nfl/regular/{season}`, trimmed to `pts_ppr/pts_std/gp`) plus the 24h trimmed player map. It has no weekly stats, no user/league/roster calls, no injury fields and no opponent data.
- `lib/espnStats.ts`: defense yards and opponent 3rd-down % come from **per-game ESPN box scores** (`getGameYards`, 24h per-game `unstable_cache`). The week is dropped when event lists are flattened. Only total/pass/rush yards and 3rd-down are parsed (no TDs, sacks, INTs or turnovers). Points allowed come from the standings season total.
- ScheduleProvider only holds the weeks Home has scrolled to, so it can't answer "opponents for weeks N..N+k". `useLiveScores(currentNflWeek, …)` is mounted once in the provider. My Team reads live game state through `useSchedule()` and does **not** add a second ESPN poll.
- Reuse:
  - Caching and freshness: `liveWithLastGood` / `createTtlCache` (`lib/apiCache.ts`), the Leaders `unstable_cache`-over-no-store pattern (`lib/leaders.ts`), `useRefreshOnReturn`, `shouldPollLive` (`lib/liveWindow.ts`), `mapEspnScoreboard`.
  - UI: `BottomSheet`, the glass toggle (`glassControl.tsx` + `ActivePill`), `neonMenu.ts` dropdowns (`WeekControl.tsx` is the switcher template), `TeamIdentity` + `getListTeamColor`.
  - Compare hand-off: `addComparison(teamAName, teamBName)` and the "Open full" flow in `MatchupAccordion.tsx:70-98`.
  - Persistence: the favorites store pattern (`lib/favorites/store.ts`).
- Missing today: Playwright, sandbox pages, a generic chip component, and any injury data.

---

## Execution rules (apply to every phase and every /goal)

1. **Proof = command output in the transcript.** Every machine gate is proved only by commands run in the session, with output shown before claiming done. Allowed: `npm run check`, `npx vitest run`, `npm run build`, `npx playwright test`, curl to `localhost`, `git log`, grep. **P0a only:** `node scripts/my-team-spike.mjs` and its outbound calls to Sleeper/ESPN/GitHub (sequential, no bursts). No "should pass" claims.
2. **Two gates per phase.**
   - **Machine gate** = the `/goal`, provable by rule 1.
   - **Human gate** = a checklist for Kobe after the goal clears. It covers anything needing Kobe, the Mac mini, pare.gg or a live game.
3. **Three strikes.** If the same check fails 3 times with the same error, stop and explain the root cause instead of looping.
4. **Port 4000 before any build.** Run [PowerShell] `netstat -ano | findstr :4000`.
   - If Kobe's dev server is listening, **stop and tell Kobe. Don't kill it.**
   - If the session started its own dev server for verification, stop that process first, then build.
5. **Verification order inside a phase:** checks against dev on `:4000` first (curl / Playwright `webServer` with `reuseExistingServer: true`). Then stop the session's own dev server, check the port, and build. Then, if needed, a production check on `npx next start -p 4100` (stopped afterward).
6. **Commits.** Local commits are allowed during a /goal: Conventional Commits, ending with the `Co-Authored-By` attribution line. The ranking extraction is its own commit. **Never push, merge or deploy.**
7. **Shells.** Every verify block is labeled.
   - **[PowerShell]** on Kobe's Windows PC: use `curl.exe`, one command per line, parse JSON with `ConvertFrom-Json`.
   - **[Git Bash]** on Windows: `jq` is **not installed** (checked 2026-10-07), so parse with `node -e`. Don't install tools without asking.
   - **[zsh]** on the Mac mini: `jq` is available. Mac mini blocks are always human gates.
8. **Never write a real Sleeper username, user_id or league name into the repo.** The username comes from Kobe at run time via `$env:SLEEPER_USER`, set in the same command line, since shell state doesn't persist between commands.
9. **When a /goal clears, the final message prints that phase's human-gate checklist.**
10. **PowerShell 5 + UTF-8:** don't match non-ASCII characters (e.g. `·`) in output piped from `curl.exe`. Match ASCII-only pieces, or save to a file and read it back with `Get-Content -Encoding UTF8`.

---

## Rulings (Kobe, 2026-10-07)

| # | Ruling |
|---|---|
| Process | P0 spike (P0a machine / P0b human) → P1 engines → P2 server/API → **P3 skeleton UI** → **P4 mockup gate** (human only) → **P5 design pass** → P6 live → P7 privacy/docs/ship. Expect a restyle in P5, not a rebuild. |
| F1 | 5th nav tab: no BottomNav change until the P4 mockups. Implemented in P5. |
| F2 | **Server proxy.** The ADR documents a hybrid fallback (per-user calls go browser-direct) if rate limits bite. |
| F3 | Approved: (a) week-aware log in `espnStats`, (b) `fantasy.ts` trim + export, (c) ranking core extraction. (c) ships as **its own commit** with a snapshot test proving `useRanking` / Compare output is identical. |
| Q3 | Chip color = **FPA rank only**. Pare defense stats show in the player sheet as the "why". |
| Q4 | FPA is **per game**. |
| Q5 | Last 4 = the **last 4 games played** by that defense (byes skipped). |
| Q6 | Injury source **decided by rule in P0a**: ESPN if clean (definition in P0a), else Sleeper (≤24h stale). |
| Q7 | Current week = ESPN `getCurrentWeekInfo` (single source). |
| Q8 | Live view = my players' points + my roster total. No opponent manager score in v1. |
| Q9 | Starters + bench, with chips. IR/taxi in a collapsed group at the bottom, also with chips. |
| Q10 | Playwright runs locally only. Add it to CI before App Store submission. |
| Q11 | One Sleeper username per device in v1. |
| Q12 | The sandbox route stays (dev-only, 404 in prod). |
| F7 | Kobe verifies Sleeper's API terms. The ADR records this as a **blocker for any paid tier or ads**. |

### Standing flags
- **F5:** the new color family amends design-system §9 rule 3 in the same PR (P5). The ramp's lightness must change steadily from end to end so it reads in grayscale. The chip must not look like `RankBadge`.
- **F6:** `/privacy` must be updated before any deploy that makes `/my-team` reachable on pare.gg. P3–P5 run on local dev only. Never log usernames, and never put per-user data in `unstable_cache` (it writes to disk).
- **F8:** Sleeper's player map is fetched at most once a day, so its injury data can be up to 24h stale.
- **F9:** Playwright is a headless check. Kobe still does the visual QA.
- **F10:** the vault brain doc is stale. It's fixed in P7.
- **F11:** the K rating uses a proxy.
- **F12:** no betting language anywhere on My Team.
- **Rank convention:** #1 = fewest fantasy points allowed per game to that position (same direction as Compare's defense ranks). Starting tiers:

  | Ranks | Tier |
  |---|---|
  | 1–6 | Avoid |
  | 7–12 | Tough |
  | 13–20 | Avg |
  | 21–26 | Good |
  | 27–32 | Great |

  Skeleton chip text reads "Good · #24". Final cut-offs are set at P4.
- **Note:** P3's machine gate can only prove *rendered states* (server HTML via curl). The *interactions* (tap → sheet, switcher, Open in Compare) get automated in P5 with Playwright, per the ruling. Until then they sit in P3's human gate. Moving the Playwright install to P3 would automate them earlier; that's Kobe's call, and the default keeps the ruling.

---

## Phase 0a — Data spike, machine part (Windows PC)

**Goal:** confirm API shapes and pick data sources **by rule**, with evidence in the transcript.

Instead of a dozen `jq` one-liners (no `jq` on Windows), add a small dev-only script, `scripts/my-team-spike.mjs` (Node 24 `fetch`, no dependencies, not imported by the app). It:
1. calls each endpoint below once (sequentially, ≥250 ms apart, **no bursts**);
2. saves raw responses to the session scratchpad (outside the repo);
3. writes **anonymized** fixtures to `lib/myteam/__fixtures__/`:
   - usernames, display names, team names and league names → `user_1`, `Team 1`, `League A`;
   - Sleeper **user_ids, `owner_id`, `co_owners`** → consistent fake ids (`100000000000000001`, …), using one mapping table per run so cross-references still line up;
   - **`avatar` fields** (user and `metadata.avatar`) → `null`;
   - league, roster and player ids are kept;
4. prints a summary table answering every checklist item.

It takes `SLEEPER_USER` from the environment; optional `SLEEPER_LEAGUE` and `WEEK`. It's kept for re-runs (e.g. next season).

Endpoints covered (the live cadence is **not** here; that's P0b):
- **Sleeper:**
  - `GET api.sleeper.app/v1/state/nfl`
  - `/v1/user/{u}`
  - `/v1/user/{id}/leagues/nfl/2026`
  - `/v1/league/{L}`, `/v1/league/{L}/rosters`, `/v1/league/{L}/users`, `/v1/league/{L}/matchups/{W}`
  - response headers (rate limit / cache)
  - weekly stats on both hosts: `api.sleeper.com/stats/nfl/2026/{wk}?season_type=regular&position[]=…` and `api.sleeper.app/v1/stats/nfl/regular/2026/{wk}`
  - `/v1/players/nfl`, **once** (≈20MB)
- **ESPN:**
  - scoreboard default (season/week)
  - scoreboard `?seasontype=2&week=4`
  - `summary?event=…` (team + player box-score fields)
  - core injuries `sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/{id}/injuries` for all 32 teams (sequential, timed)
- **nflverse:** GitHub release asset listing for the tags `stats_player` and `player_stats` (2026 weekly asset present?)

**Decision rules (printed by the script, recorded in the devnote):**
- **Weekly stats source:** if the `api.sleeper.com` lines for QB/RB/WR/TE/K/DEF all carry `team` and `opponent`, use it. Else use `api.sleeper.app` with opponents from the ESPN schedule by team-at-week.
- **Injuries:** ESPN is **clean** if all of these hold, else Sleeper:
  - all 32 teams respond, each in <5s;
  - every status maps to Q/D/O/IR;
  - ≥95% of the injured players on the fixture league's rosters resolve to a Sleeper id (via `espn_id`, else normalized name + team).
- **Live poll default:** 60s (Sleeper CDN caches matchups `s-maxage=60`; approved 2026-10-07). P0b confirms.

**Checklist (script summary + devnote):**
- [ ] Shapes for user/leagues/league/rosters/users/matchups. How co-owners appear. Whether `pre_draft` leagues have empty rosters.
- [ ] `players_points` / `starters_points` present.
- [ ] Rate-limit/cache headers. Sleeper's documented guidance (<1000 calls/min per IP) quoted with a link.
- [ ] Weekly stats payload size per week; K/DEF lines have an opponent.
- [ ] Every scoring key in the fixture league maps to a raw stat key (unmapped keys listed).
- [ ] ESPN box-score fields: sacks, INT, fumbles lost, TDs by type, red-zone attempts.
- [ ] ESPN `season.year` = 2026 **and** `config/constants.ts` `SEASON` = 2026 (grep). Sleeper week vs ESPN week today.
- [ ] Both source decisions printed by rule.

**Machine verify:**
```
[PowerShell]
$env:SLEEPER_USER='<kobe-provides>'; node scripts/my-team-spike.mjs
git grep -n -i -e "<real-username>" -e "<real-user_id>" -e "<real-league-name>" -- lib/myteam/__fixtures__ docs scripts
git grep -n -E "\"avatar\":\s*\"" -- lib/myteam/__fixtures__
npm run check
git log --oneline -3
```
- Both greps must return nothing.
- The script prints the real `user_id` and every real owner/co-owner id it replaced, **to the terminal only**. Each one gets grepped (one `-e` per id).
- Kobe supplies the username at run time; it's never written to the repo.

**/goal (machine gate):** `P0a done when, in this transcript: node scripts/my-team-spike.mjs ran with SLEEPER_USER set and printed its summary covering every P0a checklist item; lib/myteam/__fixtures__/ contains anonymized state/user/leagues/league/rosters/users/matchups/weekly-stats (both hosts)/boxscore/injuries JSON; git grep for the real username, real user_id, every real owner_id/co_owners id and real league names in lib/myteam/__fixtures__, docs and scripts returns nothing, and no non-null avatar remains in the fixtures; docs/devnotes/2026-10-XX-my-team-data-spike.md records every answer plus the weekly-stats and injury source decisions made by the stated rules; npm run check passes; all of it is committed locally (no push). If the same check fails 3 times with the same error, stop and explain.`

## Phase 0b — Human gate (Kobe)
- [ ] Give the Sleeper username for P0a (at run time only).
- [ ] **Live cadence on the Mac mini during a Thursday/Sunday game**, ~20 min:
  ```
  [zsh, Mac mini]
  L=<league_id>; W=<week>
  for i in $(seq 1 40); do echo "$(date +%T) $(curl -s https://api.sleeper.app/v1/league/$L/matchups/$W | jq -c '[.[] | .points] | add')"; sleep 30; done | tee sleeper-live-cadence.log
  ```
  Paste the log, or the observed update interval, into the spike devnote. It confirms the P6 poll interval (60s; never below Sleeper's 60s CDN cache).
- [ ] Optional: confirm prod Pare defense is 2026 with 32 rows: `curl -s https://pare.gg/api/nfl-2025/defense | jq 'keys'`.
- [ ] Review the devnote's source decisions.

---

## Architecture

### Data flow
```
Browser (/my-team)
  ├─ localStorage pare:myteam {version, provider:'sleeper', username, userId, leagueId, window, irOpen}
  ├─ GET /api/myteam/user?u=           → user + leagues        (server, in-memory keyed cache)
  ├─ GET /api/myteam/league?id=&uid=   → league bundle (below) (server, in-memory keyed cache)
  ├─ GET /api/myteam/live?id=&uid=&w=  → my players' live points + roster total (P6)
  └─ useSchedule() (existing)          → live game state/clock — NO new ESPN poll
Server
  ├─ FantasyProvider (interface) ← SleeperAdapter     (user/leagues/league/roster/matchups)
  ├─ StatLineSource ← weekly stats (source per P0a)    (shared, unstable_cache over no-store)
  ├─ seasonSchedule (ESPN scoreboard wk 1–18, no odds) (shared, unstable_cache over no-store)
  ├─ defenseGameLog (espnStats, week-aware)           (shared, existing per-game 24h cache)
  └─ injuries (ESPN or Sleeper map, per P0a rule)
```

**League bundle** (≈30–60KB gzipped):
```
league      { name, scoringHash, rosterSlots, playoffWeekStart }
roster      [{ playerId, name, pos, nflTeam,
               group: starter | bench | ir | taxi,
               injury: Q | D | O | IR | null }]
schedule    { abbr → week → { opp, home, kickoff, eventId } | 'BYE' }   (roster teams only)
fpa         [def][pos][week] = { pts, games }
defenseLog  [team][week]     = { pass_yds, rush_yds, pass_td, rush_td, int, sacks, points, … }
offenseLog  [team][week]     (D/ST: opponent turnovers, sacks allowed, points)
```

**Ranking stays client-side** (house rule). The server sends raw per-week values; the client windows them (Season / Last 4 games played), computes per-game FPA, ranks through `lib/ranking.ts`, and maps the rank to a tier. The chip uses the FPA rank only. `defenseLog` and `offenseLog` feed the sheet's "why" stats.

### New / touched files
| File | Kind | Purpose |
|---|---|---|
| `scripts/my-team-spike.mjs` | new (P0a), dev-only | Spike runner + anonymized fixture writer. |
| `lib/myteam/types.ts` | new | `FantasyUser`, `FantasyLeague`, `RosterPlayer`, `ScoringRules`, `PlayerGameLine`, `MatchupTier`, `RatingWindow`. |
| `lib/myteam/provider.ts` | new | `FantasyProvider` interface (`resolveUser`, `listLeagues`, `getLeague`, `getRoster`, `getLivePoints`) + `getProvider('sleeper')`. `StatLineSource` is separate, so a future ESPN/Yahoo provider reuses the FPA engine. |
| `lib/myteam/sleeper/adapter.ts` | new, `server-only` | Endpoints, `AbortSignal.timeout` (5s; 8s for stats), throw on empty/invalid, normalize. |
| `lib/myteam/sleeper/scoring.ts` | new, pure | `scoring_settings` → `ScoringRules`; unmapped keys reported. |
| `lib/myteam/sleeper/statLines.ts` | new, `server-only` | Weekly lines: `unstable_cache` over no-store (completed weeks 24h / current week 30 min) + `liveWithLastGood`. Never nested. |
| `lib/myteam/seasonSchedule.ts` | new, `server-only` | `mapEspnScoreboard` for weeks 1–18, no odds calls. A week with 0 games throws; bye = team absent from a valid week. Cached 6h. |
| `lib/myteam/injuries.ts` | new, `server-only` | The source chosen in P0a, normalized to Q/D/O/IR. |
| `lib/apiCache.ts` | **additive** | `createKeyedCache<T>({ttlMs, max})`: bounded LRU + per-key last-good + in-flight dedupe + a global call-budget hook. Existing exports untouched. |
| `lib/myteam/fpa.ts` | new, pure | `scoreLine`, `buildFpaTable` → per def/pos/week `{pts, games}`. D/ST = DEF points scored against that offense; K = K lines against that defense. |
| `lib/myteam/defenseProfile.ts` | new, pure | Sheet "why" stats per position (table below). |
| `lib/myteam/rating.ts` | new, pure | `windowWeeks` (last 4 games played), per-game FPA, rank → tier via `TIER_CUTOFFS`, chip text ("Good · #24"). |
| `lib/myteam/livePoll.ts` | new, pure (P6) | `shouldPollMyTeam({ liveWindow, visible, mounted, allFinal })`. |
| `lib/ranking.ts` | **extract (F3c, own commit)** | Pure tie-aware ranking core; `useRanking` delegates to it with its signature unchanged. |
| `lib/espnStats.ts` | **touch (F3a)** | Keep the week per event; pure aggregator extracted; export `getDefenseGameLog()`; extra fields. Season output must be identical. |
| `lib/fantasy.ts` | **touch (F3b)** | Trim adds `injury_status` and `fantasy_positions`; key `v4`; export `getPlayerMap()`. |
| `lib/myteam/store.ts` | new, pure | `pare:myteam`, mirrors `lib/favorites/store.ts`. |
| `components/myteam/MyTeamProvider.tsx` | new | Mounted in `app/my-team/layout.tsx` (route-scoped); hydration guard. |
| `app/api/myteam/{user,league,live}/route.ts` | new | `force-dynamic`, `Cache-Control: private`, validated input (username `^[A-Za-z0-9_]{1,20}$`, numeric ids), no username in logs. |
| `app/my-team/{layout,page}.tsx` + `components/myteam/*` | new (P3) | `MyTeamScreen`, `Onboarding`, `LeagueSwitcher`, `WindowToggle`, `RosterSection`, `RosterRow`, `MatchupChip`, `LookAheadStrip`, `PlayerSheet`. |
| `config/teamIdentity.ts` | touch (P3) | `myTeam` surface (names). |
| `app/sandbox/my-team/page.tsx` | new (P3) | Server-renders `MyTeamScreen` from fixtures (every state visible without interaction); `notFound()` when `NODE_ENV === 'production'`. |
| `components/BottomNav.tsx` (+ `neonMenu.ts` padding if needed) | touch (P5) | 5th tab per P4. |
| `app/globals.css`, `tailwind.config.js`, `docs/design-system.md` | touch (P5) | `--matchup-1..5`, `--matchup-bye`; §1, §9 rule 3 amendment, §9.4. |
| `lib/__tests__/matchupContrast.test.ts` | new (P5) | Parses `--matchup-*` from `globals.css` and asserts WCAG ratios. |
| `playwright.config.ts`, `e2e/my-team.spec.ts` | new (P5) | Projects `iphone-393` (393×759) + `ipad-834` (834×1194); `webServer: npm run dev` with `reuseExistingServer: true`. Local only. |
| `lib/hooks/useMyTeamLive.ts`, `components/myteam/LivePoints.tsx` | new (P6) | Game-day polling + display. |
| `app/privacy/page.tsx`, `DATA_SOURCES.md`, `CHANGELOG.md`, `docs/adr/2026-10-XX-my-team-provider-proxy.md`, devnotes | docs | ADR covers: the proxy, the hybrid fallback, the provider interface, and the F7 paid-tier/ads blocker. |

Sheet "why" stats per position (`lib/myteam/defenseProfile.ts`):

| Position | Opponent stats shown |
|---|---|
| QB | pass yds, pass TD, INT, sacks |
| RB | rush yds, rush TD |
| WR / TE | pass yds, pass TD |
| K | points allowed/game (+ red-zone trips if available) |
| D/ST | opponent offense: turnovers, sacks allowed, points/game |

### Server cache budget (every Sleeper call goes through the global limiter, ≈600/min)
| Data | Cache | Where |
|---|---|---|
| username → user_id | 24h | keyed LRU (memory only) |
| user leagues | 1h | keyed LRU |
| league settings/scoring | 1h | keyed LRU |
| rosters | 5 min (= Sleeper CDN `s-maxage=300`) | keyed LRU |
| matchups (live) | 60s (= Sleeper CDN `s-maxage=60`; P0b confirms) | keyed LRU |
| weekly stat lines | current week 30 min · completed weeks 24h | `unstable_cache` over no-store |
| FPA table | 30 min per scoring hash | keyed LRU |
| season schedule | 6h | `unstable_cache` over no-store |
| defense game log | existing per-game 24h + route window 10 min | existing |
| injuries | ESPN 30 min, or Sleeper map 24h (per P0a) | `unstable_cache` over no-store / existing |

Rough budget: a cold load for a new user is ≤6 Sleeper calls; a warm one is 0. Live load is ≤1 call/min per league being watched (60s poll), so the limiter supports roughly 500 live leagues before last-good kicks in.

---

## Phases

Standard machine verify ([PowerShell], in this order; rule 4 applies at step 4):
```
npm run check
npx vitest run
netstat -ano | findstr :4000
npm run build
git log --oneline -5
```

### P1 — Pure engines + ADR draft (no network, no UI)
- **Files:**
  - `lib/myteam/{types,provider,fpa,defenseProfile,rating,store}.ts`
  - `lib/myteam/sleeper/scoring.ts`
  - `lib/myteam/sleeper/roster.ts` (pure: `findMyRoster(rosters, userId)` via `owner_id` or `co_owners`; `normalizeRoster` → starters / bench / IR / taxi groups, empty for `pre_draft`)
  - Synthetic fixtures (no real data; neither case appeared in the P0a spike):
    - `lib/myteam/__fixtures__/synthetic/rosters-co-owner.json`: the user is only in `co_owners` of one roster, not `owner_id`.
    - `lib/myteam/__fixtures__/synthetic/league-pre-draft.json` + `rosters-pre-draft.json`: `status: "pre_draft"`, rosters with `players: null`, `starters: []`.
  - `lib/myteam/__tests__/*`
  - ADR draft
  - **separate commit** `refactor: extract pure ranking core from useRanking` → `lib/ranking.ts` + `useRanking` delegating to it + `lib/__tests__/ranking.snapshot.test.ts`
- **Checklist:**
  - [ ] Snapshot: `useRanking`-equivalent results for every offense/defense metric × 32 teams (fixture TeamData) are identical before and after the extraction. The snapshot is committed *before* the refactor commit.
  - [ ] Scoring: PPR / half / std fixtures give known totals.
  - [ ] FPA per game matches a hand-computed table.
  - [ ] Last 4 skips byes.
  - [ ] `T-12th` ties.
  - [ ] Tier mapping follows the rank convention via one `TIER_CUTOFFS`.
  - [ ] Store: version rejection, quota-safe.
  - [ ] Co-owner (synthetic fixture): `findMyRoster` finds the roster where the user is only in `co_owners`; returns `null` when the user is on no roster.
  - [ ] Pre-draft (synthetic fixture): `normalizeRoster` on a `pre_draft` league with `players: null` returns empty groups and an explicit pre-draft flag, without throwing.
- **Machine gate /goal:** `P1 done when, in this transcript: npx vitest run passes and lists the new lib/myteam/__tests__ files (scoring, fpa, rating, defenseProfile, store, roster) and the roster tests cover the synthetic co-owner fixture (user found via co_owners only; null when absent) and the synthetic pre_draft fixture (players: null → empty groups + pre-draft flag, no throw), plus lib/__tests__/ranking.snapshot.test.ts; git log shows the snapshot test committed before a separate "refactor: extract pure ranking core from useRanking" commit, and the snapshot still passes after it; git diff main --stat shows no files under app/ or components/ and useRanking's exported signature unchanged; npm run check passes; port 4000 checked (stop and tell Kobe if dev is running), then npm run build passes; everything committed locally, nothing pushed. If the same check fails 3 times with the same error, stop and explain.`
- **Human gate:** [ ] Skim the ADR draft and the tier/rank convention test cases.

### P2 — Server data layer + `/api/myteam/{user,league}`
- **Files:**
  - `lib/myteam/sleeper/{adapter,statLines}.ts`, `lib/myteam/seasonSchedule.ts`, `lib/myteam/injuries.ts`
  - `lib/apiCache.ts` (additive), `lib/espnStats.ts`, `lib/fantasy.ts`
  - `app/api/myteam/{user,league}/route.ts`
  - tests (keyed cache, limiter, schedule bye detection, defense aggregator parity)
- **Checklist:**
  - [ ] Timeouts on every fetch; throw on empty; last-good.
  - [ ] Global limiter on every Sleeper call.
  - [ ] No username in logs (grep of the route/adapter code for `console.*(…u…)`).
  - [ ] Defense parity proven twice:
    - (1) Vitest: the extracted aggregator's season totals on fixture box scores equal the old aggregation;
    - (2) live: `/api/nfl-2025/defense` captured before the `espnStats` change and after, same hour, no game in progress, identical.
  - [ ] Bad input → 400.
- **Machine verify** ([PowerShell], dev on :4000 — reuse Kobe's if running, else start the session's own in the background):
  ```
  curl.exe -s "http://localhost:4000/api/nfl-2025/defense" -o "$env:TEMP\def-before.json"
  $env:SLEEPER_USER='<kobe-provides>'; (curl.exe -s "http://localhost:4000/api/myteam/user?u=$env:SLEEPER_USER" | ConvertFrom-Json).leagues.Count
  $b = curl.exe -s "http://localhost:4000/api/myteam/league?id=<L>&uid=<UID>" | ConvertFrom-Json; $b.roster.Count; ($b.fpa.PSObject.Properties | Measure-Object).Count
  curl.exe -s -o NUL -w "%{http_code} %{time_total}`n" "http://localhost:4000/api/myteam/league?id=<L>&uid=<UID>"
  curl.exe -s -o NUL -w "%{http_code}`n" "http://localhost:4000/api/myteam/user?u=bad%20name!"
  curl.exe -s "http://localhost:4000/api/nfl-2025/defense" -o "$env:TEMP\def-after.json"
  git diff --no-index --stat "$env:TEMP\def-before.json" "$env:TEMP\def-after.json"
  ```
  (Capture `def-before.json` before editing `espnStats.ts`. The empty `git diff --no-index` = identical; ignore timestamp fields if the shape has them.)
- **Machine gate /goal:** `P2 done when, in this transcript against dev on localhost:4000: /api/myteam/user returns ≥1 league for Kobe's username; /api/myteam/league returns a non-empty roster, fpa for 32 defenses × 6 positions per completed week, schedule with BYE entries, and injuries from the P0a-chosen source; the second league call returns in <100ms; bad input returns 400; /api/nfl-2025/defense before vs after the espnStats change is identical (same hour, no live game) and has 32 rows; npx vitest run passes incl. the aggregator-parity, keyed-cache, limiter and bye-detection tests; npm run check passes; the session's own dev server is stopped, port 4000 checked (stop and tell Kobe if his dev is running), npm run build passes; committed locally, nothing pushed. If the same check fails 3 times with the same error, stop and explain.`
- **Human gate:** [ ] Optional: run the same curls on the Mac mini (prod-mode caching sanity) before P7.

### P3 — Skeleton UI (functional, unstyled-by-intent)
- **Skeleton rules:**
  - `/my-team` is reachable **by URL only**: BottomNav untouched, no new color tokens.
  - Chips are text label + rank ("Good · #24") in existing neutral styles; BYE is plain "BYE".
  - Reuse `BottomSheet`, `neonMenu`, the glass toggle, `TeamIdentity` + `getListTeamColor`.
  - Local dev only (F6).
- **Files:** `app/my-team/{layout,page}.tsx`, `components/myteam/*`, `MyTeamProvider.tsx`, `config/teamIdentity.ts`, `app/sandbox/my-team/page.tsx`.
- **Checklist:**
  - [ ] App shell: 52px H1 header, one `<main>` scroller, nav padding.
  - [ ] Onboarding: username entry, not-found, no leagues, `pre_draft` league.
  - [ ] League switcher persists `leagueId`; one username per device.
  - [ ] Season / Last 4 toggle (glass recipe, unique `layoutId`).
  - [ ] Sections: Starters, Bench, then a collapsed IR/Taxi group. Every row has chips.
  - [ ] Row: player, position, NFL team, injury tag, this-week chip, **5-week** look-ahead strip (one constant; CSS scroll-snap).
  - [ ] `PlayerSheet`: position "why" stats + "Open in Compare". It reuses the MatchupAccordion flow: find the existing pair or `addComparison(getTeamByAbbr(a).name, getTeamByAbbr(b).name)`, then `setActive`, then `router.push('/compare')`. A toast at the 8-tab cap.
  - [ ] Refetch on return after 10 min.
  - [ ] 0 animations at rest; reduced motion respected.
  - [ ] No betting copy.
  - [ ] The sandbox renders every state statically: all 5 tiers, BYE, Q/D/O/IR, a long name, IR group expanded, sheet content, each onboarding state.
  - [ ] Every sandbox state carries an **ASCII data attribute** for machine checks (the production components emit the same attributes; they're harmless and also usable by Playwright in P5):
    - `data-tier="great|good|avg|tough|avoid"` on each chip
    - `data-injury="Q|D|O|IR"` on each injury tag
    - `data-bye="true"` on bye chips
    - `data-state="onboarding-entry|onboarding-notfound|onboarding-noleagues|onboarding-predraft|roster|sheet|ir-open"` on each state's root
- **Machine verify** ([PowerShell]):
  ```
  curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:4000/my-team
  curl.exe -s http://localhost:4000/sandbox/my-team -o "$env:TEMP\sandbox.html"
  $h = Get-Content "$env:TEMP\sandbox.html" -Raw -Encoding UTF8
  $attrs = 'data-tier="great"','data-tier="good"','data-tier="avg"','data-tier="tough"','data-tier="avoid"','data-injury="Q"','data-injury="D"','data-injury="O"','data-injury="IR"','data-bye="true"','data-state="onboarding-entry"','data-state="onboarding-notfound"','data-state="onboarding-noleagues"','data-state="onboarding-predraft"','data-state="roster"','data-state="sheet"','data-state="ir-open"','Open in Compare','Last 4'
  $attrs | ForEach-Object { "{0} = {1}" -f $_, $h.Contains($_) }
  git grep -n -E "bg-(slate|gray|red|green)-[0-9]|#[0-9a-fA-F]{6}" -- components/myteam app/my-team app/sandbox
  git diff main --stat -- components/BottomNav.tsx app/globals.css
  npx next start -p 4100
  curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:4100/sandbox/my-team
  ```
  `next start` runs after the build, in the background, and is stopped afterward. Its sandbox check must return **404**.
- **Machine gate /goal:** `P3 done when, in this transcript: dev localhost:4000/my-team returns 200 and /sandbox/my-team server-renders every fixture state (the HTML saved to a file and read with Get-Content -Encoding UTF8; one Contains per value prints True for data-tier="great", "good", "avg", "tough", "avoid"; data-injury="Q", "D", "O", "IR"; data-bye="true"; data-state="onboarding-entry", "onboarding-notfound", "onboarding-noleagues", "onboarding-predraft", "roster", "sheet", "ir-open"; plus the ASCII strings "Open in Compare" and "Last 4"); git grep finds no raw palette classes or hex colors in components/myteam, app/my-team or app/sandbox; git diff main shows components/BottomNav.tsx and app/globals.css unchanged; npx vitest run and npm run check pass; the session's own dev server is stopped, port 4000 checked (stop and tell Kobe if his dev is running), npm run build passes; next start -p 4100 returns 404 for /sandbox/my-team, then is stopped; committed locally, nothing pushed. If the same check fails 3 times with the same error, stop and explain.`
- **Human gate (Kobe, local dev, phone-width browser):**
  - [ ] Onboarding with the real username.
  - [ ] Switcher between real leagues.
  - [ ] Season ⇄ Last 4.
  - [ ] Tap → sheet → Open in Compare opens or reuses the correct tab.
  - [ ] IR group toggles.
  - [ ] Screenshots taken for P4.

### P4 — 🚧 Mockup gate (human gate only, no /goal)
Kobe, in claude.ai, from P3 screenshots with a real league. Decide, then hand the picks back:
- [ ] Look-ahead strip length (3 / 5 / rest-of-season / playoff weeks via `playoff_week_start`)
- [ ] Roster row layout + section/IR group styling + injury tag placement
- [ ] Chip style + exact 5 colors + BYE gray (WCAG 4.5:1 text, 3:1 chip edge, readable in grayscale, distinct from `RankBadge`)
- [ ] Final tier cut-offs + labels
- [ ] Player sheet layout
- [ ] League switcher style
- [ ] Empty / onboarding states
- [ ] Live-points display (my players + roster total)
- [ ] Tab name + lucide icon + how 5 tabs fit at 393px with ≥44px hit areas (last iPhone slot)

### P5 — Design pass (restyle, not rebuild)
- **Files:**
  - Tokens and docs: `app/globals.css` (`--matchup-*`), `tailwind.config.js`, `docs/design-system.md` (§1, §9 rule 3, new §9.4 with the P4 picks).
  - Restyle: `components/myteam/*`, plus the strip-length and `TIER_CUTOFFS` constants.
  - Nav: `components/BottomNav.tsx`, `components/ui/neonMenu.ts` (if the nav height changes).
  - Tests: `lib/__tests__/matchupContrast.test.ts`.
  - Playwright: `playwright.config.ts`, `e2e/my-team.spec.ts`, `package.json` (`@playwright/test` dev dependency).
- **Playwright specs** (sandbox + mocked `/api/myteam/*` via `page.route` with fixtures), both projects:
  - [ ] No horizontal scroll.
  - [ ] Every interactive element ≥44×44 hit area (nav included).
  - [ ] Every chip has a non-empty text label.
  - [ ] Onboarding → league → roster; switcher persists after reload.
  - [ ] Season ⇄ Last 4 changes chip text.
  - [ ] IR group expands.
  - [ ] Tap row → sheet → "Open in Compare" lands on `/compare` with the right pair.
  - [ ] Opening the same pair twice reuses the tab.
- **Machine verify** ([PowerShell]):
  ```
  npm install -D @playwright/test
  npx playwright install chromium
  npx playwright test --project=iphone-393
  npx playwright test --project=ipad-834
  npx vitest run lib/__tests__/matchupContrast.test.ts
  git grep -n -E "bg-(slate|gray|red|green|yellow|emerald|amber)-[0-9]" -- app components
  git diff main --stat -- lib/myteam/fpa.ts lib/myteam/sleeper lib/myteam/seasonSchedule.ts app/api
  ```
  The `git grep` mirrors the CI token guard. The final `git diff` must show no logic changes outside constants.
- **Machine gate /goal:** `P5 done when, in this transcript: both Playwright projects (iphone-393, ipad-834) pass all My Team specs (no horizontal scroll, ≥44px hit areas incl. the 5-tab nav, every chip labelled, onboarding/switcher/toggle/IR/sheet/Open in Compare flows, tab reuse); matchupContrast test passes (text ≥4.5:1, chip edge ≥3:1, lightness steadily rising or falling across the 5 steps); the token-guard grep finds no raw palette classes in app/ or components/; docs/design-system.md contains §9.4 My Team, the amended §9 rule 3 and §1 matchup tokens; git diff shows no logic changes in lib/myteam engines, adapters or app/api beyond the strip-length/TIER_CUTOFFS constants; npx vitest run and npm run check pass; port 4000 checked (stop and tell Kobe if dev is running), npm run build passes; committed locally, nothing pushed. If the same check fails 3 times with the same error, stop and explain.`
- **Human gate:**
  - [ ] Visual sign-off on iPhone and iPad (local dev): matches the P4 picks.
  - [ ] The nav feels right with 5 tabs.
  - [ ] Real league looks right.

### P6 — Live fantasy points (game day)
- **Files:** `lib/myteam/livePoll.ts`, `lib/hooks/useMyTeamLive.ts`, `components/myteam/LivePoints.tsx`, `app/api/myteam/live/route.ts`, tests.
- **Checklist:**
  - [ ] Shows my players' points + my roster total only.
  - [ ] Polls only when `shouldPollMyTeam` is true: live window from `useSchedule()` current-week matchups via `shouldPollLive`, tab visible, route mounted, not all final.
  - [ ] Interval = 60s (`LIVE_POLL_MS` constant), matching Sleeper's `s-maxage=60`; adjusted only if P0b shows slower updates.
  - [ ] Game state comes from ScheduleProvider (no second `useLiveScores`).
  - [ ] Last-good on error; plain-text numbers.
- **Machine verify** ([PowerShell]):
  ```
  npx vitest run lib/myteam
  git grep -n "useLiveScores(" -- app components lib
  curl.exe -s -o NUL -w "%{http_code}`n" "http://localhost:4000/api/myteam/live?id=<L>&uid=<UID>&w=<W>"
  ```
  The `git grep` must still show exactly one call site, in ScheduleProvider.
- **Machine gate /goal:** `P6 done when, in this transcript: npx vitest run passes poll-gating tests proving shouldPollMyTeam is false outside the live window, when hidden, when unmounted/off-route and when all games are final, and true only inside the window while visible and mounted; a live-points reducer test proves last-good on error and correct roster total; git grep shows useLiveScores( still called only in ScheduleProvider; /api/myteam/live returns 200 on localhost:4000 with fixture-shaped JSON; npm run check passes; port 4000 checked (stop and tell Kobe if dev is running), npm run build passes; committed locally, nothing pushed. If the same check fails 3 times with the same error, stop and explain.`
- **Human gate (live game, local dev or Mac mini):**
  - [ ] Points update within one interval of the Sleeper app.
  - [ ] Network panel: ~1 call per interval while visible, 0 when backgrounded or off-route.
  - [ ] No Sleeper 429/403 over a full Sunday window (dev console / `pm2 logs pare`).

### P7 — Privacy, docs, ship
- **Files:**
  - `app/privacy/page.tsx`: the `pare:myteam` key; the username → our server → Sleeper flow; no server-side storage beyond short in-memory caches; Sleeper (+ ESPN injuries if chosen) listed as services.
  - `DATA_SOURCES.md`: a Sleeper section plus any new ESPN endpoints.
  - Final ADR (proxy, hybrid fallback, F7 blocker).
  - `CHANGELOG.md` `[Unreleased]`; devnote `docs/devnotes/YYYY-MM-DD-my-team.md` (includes the drafted vault-doc corrections, F10).
- **Machine verify** ([PowerShell]):
  ```
  git grep -n "pare:myteam" -- app/privacy
  git grep -n -i "sleeper" -- app/privacy DATA_SOURCES.md
  git grep -n -i -E "hybrid|blocker" -- docs/adr
  git grep -n -i "my team" -- CHANGELOG.md docs/devnotes
  ```
- **Machine gate /goal:** `P7 done when, in this transcript: git grep shows app/privacy/page.tsx describing pare:myteam and the Sleeper username flow, DATA_SOURCES.md has a Sleeper section listing every endpoint the code calls (cross-checked by git grep of "sleeper.app|sleeper.com" in lib/), the ADR in docs/adr records the server proxy, the hybrid browser-direct fallback and the paid-tier/ads blocker, CHANGELOG [Unreleased] has a My Team bullet, and the My Team devnote exists with the drafted vault-doc corrections; npx vitest run and npm run check pass; port 4000 checked (stop and tell Kobe if dev is running), npm run build passes; committed locally, nothing pushed, merged or deployed. If the same check fails 3 times with the same error, stop and explain.`
- **Human gate (Kobe):**
  - [ ] Review /privacy wording.
  - [ ] Apply the vault brain-doc corrections (outside the repo).
  - [ ] Push the branch, merge to `main`.
  - [ ] Mac mini deploy ([zsh]): `git restore package-lock.json` → `git pull` → `npm install` → `npm run clean` → `npm run build` → `pm2 restart pare`.
  - [ ] Check that `curl -sI https://pare.gg/my-team` returns 200 and `curl -s https://pare.gg/api/health | jq` shows the merged commit.
  - [ ] Check that `https://pare.gg/sandbox/my-team` returns 404.
  - [ ] Watch `pm2 logs pare` for Sleeper 429s.

---

## Freshness + performance budgets

**Freshness**

| Data | Max lag |
|---|---|
| Live points | ≤60s poll + up to 60s Sleeper CDN cache (P0b confirms) |
| Roster / lineup | ≤5 min (our cache) + up to 5 min Sleeper CDN |
| FPA / ratings | ≤30 min after Sleeper posts stats |
| Opponents / byes | ≤6h |
| Defense stats | ≤10 min (same as Compare) |
| Injuries | ESPN ≤30 min, or Sleeper ≤24h (per P0a) |

**Network**
- Cold load ≤3 requests to our API.
- League bundle ≤60KB gzipped.
- Live poll payload ≤5KB.

**Client**
- Route-scoped provider, so 0 cost on other tabs.
- My Team route JS ≤ +40KB gzipped (from the `npm run build` route table).
- No second `useLiveScores` instance.
- 60fps scroll: plain CSS rows, no per-row framer layout animation, no `backdrop-filter` over moving content.
- 0 running animations at rest; a `prefers-reduced-motion` still state.

**Server**
- Keyed caches capped (e.g. 1,000 users / 500 leagues).
- Sleeper limiter ≈600/min.
- No per-user disk writes.

## Risks
- **Undocumented Sleeper stats host changes or is blocked:** fall back to the documented host with schedule-derived opponents. nflverse is documented as a last resort.
- **Shared-IP rate limit:** limiter + per-league caches + last-good. Watch for 429s. The hybrid browser-direct fallback is documented in the ADR.
- **Data gaps:**
  - No drive data, so K uses a proxy.
  - Injury staleness if we stay on Sleeper.
  - TDs allowed depend on ESPN box-score fields.
  - Traded players need their team at each week.
- **Licensing:** ESPN is undocumented and Sleeper is non-commercial. A licensed provider is needed before monetization (F7, blocker in the ADR).
- **App Store:** matchup-quality wording only, no wagering language. The privacy label must cover the username. Reconcile with the existing TODO to route ESPN live/box-score calls through our own API.
- **Season edges:** Sleeper and ESPN may roll weeks on different days on Tue/Wed (ESPN wins); postseason is out of scope; `pre_draft` leagues have empty rosters.
- **The URL-reachable skeleton leaking to prod:** prevented because there is no deploy before P7 and nothing is pushed or merged during /goals.
- **Scope creep** (merged leagues, opponent manager score, projections, trade tools): out of v1.
