# 2026-10-12 — Live scores ≤15 seconds behind ESPN (5s poll, 10s server copy, gzip)

Branch `feat/live-freshness` · plan `docs/plans/2026-10-12-live-freshness.md` · ADR amendment in `docs/adr/2026-10-12-live-scores-proxy.md` ("Amendment — 2026-10-12: live freshness").

## Why
During MNF Kobe saw 1:11 on Pare while the real clock read 0:37. The phone polled every 15s and the server kept its copy for 15s, so a score was ~15s old on average and ~30s at worst. ESPN isn't the bottleneck (its scoreboard is `max-age=1`); our two waits were. Target: worst case 15 seconds.

## What changed
- `lib/liveWindow.ts`: `LIVE_TTL_MS` 15s → **10s**, new `LIVE_POLL_MS = 5s` (the one source for the hook). `shouldPollLive` / `scoreboardTtlMs` logic untouched, so the kickoff-safe idle TTL is unchanged.
- `lib/hooks/useLiveScores.ts`: polls every `LIVE_POLL_MS` inside the live window only; **in-flight guard**, so a tick is skipped while a request is still out (5s poll < 8s timeout) and an older answer can never land after a newer one. Signature, hidden-tab pause, refocus tick and 60s window re-check unchanged.
- `lib/espnLive.ts`: we gzip `/api/live/*` ourselves (`next start` doesn't compress route handlers). `acceptsGzip` (explicit `gzip`, q > 0), `WireBody` memoized on the scoreboard cache entry per fresh/stale variant (`scoreboardWire`), so the scoreboard is compressed **at most once per ESPN fetch**. The summary is compressed per response (Sleeper points differ per response) and only from 1 KB (`GZIP_MIN_BYTES`); today's ~0.9 KB box scores go out plain. Every 200 has `Vary: Accept-Encoding`; gzipped ones have `Content-Encoding` + `Content-Length`. Errors, `X-Pare-Cache`, `Cache-Control` unchanged.
- Routes pass `req` to `liveOk`. Stale "15s" comments fixed in `lib/apiCache.ts`, `lib/espnScoreboard.ts`, `lib/scheduleRefresh.ts`, the scoreboard route.
- Tooling: `scripts/live-fresh-gates.mjs` (phase gates, baseline route table `docs/plans/2026-10-12-live-freshness/build-f0.txt`); `scripts/live-proxy-smoke.mjs` extended (gzip vs plain on both routes, writes `f3-smoke.json` and fills the plan's F3 tables at a 5s poll).

## Verified
- Gates F0–F3 + `all` of `scripts/live-fresh-gates.mjs`: `npm run check`, `npm run test:run`, clean prod build, route table identical to the F0 baseline (non-/api), `/api/live/*` still `ƒ`.
- Tests: "freshness budget" (`LIVE_POLL_MS + LIVE_TTL_MS ≤ 15s`), live `s-maxage ≤ 10`; gzip in `lib/__tests__/liveRoutes.test.ts` with a `gzipSync` call counter (1 MISS + 100 HITs → 1 gzip; STALE variant gzipped once more; summary < 1 KB plain, ≥ 1 KB gzipped per response; decoded = plain byte for byte; 400/502 unchanged). Kickoff-cap tests byte-identical to main.
- Smoke on a local prod build against real ESPN (week 5, `f3-smoke.json`): scoreboard **8,281 → 1,657 B** gzip, `content-length` = wire, decoded JSON = plain JSON; summary 896 B plain; 50 parallel cold → 1 ESPN call; 4 ESPN calls total.

| | Server TTL | Phone poll | Avg behind ESPN | Worst case |
|---|---|---|---|---|
| Before | 15s | 15s | ~15s | ~30s |
| After | 10s | 5s | ~7.5s | ~15s |

Load at a 5s poll (measured wire size): 100 viewers 20 req/s / 0.27 Mbps · 1,000 → 200 req/s / 2.65 Mbps · 10,000 → 2,000 req/s / 26.5 Mbps (was 44 Mbps at 15s, uncompressed). ESPN ~6 calls/min per live week, independent of viewers.

## Open risks
- **3× requests to the Mac while live** (2,000 req/s at 10k viewers). First lever: Cloudflare Cache Rule on `/api/live/*` (ADR revisit trigger; `Vary` already set).
- **ESPN 403/429 at ~6 calls/min**: budget unchanged; watch `pm2 logs pare`.
- **Phone battery:** more wake-ups, but only while a game is live and the tab is visible; responses ~1.7 KB.
- Cloudflare may re-encode to `br` for browsers; expected. Our gzip shrinks the Mac → tunnel leg.
- Not yet watched on pare.gg during a live game: see the plan's "After deploy" curl check.
