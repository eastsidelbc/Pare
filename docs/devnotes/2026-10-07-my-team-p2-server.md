# 2026-10-07 — My Team P2: server data layer + `/api/myteam/{user,league}`

Plan: [`docs/plans/my-team-fantasy.md`](../plans/my-team-fantasy.md) (P2) · Spike: [`2026-10-07-my-team-data-spike.md`](2026-10-07-my-team-data-spike.md) · ADR: [`2026-10-07-my-team-provider-proxy.md`](../adr/2026-10-07-my-team-provider-proxy.md)

## What exists now

**Routes** (both `force-dynamic`, `Cache-Control: private, no-store`, `Server-Timing: app;dur=…`):

| Route | Returns | Errors |
|---|---|---|
| `GET /api/myteam/user?u=<username>` | `{ user, season, leagues }` | 400 invalid username · 404 unknown user |
| `GET /api/myteam/league?id=<league>&uid=<user>` | the league bundle (below) | 400 invalid ids · 404 not in league |

Both routes return **502** on an upstream failure, or **503** when our Sleeper call budget is spent.

**League bundle:**
- `season`, `week`, `completedWeeks`
- `league` (scoring weights left out; `format` ppr/half/std)
- `roster`: starters / bench / IR / taxi, with injury tags
- `schedule`: roster teams only, opponent or `BYE` for weeks 1–18
- `fpa`: [team][position][week], completed weeks only
- `defenseLog` / `offenseLog`: ESPN per game, completed weeks only
- `injurySource: 'sleeper'`

All ranking stays client-side.

**Modules** (`lib/myteam/`):

| File | Kind | Role |
|---|---|---|
| `sleeper/http.ts` | server-only | The one door to Sleeper: no-store + timeout + **global call budget 600/min**. Errors never contain the URL. |
| `sleeper/adapter.ts` | server-only | `FantasyProvider` for Sleeper. Keyed LRU caches: user 24h · leagues 1h · league 1h · rosters 5 min · matchups 60s. |
| `sleeper/statLines.ts` | server-only | `api.sleeper.com` weekly lines. `unstable_cache` over no-store (completed weeks 24h, current 30 min) + last-good per week. Split/snap/rank keys are dropped to keep entries small. |
| `seasonSchedule.ts` | server-only | ESPN scoreboard weeks 1–18 with `dates=<season>`, no odds calls, 6h per week. |
| `schedule.ts` | pure | `buildTeamSchedule`: a **failed or partial week (<13 games) never marks a BYE**. |
| `bundle.ts` | server-only | Shared data (week info + schedule + ESPN game logs) in a 10-min window. FPA table per scoring hash + last week, 30 min. Throws if any completed week's lines are missing, rather than skewing ranks. |
| `sleeper/map.ts`, `gameLog.ts` | pure | Raw → normalized. A team's offense line = its opponent's defense game. |

**Data layer (F3a/F3b, approved):**
- `lib/espnBoxscore.ts` (new, pure) now holds the box-score parsing + the season yards-allowed aggregation, moved verbatim from `espnStats`.
- `espnStats.ts`:
  - keeps each event's week;
  - per-game cache key `final-boxscore-v2` (all finals re-fetched once);
  - new `getTeamGameLog()`.
- `lib/fantasy.ts`: the slim player map adds `injury` + `fantasyPositions` (multi-eligible only); key `sleeper-player-map-v4`; `getPlayerMap` exported.
- `lib/apiCache.ts` (additive): `createKeyedCache` (bounded LRU, per-key last-good, in-flight dedupe; memory only) and `createCallBudget` (sliding window).

## Verified (2026-10-07, dev on :4000)

- **Defense parity.** `/api/nfl-2025/defense` before (15:17) vs after (15:21) the `espnStats` change is byte-identical except `updatedAt`: 32 rows each, no live game. Vitest also proves `parseGameBox` + `aggregateYardsAllowed` equal verbatim copies of the old code (`lib/__tests__/espnBoxscore.test.ts`).
- **User route:** 2 leagues for Kobe's account.
- **League bundle:**
  - 26-player roster;
  - FPA for **32 teams × 6 positions for each of weeks 1–4**;
  - 20 BYE entries across roster teams;
  - Sleeper injury tags present.
- **Errors:** 400 for bad username/ids; 404 for an unknown user and a league the user isn't in.

## Gotchas

- **Dev latency floor ≈265 ms per request on the Windows box.** Every route, even `/api/health`, takes this long (connect time is under 1 ms; Next's own log shows "200 in ~265ms"). This is likely the OneDrive-synced repo / slow filesystem warning, not our code.
  - The warm league bundle's handler time is **0.1 ms** (`Server-Timing`).
  - The P2 "<100 ms" check was therefore proven on `next start` (prod build). Measure prod against prod, never dev (CLAUDE.md).
- **Next dev logs full request URLs**, so `?u=<username>` appears in the dev console. `next start` does not log requests, and our code never logs user input.
- **Usernames are in the query string,** so Cloudflare's edge sees them like any URL. Acceptable for public Sleeper handles; `/privacy` must say so (P7).
- **Two existing Sleeper callers are outside the budget:** the player map (once a day) and the Leaders season stats (30 min) in `lib/fantasy.ts`. Both are low-volume and left as they were.
