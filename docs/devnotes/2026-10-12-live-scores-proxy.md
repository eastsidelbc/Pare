# 2026-10-12 — Live scores + box scores through pare.gg

Branch `feat/live-scores-proxy` · plan `docs/plans/2026-10-12-live-scores-proxy.md` · ADR `docs/adr/2026-10-12-live-scores-proxy.md`

## Why
App Store prep: the browser/app should talk only to pare.gg. The last two direct ESPN calls were the 15s live-score poll (`useLiveScores`) and the post-game box score (`useGameSummary`). Now both hit our routes; ESPN never sees a visitor.

## How it works
- `GET /api/live/scoreboard?week=N` → `{ week, updatedAt, stale, matchups }`; `GET /api/live/summary?event=ID` → `GameSummary`. Thin routes; everything lives in `lib/espnLive.ts`.
- `createLiveCache` (`lib/apiCache.ts`): keyed single-flight, TTL chosen per value, last-good as `STALE` on failure with per-key backoff (5→120s), call budgets, LRU cap, lazy sweep — **no timers**.
- Scoreboard TTL = `scoreboardTtlMs` (`lib/liveWindow.ts`): 15s if any game is watch-worthy (same rule as the client poll), else ≤5 min capped at the next live-window start. A cached idle copy therefore expires exactly when the next game's window opens (tested at cache and route level).
- `matchups` is serialized once per ESPN fetch; hot reads just concatenate strings.
- Parsing moved to `lib/gameSummary.ts` (verbatim); `useGameSummary` re-exports its types so `PostGameBox` is untouched. `lib/liveClient.ts` revives `kickoff` to a Date.
- Proof of no behavior change: parity snapshots captured from the **old** code in P0 (`lib/__fixtures__/espn/parity/`) are matched byte-for-byte by the new routes in `lib/__tests__/liveRoutes.test.ts`.

## Measurements
P0 (ESPN today) and P4 (our responses + load table) are in the plan, filled from `docs/plans/2026-10-12-live-scores-proxy/p0-capture.json` and `p4-smoke.json`. Headline: scoreboard 8.3 KB vs ESPN 251 KB raw; 50 parallel cold requests → 1 ESPN call.

## Gotchas found
- **`next start` doesn't gzip route-handler responses** (P4: `content-encoding: none` with `accept-encoding: gzip`). Browsers still get compression from Cloudflare, but the Mac → tunnel leg is uncompressed, so the load table's Mbps uses raw bytes. Gzipping in the route (or a Cloudflare Cache Rule) is the first lever if upload gets tight.
- **Cloudflare default:** caches by file extension only, so `/api/live/*` is `cf-cache-status: DYNAMIC` and our `s-maxage` is ignored at the edge today. Browsers ignore `s-maxage`, and the hooks fetch `no-store`. A Cache Rule ("Eligible for cache" + origin Cache-Control) would cut origin traffic to ~1 request per key per TTL per PoP.
- `s-maxage` is the **remaining** freshness, not the full TTL — a HIT at 14s of 15s must not let an edge keep it 15s more.
- Gate tooling (`scripts/live-proxy-gates.mjs`): on Windows, `spawnSync(..., { shell: true })` splits args at spaces, so `git grep "function x"` silently matched nothing. Shell only for npm/npx now.

## Verify after deploy
During a live game: DevTools Network shows only `/api/live/scoreboard?week=N` every 15s (no `espn.com`). `curl.exe -sI "https://pare.gg/api/live/scoreboard?week=N"` → `x-pare-cache` HIT/MISS, `cf-cache-status: DYNAMIC`. Watch `pm2 logs pare` for `⚠️ [live:scoreboard] ESPN HTTP 403/429`.
