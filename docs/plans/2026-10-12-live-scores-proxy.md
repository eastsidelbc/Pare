# Plan — Live scores + box scores through our server (App Store plan · Phase 1 · Step 2)

Branch `feat/live-scores-proxy` · plan date 2026-10-12 · status: proposed

## Context

Two things in the browser still call ESPN directly:

- `lib/hooks/useLiveScores.ts`: polls `site.api.espn.com/.../scoreboard?seasontype=2&week=N` every 15s inside the live window, then `mapEspnScoreboard` → `patchLiveMatchups`.
- `lib/hooks/useGameSummary.ts`: calls `.../summary?event=ID` when a finished game's accordion opens (`MatchupAccordion` renders `PostGameBox` only when `state === 'post'`). All the parsing (`parseSummary`) runs in the browser.

Everything else (schedule, stats, standings, leaders, Sleeper) is already server-side. Before App Store submission, the browser should talk only to pare.gg (CLAUDE.md "TODO before App Store"). Our server fetches ESPN when a request needs it, trims the payload, keeps it in memory and serves one shared copy to everyone. This is the `/api/myteam/live` pattern (ADR `2026-10-07-my-team-provider-proxy.md`).

Kobe's decisions (fixed): (1) no browser fallback to ESPN; when ESPN fails, serve last-good marked stale · (2) client policy unchanged (15s, live window only, pause when hidden, 8s timeout, swallow errors) · (3) pull-based cache only, no timers or cron · (4) Sleeper out of scope · (5) no UI changes; hook signatures and `patchLiveMatchups` unchanged.

## What exists today (reuse, don't rebuild)

| Piece | Where | Use |
|---|---|---|
| `mapEspnScoreboard(data, fallbackWeek)` (pure, the only mapper) | `lib/espnScoreboard.ts` | server route maps with it; no copy anywhere else |
| `ESPN_SCOREBOARD_URL` | `lib/espnScoreboard.ts` | server side only after P3 |
| `shouldPollLive(matchups, nowMs)` | `lib/liveWindow.ts` | server picks the 15s vs 5 min TTL |
| `createKeyedCache` (LRU, in-flight dedupe, last-good), `createCallBudget` | `lib/apiCache.ts` | ideas plus the budget, reused as-is |
| Door pattern (budget → no-store fetch → `AbortSignal.timeout` → typed error) | `lib/myteam/sleeper/http.ts` | copied for ESPN |
| Thin route + `force-dynamic` + validate → 400 | `app/api/myteam/live/route.ts`, `lib/myteam/apiErrors.ts` | route shape |
| `SerializedMatchup` + revive (`kickoff: new Date(...)`) | `components/schedule/ScheduleProvider.tsx:69,139` | the same revive goes in a lib helper; ScheduleProvider is **not** touched (see Follow-ups) |
| Existing ESPN fixtures (w4 scoreboard, summary) | `lib/myteam/__fixtures__/espn-*.json` | left alone; new fixtures go in `lib/__fixtures__/espn/` |

Confirmed from the existing summary fixture: finality is at `header.competitions[0].status.type.completed` (`true`, `STATUS_FINAL`).

## Design (one paragraph per piece)

**`createLiveCache<T>` (lib/apiCache.ts).** Keyed, single-flight, TTL per value, last-good with backoff. API:
```ts
type LiveCacheStatus = 'HIT' | 'MISS' | 'STALE';
interface LiveResult<T> { value: T; status: LiveCacheStatus; updatedAt: number; freshForMs: number }
class LiveBudgetError extends Error {}      // name = 'LiveBudgetError'
createLiveCache<T>({ label, max, retainMs, ttlFor: (v: T, now: number) => number,
  backoffBaseMs = 5_000, backoffMaxMs = 120_000, budgets = [] as CallBudget[], now = Date.now })
  → { get(key, fetcher): Promise<LiveResult<T>>; size(): number; sweep(): void }
```
- **Fresh hit** → `HIT`. **Stale or missing** → one in-flight fetch per key. The request that started it gets `MISS`; requests that joined it get `HIT` (none of them caused another upstream call).
- **Failure** → last-good as `STALE`, else the promise rejects. The key's next attempt waits `min(base·2^(n−1), max)`: 5→10→20→40→80→120s. While waiting, it serves `STALE` or rejects without calling upstream. A success resets the backoff.
- **Budget**: take from every budget only if all have `remaining() > 0`. If any is spent, serve `STALE` or reject with `LiveBudgetError`. Never throws synchronously.
- **Bounded memory**: LRU capped at `max`. Entries older than `retainMs` are dropped by a **lazy sweep inside `get()`** (at most every 60s). **No `setInterval`** (decision 3).

