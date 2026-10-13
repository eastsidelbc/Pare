# ADR: Live scores + box scores through our server (`/api/live/*`)

## Date
2026-10-12

## Status
Accepted (2026-10-12). Built on `feat/live-scores-proxy` (plan `docs/plans/2026-10-12-live-scores-proxy.md`, P0–P5).

## Context
Two browser hooks still called ESPN directly: `useLiveScores` (week scoreboard every 15s inside the live window) and `useGameSummary` (box score when a final game's accordion opens). Everything else (schedule, stats, standings, leaders, Sleeper) was already server-side. Before App Store submission the browser/app should talk only to pare.gg, so /privacy can say ESPN never sees visitors (CLAUDE.md "TODO before App Store").

The pattern already exists for Sleeper: `/api/myteam/live` + `createKeyedCache` + a call budget (ADR `2026-10-07-my-team-provider-proxy.md`).

## Decision
Our server fetches ESPN when a request needs it, trims + maps the payload, keeps it in memory and serves one shared copy to everyone: `GET /api/live/scoreboard?week=N` and `GET /api/live/summary?event=ID` (`lib/espnLive.ts`, `createLiveCache` in `lib/apiCache.ts`).

Kobe's fixed decisions:
1. **No browser fallback to ESPN.** When ESPN fails, serve last-good marked stale (`X-Pare-Cache: STALE`, `stale: true`); no last-good → 502.
2. **Client policy unchanged:** 15s, live window only, pause when hidden, 8s timeout, swallow errors.
3. **Pull-based cache only** — no timers or cron. Retention is a lazy sweep on read.
4. **Sleeper out of scope.**
5. **No UI changes;** hook signatures and `patchLiveMatchups` unchanged.

Supporting choices: TTL 15s live / ≤5 min idle, capped at the next live-window start so an idle TTL can never delay a kickoff (`scoreboardTtlMs`); summaries 6h once final, else 60s. Budgets 120 ESPN calls/min overall, 60/min for summaries. Upstream `no-store` + 6s timeout (under the client's 8s). `Cache-Control: public, s-maxage=<remaining freshness>`.

## Consequences
- **One IP for ESPN.** All live traffic now leaves the Mac mini's IP. Single-flight keeps ESPN calls independent of viewers (~4/min for the current week while live; measured 50 parallel cold requests → 1 ESPN call). A block (403/429) would hit everyone at once — last-good + backoff soften it.
- **The Mac's upload now scales with viewers.** Cloudflare doesn't cache `/api/*` today, so each viewer's 15s poll reaches the Mac: 8.3 KB per scoreboard response (measured; `next start` does not gzip it) ≈ 4.4 Mbps at 1,000 viewers, 44 Mbps at 10,000 (plan P4 load table).
- **Caches are per Node process.** This assumes the single PM2 **fork** instance `pare` (today's setup): one cache, one single-flight, one budget. PM2 cluster mode (`-i N`) would give each worker its own cache and budget, so ESPN calls ×N.
- **Privacy:** the browser no longer loads any third-party sports domain; /privacy updated (2026-10-12).
- **Side benefit:** matchup ids for SSR and live polls now both come from the server's time zone.
- **Smaller payload to phones:** 8.3 KB vs ESPN's 251 KB raw scoreboard; the mapper no longer ships in the Home bundle (38.2 → 36.5 kB).

## Revisit triggers
- **PM2 cluster mode** ever turned on → divide the budgets by N or move the cache to a shared store; revisit this ADR.
- **ESPN 403/429** in `pm2 logs pare` (`⚠️ [live:scoreboard] ESPN HTTP 403 …`) → longer TTLs / budget review.
- **Mac upload saturation or high req/s** on game day → Cloudflare Cache Rule on `/api/live/*` ("Eligible for cache" + use origin Cache-Control; headers are already correct), and/or gzip the route responses.
- **ESPN shape change** → the mapper (`lib/espnScoreboard.ts`) / parser (`lib/gameSummary.ts`); parity snapshots in `lib/__fixtures__/espn/parity/` catch drift in our own code.
- **Playoffs:** routes accept weeks 1–18 and `seasontype=2` only (same as before).

## Alternatives Considered
- **Keep the browser on ESPN** — zero server load, but ESPN sees every visitor and /privacy can't promise "only pare.gg" for the App Store.
- **Browser fallback to ESPN when our route fails** — rejected (decision 1): it keeps the third-party domain in the app.
- **Timer/cron refresh on the server** — rejected (decision 3): wakes ESPN even with no viewers; pull-based single-flight costs nothing when nobody watches.
- **`unstable_cache`** — rejected: its fetch timeout can be dropped during refresh (CLAUDE.md gotcha) and live data doesn't need disk.

## Links
- Dev Note: `docs/devnotes/2026-10-12-live-scores-proxy.md`
- Plan + measurements: `docs/plans/2026-10-12-live-scores-proxy.md` (P0 + P4 tables)
- Data: `DATA_SOURCES.md` §6
- CLAUDE: `CLAUDE.md#data-espn--sleeper--no-csv` (freshness table), Key facts "Privacy policy"
