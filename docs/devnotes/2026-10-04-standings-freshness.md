# 2026-10-04 — Standings freshness audit + two safety fixes

## Question
"Standings should update on their own after a game ends, like a normal sports app — within 5 min max. Is the current system good enough?"

## Audit (before)
- `app/standings/page.tsx` = `force-dynamic`; `lib/standings.ts` fetches ESPN `no-store` → **every visit is a fresh ESPN call**. The service worker never caches HTML. Switching Division/Conf/Playoffs reuses loaded data.
- Measured on the Mac mini: page TTFB **0.222s**, ESPN standings alone **0.189s** → ESPN is ~85% of server time, but the total is fast. A cache would save ~0.19s and add staleness → not worth it.
- **Freshness: already as fresh as ESPN** (well inside the 5-min target). OT / delays / TNF / MNF need no special handling because nothing is clock-based.
- Two real gaps:
  1. ESPN error → empty boxes; ESPN hang → page hangs (no timeout).
  2. App left open / backgrounded while a game ends → screen stays old until you navigate away and back.

Considered and **rejected** (over-engineering for no visible gain): finals-fingerprint + confirm loop, scoreboard-vs-standings record diff, short TTL cache, background heartbeat.

## Fix
1. **Timeout + last good copy** — `fetchStandings()` (throws on HTTP error, 5s `AbortSignal.timeout`, or <32 teams mapped) wrapped by `liveWithLastGood()` in `lib/apiCache.ts` with a `createTtlCache(0)` backup (same backup-only pattern the offense/defense routes use). Memory is per PM2 process; resets on restart.
2. **Refresh on return** — `lib/hooks/useRefreshOnReturn.ts`: on `visibilitychange` (and Safari `pageshow` from bfcache), if data is ≥60s old → `router.refresh()`. Keeps client state (view + scroll), no skeleton. Age clock resets when new data arrives.

Analogy: the scoreboard operator now keeps last week's sheet in the drawer (posts it if the fax dies, instead of a blank board), and glances at the fax again whenever someone walks back into the room.

## Verification (sandbox)
- `npm run check` ✅ · `npm run test:run` 76/76 ✅ · `npm run build` ✅ (`/standings` dynamic).
- Prod server with ESPN faked: ok → 32 rows · 503 → last good (0.06s) · hang → last good after 5.0s · recovery → new data · cold start + 503 → empty boxes, HTTP 200, no crash. Log lines: `⚠️ [standings] fetch failed (…) — serving last good copy`.

## Watch in prod
- `pm2 logs pare | grep standings` — warnings only appear when ESPN misbehaves.
- If traffic grows: a 60s cache in front of `fetchStandings` cuts ESPN calls with a one-line change.