**`lib/gameSummary.ts` (pure, client-safe).** `parseSummary` plus its helpers and the `PlayerLine`/`TeamBox`/`GameSummary` types move here unchanged. Adds `isSummaryFinal(raw)` (reads `header.competitions[0].status.type.completed`). The hook re-exports the types, so `PostGameBox` imports stay as they are.

**`lib/espnLive.ts` (`import 'server-only'`).** The one door to ESPN for live data:
- `espnLiveJson(url)`: budget check → `fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ESPN_LIVE_TIMEOUT_MS) })` with **`ESPN_LIVE_TIMEOUT_MS = 6_000`** → typed errors (`ESPN HTTP 403` etc., logged by the cache). 6s is under the client's 8s abort, so on a slow or hung ESPN the server's STALE (or 502) answer arrives before the browser gives up (~2s headroom for the tunnel). No `unstable_cache`; memory is the only cache.
- Budgets: global `ESPN_LIVE_CALLS_PER_MIN = 120`, plus `SUMMARY_CALLS_PER_MIN = 60` taken only by summary calls. Random event ids can't starve the scoreboard, which always keeps ≥60/min.
- `scoreboardCache = createLiveCache<ScoreboardEntry>({ max: 18, retainMs: 6h, ttlFor: (v, now) => scoreboardTtlMs(v.matchups, now) })`.
  - **Kickoff-safe TTL.** `scoreboardTtlMs(matchups, nowMs)` is a new pure export in `lib/liveWindow.ts`, built on the same constants as `shouldPollLive`:
    - If `shouldPollLive` → `LIVE_TTL_MS = 15_000`.
    - Otherwise `min(IDLE_TTL_MS = 300_000, nextWindowStart − nowMs)`, floored at 1_000. `nextWindowStart` is the earliest `kickoff − KICKOFF_LEAD_MS` among `pre` games that is still in the future (no future window → 300s).
  - An idle entry therefore always goes stale no later than the moment the next game's live window opens. The 5 min idle TTL can never delay a kickoff; worst case is the 1s floor. `shouldPollLive` itself is unchanged.
  - The fetcher calls `ESPN_SCOREBOARD_URL?seasontype=2&week=N`, then `mapEspnScoreboard`.
  - **0 matchups → throw** (CLAUDE.md "throw on empty"), so last-good wins.
  - It stores `matchupsJson` serialized **once per upstream fetch**, so 600+ req/s never re-stringify.
- `summaryCache = createLiveCache<SummaryEntry>({ max: 300, retainMs: 24h, ttlFor: v => v.final ? 6h : 60_000 })`.
- Response helpers:
  - `liveOk(body, result)` sets `Cache-Control: public, s-maxage=<ceil(freshForMs/1000), min 1>, stale-while-revalidate=<2×ttl s>` and `X-Pare-Cache: <status>`.
  - `liveFail(status, error)` covers 400 `invalid-week` / `invalid-event`, 502 `upstream` and 503 `busy`, all with `Cache-Control: no-store`.
  - *Note:* s-maxage is the **remaining** freshness, not the full TTL. Otherwise a HIT at age 14s would let an edge cache keep it another 15s.

**Routes** (`export const runtime = 'nodejs'`, `export const dynamic = 'force-dynamic'`, thin):
- `GET /api/live/scoreboard?week=` checks `^\d{1,2}$` and 1–18. It returns `{ week, updatedAt: ISO, stale: boolean, matchups: Matchup[] }` (kickoff is an ISO string over JSON).
- `GET /api/live/summary?event=` checks `^\d{6,12}$`. The body is exactly `GameSummary` (`{ byAbbr, headline }`); staleness travels in `X-Pare-Cache: STALE`.

**`lib/liveClient.ts` (client-safe, tiny).** Holds `LiveScoreboardResponse`, `SerializedMatchup` and `reviveMatchups(list)` (`kickoff → Date`).

**Hooks (P3).** `useLiveScores` fetches `/api/live/scoreboard?week=${pollWeek}`, then `patchRef.current(reviveMatchups(body.matchups))`. It always patches; the merge is change-detected, and our stale copy is never older than what this client last got from us. `useGameSummary` fetches `/api/live/summary?event=${eventId}`; its client Map cache, timeout, cancel logic and return shape are unchanged. Header comments get rewritten (the "for FREE / CORS-open / server does zero work" text becomes wrong).

**Cloudflare (no dashboard change in this plan).** By default Cloudflare caches by file extension only. `/api/live/*` has none, so it shows `cf-cache-status: DYNAMIC` (same as today's app, CLAUDE.md gotcha): every request reaches the Mac, and `s-maxage` is ignored by the edge. Cloudflare passes our `Cache-Control` to the browser unchanged. Browsers ignore `s-maxage` (it's for shared caches only), and the hooks fetch with `cache: 'no-store'`, so no browser caching. A later Cache Rule for `/api/live/*` ("Eligible for cache" + "use origin Cache-Control") would make the edge honor `s-maxage`. That cuts origin traffic to about one request per key per TTL per PoP, which is the scale lever in the ADR revisit triggers.

**Side benefit.** `mapEspnScoreboard` builds ids with `kickoff.getFullYear()` in the local time zone. Today, SSR ids use the server's time zone and poll ids use the browser's, so they can disagree for a game near New Year in another time zone. After P3, both come from the server.

---

## Gate tooling (written in P0, so the goalposts are fixed before any app code changes)

- `scripts/live-proxy-gates.mjs <p0|p1|p2|p3|p4|p5|all>` runs every check listed for that phase. It prints a PASS/FAIL table and exits 1 on any failure. Any build first confirms port 4000 is free (`net.createServer().listen(4000)`). If dev is running, the build would clobber `.next`, so the gate fails with "stop npm run dev first". The build runs `npm run clean` then `npm run build`.
- `scripts/route-table-diff.mjs <before.txt> <after.txt>` parses the Next build route table. Every non-`/api` route in *before* must keep the same symbol (`○ ● ƒ ◐`) and Revalidate/Expire tokens in *after*; sizes are ignored. `/api/live/scoreboard` and `/api/live/summary` must exist as `ƒ`. Exits 1 otherwise.
- `scripts/live-proxy-inventory.mjs [--assert-no-espn]` scans `app components lib utils config` (`.ts .tsx .css`) for `http(s)://` URLs, `fetch(`, and `<img|link|script` with absolute `src`/`href`. It prints a table with file, `'use client'` yes/no, under `lib/hooks` yes/no, and host. With `--assert-no-espn`, it exits 1 if any `'use client'` file or `lib/hooks/*` contains `espn.com`.
- Artifacts live in `docs/plans/2026-10-12-live-scores-proxy/` (build tables, smoke JSON).
- Plan placeholders `TBD-P0` / `TBD-P4` must be gone for P0/P4 to pass.

Every phase ends with: gate exits 0, then commit with the listed message, then `git status --porcelain -uno` is empty.

---

## P0: Measure + fixtures (app code read-only, one exception)

**Changes**
- `scripts/live-proxy-capture.mjs`:
  - Fetches ESPN's default scoreboard to get the current week, then `scoreboard?seasontype=2&week=W` once. Picks the first `state:'post'` event (falls back to week W−1 if none) and fetches its `summary`. Calls are sequential, ≥300 ms apart, 15s timeout.
  - Saves `lib/__fixtures__/espn/scoreboard-week.json` (full) and `summary-final.json`. The summary is trimmed to `{ header.competitions[0].status, boxscore.players, article.headline }`, the only fields read. Raw sizes are recorded **before** trimming.
  - Prints and writes `docs/plans/2026-10-12-live-scores-proxy/p0-capture.json`: raw bytes, `zlib.gzipSync` bytes, ESPN `content-encoding`, `cache-control`, `age`, `date`, plus the states mix in the scoreboard.
- `scripts/live-proxy-gates.mjs`, `scripts/route-table-diff.mjs`, `scripts/live-proxy-inventory.mjs` (above).
- `lib/__tests__/liveParity.test.ts`: runs the **current** `mapEspnScoreboard` and `parseSummary` on the fixtures, then `expect(JSON.stringify(x, null, 2)).toMatchFileSnapshot('../__fixtures__/espn/parity/<name>.json')` for `scoreboard-matchups.json` and `summary-final.json`. It also asserts ≥1 matchup and ≥1 team with ≥1 line.
- **The one app-code exception:** add `export` to `function parseSummary` in `lib/hooks/useGameSummary.ts`. It's a single keyword; the baseline can't be taken without it, and behavior is identical. *Note-level deviation from "read-only".*
- Build baseline: `npm run clean`, then `npm run build > docs/plans/2026-10-12-live-scores-proxy/build-p0.txt`.
- Fill the P0 table + inventory below.

**P0 results — ESPN today** (filled by the run: 2026-10-13 01:02 UTC, week W = 5, states 0 pre / 1 in / 14 post; source `p0-capture.json`)

| Endpoint | Raw bytes | Gzip bytes | ESPN content-encoding | ESPN Cache-Control | Age |
|---|---|---|---|---|---|
| scoreboard week W | 251,226 | 20,442 | gzip | max-age=1 | (none) |
| summary (final) | 577,511 | 52,618 | gzip | max-age=9 | (none) |
| summary fixture after trim | 109,595 | 10,083 | — | — | — |

Raw = decoded JSON bytes; gzip = `zlib.gzipSync` of that body (≈ wire size).

**P0 inventory — third-party requests the browser makes** (filled by the run from `live-proxy-inventory.mjs`). Expected: only the two ESPN calls above. Anything else is listed here and **not fixed** in this plan.

- `lib/hooks/useLiveScores.ts` → `site.api.espn.com/.../scoreboard` (via `ESPN_SCOREBOARD_URL`), every 15s in the live window.
- `lib/hooks/useGameSummary.ts` → `site.api.espn.com/.../summary?event=…`, when a final game's accordion opens.
- Nothing else. Team logos are local SVGs (`components/ui/TeamIdentity.tsx`). The ESPN logo/headshot URLs carried in leader rows (`lib/leaders.ts`, `lib/fantasy.ts`) are never rendered by any component. Every other ESPN/Sleeper URL lives in server-only modules; `app/layout.tsx`'s `pare.gg` is first-party metadata.

**Gate `p0`:**
- `lib/__fixtures__/espn/scoreboard-week.json` parses with `events.length ≥ 1`.
- `summary-final.json` parses with `boxscore.players.length === 2` and `header.competitions[0].status.type.completed === true`.
- Both parity files exist and are non-empty.
- `npx vitest run lib/__tests__/liveParity.test.ts` exits 0.
- `build-p0.txt` contains `/standings`, `/leaderboards` and `/`.
- `p0-capture.json` exists, and the plan has no `TBD-P0`.
- `git diff --numstat main -- app components lib/hooks lib/espnScoreboard.ts` is exactly `1 1 lib/hooks/useGameSummary.ts`.
- `npm run check` and `npm run test:run` pass.

```
/goal P0 of docs/plans/2026-10-12-live-scores-proxy.md — capture ESPN fixtures + sizes, write gate/inventory/route-diff scripts, parity snapshots, build baseline, fill the P0 table + inventory. Done when `node scripts/live-proxy-gates.mjs p0` exits 0, then commit "test(live): P0 ESPN fixtures, parity snapshots, gate scripts" and `git status --porcelain -uno` prints nothing.
```

## P1: Shared cache helper

**Changes**
- `lib/apiCache.ts`: add `createLiveCache`, `LiveResult`, `LiveCacheStatus`, `LiveBudgetError` (design above). Existing exports are untouched.
- `lib/__tests__/liveCache.test.ts` (injected clock + `vi.fn` fetcher). Test names must contain these phrases, because the gate greps for them:
  1. `50 concurrent`: 50 parallel gets → fetcher ×1, statuses = 1 MISS + 49 HIT
  2. `TTL hit`: second get inside the TTL → 0 calls; after the TTL → 1 call
  3. `ttlFor per value`: 15s vs 300s chosen from the value; `ttlFor` receives the store-time clock
  4. `stale on failure`: fetcher rejects → last-good, `status: 'STALE'`
  5. `rejects with no last-good`
  6. `backoff`: no call before 5s, call at 5s, then 10s, …, capped at 120s; a success resets it
  7. `budget exhausted`: stale → STALE without calling the fetcher; no stale → rejects `LiveBudgetError`; never throws synchronously
  8. `bounded`: `max + 5` keys → `size() ≤ max`; `retainMs` sweep drops old keys
  9. `no timers`: `vi.useFakeTimers()`, then create the cache and do a get → `vi.getTimerCount() === 0`
- `lib/liveWindow.ts`: add `LIVE_TTL_MS`, `IDLE_TTL_MS` and `scoreboardTtlMs(matchups, nowMs)` (design above). `shouldPollLive` is unchanged.
- `lib/__tests__/liveWindow.test.ts` (existing file, new cases). Names must contain these phrases:
  10. `live ttl`: a game `in` → 15_000
  11. `idle ttl no upcoming`: all `post` → 300_000
  12. `kickoff cap`: one `pre` game whose window opens in 2 min → 120_000
  13. `stale when window opens`: a `createLiveCache` with `ttlFor: scoreboardTtlMs` and an injected clock. Store the entry at window-open − 2 min. At window-open − 1 ms it's a HIT (0 extra calls); at window-open it's a MISS (fetcher called a 2nd time).

**Gate `p1`:**
- `npx vitest run lib/__tests__/liveCache.test.ts lib/__tests__/liveWindow.test.ts --reporter=json` reports ≥13 new-or-existing passed and 0 failed.
- All 13 phrases are present across the two test files.
- `git diff main -- lib/liveWindow.ts` shows no removed lines inside `shouldPollLive`.
- `git diff --exit-code main -- package.json package-lock.json` (no new dependencies).
- `npm run check` and `npm run test:run` pass.

```
/goal P1 of docs/plans/2026-10-12-live-scores-proxy.md — add createLiveCache (single-flight, per-value TTL, last-good STALE, capped exponential backoff, budgets, bounded LRU with lazy sweep, no timers) to lib/apiCache.ts and the kickoff-safe scoreboardTtlMs to lib/liveWindow.ts, with tests in lib/__tests__/liveCache.test.ts + liveWindow.test.ts. Done when `node scripts/live-proxy-gates.mjs p1` exits 0, then commit "feat(cache): createLiveCache single-flight TTL cache with last-good + backoff" and `git status --porcelain -uno` prints nothing.
```

## P2: Server routes

**Changes**
- `lib/gameSummary.ts`: the `parseSummary` family plus types moves here verbatim, and `isSummaryFinal` is added. `lib/hooks/useGameSummary.ts` imports `parseSummary` from it and re-exports the types. In P2 the hook still fetches ESPN; that changes in P3.
- `lib/espnLive.ts`: door, budgets, two caches, `getLiveScoreboard(week)`, `getLiveSummary(eventId)`, `liveOk`/`liveFail`.
- `app/api/live/scoreboard/route.ts` and `app/api/live/summary/route.ts`.
- `lib/__tests__/liveParity.test.ts`: the import switches to `@/lib/gameSummary`. **The snapshot files must not change.**
- `lib/__tests__/liveRoutes.test.ts` (node env):
  - Setup: `vi.mock('server-only', () => ({}))`, `vi.stubGlobal('fetch', vi.fn())` serving the P0 fixtures, `vi.resetModules()` + dynamic import per test (fresh module caches), `vi.setSystemTime`.
  - Covers:
    - 200 + shape for both routes.
    - 400 for `week` ∈ {missing, 0, 19, abc, 1.5} and `event` ∈ {missing, abc, 12345, 1234567890123}.
    - The second call is `HIT` with fetch called once in total.
    - Upstream 500, or a rejected `TimeoutError` DOMException, after the TTL → `STALE`, a last-good body and `stale: true` (scoreboard).
    - Upstream failure with no last-good → 502 `upstream`.
    - The fetch is called with an `AbortSignal` (timeout wired), and `lib/espnLive.ts` exports `ESPN_LIVE_TIMEOUT_MS === 6_000`.
    - **Kickoff not delayed (route level):** a fixture copy with all games `post` except one `pre` game at kickoff K. The first request at `K − KICKOFF_LEAD_MS − 2 min` is a MISS, with `s-maxage` ≤120. At `K − KICKOFF_LEAD_MS − 1 s` it's a HIT. At `K − KICKOFF_LEAD_MS` it's a MISS (fetch called twice in total).
    - 61 distinct event ids → the 61st is 503 `busy`, no throw.
    - Scoreboard TTL: a fixture copy with all games `post` gives `s-maxage` ≤300; a live/near-kickoff clock gives ≤15.
    - A summary with `completed: true` gives ≤21600.
    - Headers match `^public, s-maxage=\d+, stale-while-revalidate=\d+$`.
    - **Parity:** `JSON.stringify(body.matchups, null, 2)` matches `parity/scoreboard-matchups.json`, and `JSON.stringify(summaryBody, null, 2)` matches `parity/summary-final.json` (same `toMatchFileSnapshot` files as P0).

**Gate `p2`:**
- The 5 files exist.
- Both routes contain `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.
- `git grep -c "function mapEspnScoreboard"` totals 1.
- `git grep -l "function parseSummary"` is exactly `lib/gameSummary.ts`.
- `lib/espnLive.ts` contains `server-only`, `AbortSignal.timeout`, `no-store` and has no `unstable_cache`.
- `git status --porcelain -- lib/__fixtures__/espn` is empty (snapshots not rewritten).
- `lib/espnLive.ts` contains `ESPN_LIVE_TIMEOUT_MS = 6_000` and imports `scoreboardTtlMs`.
- `npx vitest run lib/__tests__/liveRoutes.test.ts lib/__tests__/liveParity.test.ts --reporter=json` reports ≥15 passed and 0 failed, including a test named with `kickoff not delayed`.
- `npm run check` and `npm run test:run` pass.

```
/goal P2 of docs/plans/2026-10-12-live-scores-proxy.md — move summary parsing to lib/gameSummary.ts, add lib/espnLive.ts + GET /api/live/scoreboard and /api/live/summary (validation, shared ESPN budget, 6s upstream timeout, kickoff-safe scoreboard TTL, X-Pare-Cache, Cache-Control), route tests with mocked fetch incl. parity vs the P0 snapshots. Done when `node scripts/live-proxy-gates.mjs p2` exits 0, then commit "feat(api): /api/live/scoreboard + /api/live/summary ESPN proxy with shared cache" and `git status --porcelain -uno` prints nothing.
```

## P3: Client switch

**Changes**
- `lib/liveClient.ts`: `LiveScoreboardResponse`, `SerializedMatchup`, `reviveMatchups`.
- `lib/hooks/useLiveScores.ts`: fetch `/api/live/scoreboard?week=…` → `reviveMatchups(body.matchups)` → same patch. Drop the `mapEspnScoreboard`/`ESPN_SCOREBOARD_URL` imports and rewrite the header comment.
- `lib/hooks/useGameSummary.ts`: fetch `/api/live/summary?event=…`, drop `SUMMARY_URL`, keep everything else.
- Stale comments: `lib/espnScoreboard.ts` header (the client poll no longer uses it), `app/api/schedule/route.ts:12-16`, and the `lib/hooks/useMyTeamLive.ts:6` wording if it says "ESPN poll".
- `lib/__tests__/liveClient.test.ts`: `reviveMatchups(JSON.parse(JSON.stringify(mapEspnScoreboard(fixture))))` deep-equals `mapEspnScoreboard(fixture)` (Dates included).

**Gate `p3`:**
- `node scripts/live-proxy-inventory.mjs --assert-no-espn` exits 0.
- `git diff --exit-code main -- components` (no UI or provider changes).
- `git diff --name-only main -- app` ⊆ `app/api/live/**` ∪ `app/api/schedule/route.ts`.
- The exported signature text of `useLiveScores`, `useGameSummary` and `UseGameSummaryResult` equals `git show main:<file>` (extracted from `export function …(` to the opening `{`).
- `npm run check` and `npm run test:run` pass.
- Port 4000 free, then clean + build → `build-p3.txt`.
- `node scripts/route-table-diff.mjs build-p0.txt build-p3.txt` exits 0.

```
/goal P3 of docs/plans/2026-10-12-live-scores-proxy.md — switch useLiveScores and useGameSummary to /api/live/*, same policy/timeouts/signatures/return shapes, remove client ESPN constants, fix stale comments. Done when `node scripts/live-proxy-gates.mjs p3` exits 0, then commit "feat(live): browser fetches scores + box scores from pare.gg, not ESPN" and `git status --porcelain -uno` prints nothing.
```

## P4: Local smoke (real ESPN, machine-only)

**Changes**
- `scripts/live-proxy-smoke.mjs`. It requires port 4000 free and an existing `.next` build. It spawns `node node_modules/next/dist/bin/next start -p 4000` and waits for `/api/health` 200 (60s max). Then:
  1. Read the current week W from ESPN's default scoreboard (1 dev-script call; override with `WEEK`).
  2. Scoreboard: `/api/live/scoreboard?week=W` twice → 200, `MISS` then `HIT`. Shape: `week === W`, `matchups.length > 0`, each has `id`/`kickoff`/`state`, `stale === false`, `updatedAt` ISO. `Cache-Control` matches the regex (proves Next keeps our header).
  3. Bad input → 400 for 4 bad weeks and 4 bad events.
  4. Summary of a `post` game from step 2 (fall back to week W−1): `MISS` then `HIT`. Shape: `byAbbr` has ≥1 team with `lines[]`, and `headline` is a string or null.
  5. Cold key: the first week not yet touched → 50 parallel requests → all 200, exactly 1 `MISS`.
  6. Sizes: each 200 route measured with a `node:http` request carrying `accept-encoding: gzip` (wire bytes + `content-encoding`), plus raw bytes.
  - Then it prints a PASS/FAIL table and the computed load-table rows, and writes `docs/plans/2026-10-12-live-scores-proxy/p4-smoke.json` (`pass`, sizes). It kills the server (`child.kill()`, Windows fallback `taskkill /pid <pid> /T /F`) and exits non-zero on any failure.
  - ≤6 ESPN calls in total.
- Fill the load table below from `p4-smoke.json`.

**P4 results — our responses** (filled by the run: 2026-10-13T01:15:36.867Z, week 5; source `p4-smoke.json`)

| Route | Raw bytes | Wire bytes (gzip) | content-encoding |
|---|---|---|---|
| /api/live/scoreboard?week=W | 8,280 | 8,280 | none |
| /api/live/summary?event=… | 894 | 894 | none |

**Load table** (scoreboard wire size; one request per viewer per 15s while live; Cloudflare not caching)

| Viewers | Req/s to the Mac | Upload from the Mac (Mbps) | ESPN calls/min |
|---|---|---|---|
| 100 | 6.7 | 0.44 | ~4 (scoreboard, current week) |
| 1,000 | 66.7 | 4.42 | ~4 |
| 10,000 | 666.7 | 44.16 | ~4 |
| nobody watching / no games | 0 | 0 | 0 |

Mbps = viewers / 15 × wire bytes × 8 / 1e6. ESPN calls don't depend on viewer count (single-flight, 15s TTL). Summaries are ~1 call per final game per 6h.

**Gate `p4`:**
- Port 4000 free, then clean + build.
- `node scripts/live-proxy-smoke.mjs` exits 0.
- `p4-smoke.json` has `pass: true`.
- The plan has no `TBD-P4`.
- Port 4000 is free again afterward (server stopped).

```
/goal P4 of docs/plans/2026-10-12-live-scores-proxy.md — write scripts/live-proxy-smoke.mjs and run it against a local production build on :4000 (MISS→HIT, 400s, 50 parallel → 1 MISS, sizes), then fill the P4 + load tables. Done when `node scripts/live-proxy-gates.mjs p4` exits 0, then commit "test(live): local smoke script + measured load table" and `git status --porcelain -uno` prints nothing.
```

## P5: Privacy + docs

**Changes**
- `app/privacy/page.tsx`:
  - "Services we rely on" → ESPN item: "Scores, box scores and stats come from ESPN's public data. Only our server contacts ESPN; your browser or app does not, and we send ESPN nothing about you."
  - "Sports data": "All sports data, including live scores and box scores, is fetched by our server and delivered from pare.gg."
  - `EFFECTIVE_DATE` → the run date. Keep `&apos;` escaping. Other sections untouched.
- `CLAUDE.md`:
  - Privacy row: "browser hits ESPN directly…" → "browser contacts only pare.gg for sports data (`/api/live/*`)".
  - TODO-before-App-Store row: scores/box scores → **done** (date, link ADR).
  - Freshness table live row: browser polls `/api/live/scoreboard` every 15s; server memory cache 15s live / 5 min idle → lag ~15–30s.
  - Key facts "Data freshness": live ~15–30s.
  - Data bullet "Schedule + live scores".
- `DATA_SOURCES.md`: new section "6. Live proxy (`/api/live/*`)" covering endpoints, validation, TTLs (15s live / ≤5 min idle capped at the next live-window start; 6h final / 60s otherwise), budgets (120/min global, 60/min summary), 6s upstream timeout, single PM2 fork assumption, seasontype=2 only, `X-Pare-Cache`, and that the browser never calls ESPN.
- `CHANGELOG.md` `[Unreleased]`: one bullet.
- `docs/devnotes/2026-10-12-live-scores-proxy.md`: rationale, P0/P4 tables (link, don't duplicate), the Cloudflare default-behavior note.
- `docs/adr/2026-10-12-live-scores-proxy.md` (from `_template.md`):
  - Decisions 1–5.
  - Consequences: one IP for ESPN; the Mac's upload now scales with viewers; caches are per process (single PM2 fork assumed).
  - Revisit if PM2 cluster mode is ever turned on.
  - Revisit triggers: ESPN 403/429 in `pm2 logs pare` → longer TTL / budget review; Mac upload saturation or high req/s → Cloudflare Cache Rule on `/api/live/*`; ESPN shape change → the mapper.

**Gate `p5`:**
- `npm run check`, `npm run test:run`, then port free + clean + build all pass.
- `app/privacy/page.tsx` has no match for `directly from ESPN|loads that data directly|exception described above`, and `EFFECTIVE_DATE` ≠ `'October 8, 2026'`.
- `CLAUDE.md` has no `hits ESPN directly`, and no longer contains ``Route live scores (`useLiveScores`)``.
- `DATA_SOURCES.md` contains `/api/live/scoreboard` and `/api/live/summary`.
- `CHANGELOG.md` contains `/api/live`.
- The devnote and ADR exist, and the ADR contains `Revisit triggers`.
- `git diff --name-only main` includes all 6 doc paths.

```
/goal P5 of docs/plans/2026-10-12-live-scores-proxy.md — update /privacy (browser no longer contacts ESPN; new effective date), CLAUDE.md rows, DATA_SOURCES.md, CHANGELOG, devnote and ADR. Done when `node scripts/live-proxy-gates.mjs p5` exits 0, then commit "docs(live): privacy, data sources, ADR + devnote for the live scores proxy" and `git status --porcelain -uno` prints nothing.
```

## Run all

```
/goal run P0→P5 of docs/plans/2026-10-12-live-scores-proxy.md in order on branch feat/live-scores-proxy: for each phase do its Changes, run `node scripts/live-proxy-gates.mjs pN`, and commit with the phase's message; stop at the first gate that exits non-zero and report its FAIL rows. Done when `node scripts/live-proxy-gates.mjs all` exits 0 (all static checks + check/test/build once + p4-smoke.json pass:true), HEAD is the P5 commit, and nothing was pushed.
```

Final report after the run: files changed per phase; the P0 + P4 tables; key snippet + micro-learning + analogy; one PowerShell box (push branch, merge to main, one command per line, no `&&`); one Mac deploy box (CLAUDE.md deploy steps).

---

## Risks + handling

| Risk | Handling |
|---|---|
| ESPN blocks or limits the Mac's IP (403/429) | Last-good `STALE` + per-key backoff up to 2 min + 120/min budget. Each failure is logged once per backoff window (`⚠️ [live:scoreboard] ESPN HTTP 403 …`), which is the ADR revisit trigger. The client swallows errors and keeps its last-known data. No browser fallback (decision 1). |
| Mac or tunnel down | The site is down anyway; nothing new. |
| Game-day spike | Single-flight makes ESPN calls independent of viewers. Serialize-once keeps CPU flat. If upload/req/s gets high, add a Cloudflare Cache Rule for `/api/live/*` (headers already correct). |
| Memory growth | Scoreboard ≤18 keys, summary ≤300 keys (LRU) + `retainMs` lazy sweep. Random event ids are capped by the 60/min summary budget and LRU eviction. |
| Slow or hung ESPN | The upstream timeout is 6s, under the client's 8s abort. The server gives up first and answers STALE (or 502 when there's no last-good) about 2s before the browser would abort. A late ESPN success is not lost: the next tick refetches. |
| Idle TTL delaying a kickoff | `scoreboardTtlMs` caps the 5 min idle TTL at the next game's live-window start (`kickoff − 10 min`). Tested in P1 (cache + clock) and P2 (route). |
| Caches are per Node process | Assumes a single PM2 **fork** instance (`pare`), which is today's setup: one cache, one single-flight, one budget. PM2 **cluster** mode (`-i N`) would give each worker its own cache and budget, so ESPN calls ×N and the budget is effectively ×N. If cluster mode is ever turned on, divide the budgets by N or move the cache to a shared store, and revisit this ADR. |
| Next overriding our `Cache-Control` on dynamic routes | P4 asserts the header on a real `next start`; the gate fails if Next changes it. |
| Test fixtures drift from live ESPN | Parity is pinned to committed fixtures; the P4 smoke covers the real shape. |
| Windows `.next` ENOENT (OneDrive) during builds | Gates run `npm run clean` first; on ENOENT, rerun the phase gate once. |

## After deploy (optional, not a gate)

During the next live game on pare.gg, the DevTools Network panel shows only `/api/live/scoreboard?week=N` every 15s (no `espn.com`). Scores move within ~15–30s of ESPN. `curl.exe -sI "https://pare.gg/api/live/scoreboard?week=N"` shows `x-pare-cache` HIT/MISS and `cf-cache-status: DYNAMIC`.

## Follow-ups (not in this plan)

- `ScheduleProvider.fetchWeekMatchups` has its own `SerializedMatchup` + revive; it could use `lib/liveClient.ts` `reviveMatchups`. That's a one-line change, left out because decision 5 keeps components untouched.
- Surprises from the P0 inventory, if any.
- **Postseason not handled**, same as today. The route only accepts weeks 1–18 and always asks ESPN for `seasontype=2`; playoff games (`seasontype=3`) won't live-update. A future change adds a `seasontype` param and validation when the schedule supports playoffs.
- A Cloudflare Cache Rule, if P4 numbers or game-day logs call for it.

## This /plan run (after approval)

1. `git status --porcelain -uno` must be empty (true now: only untracked files) and `main == origin/main` (true now: `d6016bd`).
2. `git switch -c feat/live-scores-proxy`
3. Copy this plan to `docs/plans/2026-10-12-live-scores-proxy.md`.
4. `git add docs/plans/2026-10-12-live-scores-proxy.md`, then `git commit -m "docs(plans): live scores proxy plan"` (with the Co-Authored-By line). Local only; then stop.
