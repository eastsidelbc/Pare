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

## Performance audit (sandbox, same day)
Prod build + realistic fixture (32 teams, a tie, W10 streak, 3-digit PF/PA, seeds; 190ms fake ESPN delay = measured prod). Chromium, CPU throttled **4×**, median of 3 runs.

| Metric | iPhone 14 Pro 393×759 | iPad 834×1194 | iPad 1194×834 | "Good" bar |
|---|---|---|---|---|
| LCP | 0.56s | 0.48s | 0.48s | < 2.5s |
| TTFB | 0.24s | 0.21s | 0.21s | < 0.8s |
| View switch tap → paint (Conf / Playoffs / Division) | 113 / 83 / 131ms | 115 / 92 / 95ms | 127 / 86 / 93ms | < 200ms (INP) |
| Scroll full list | 60 fps, 0 dropped | 60 fps, 0 dropped | 60 fps, 0 dropped | 60 fps |
| Home → Standings (nav tap → ready) | 0.72s | 0.74s | 0.68s | — |
| Idle main thread (5s) | ~56ms (~1%) | ~59ms | ~52ms | ~0 |
| Running animations at rest | 0 | 0 | 0 | 0 |
| Load long tasks / TBT | 3 / 227ms (longest 168ms = hydration) | 3 / 201ms | 3 / 188ms | TBT < 200ms (4× CPU) |

- Verdict: **quick enough, no fixes.** Real iPhone ≈ 4× faster than the throttled run → taps ~25–35ms. Page is ~457 DOM nodes, HTML 13 KB gzipped.
- None of the Compare anti-patterns: no animations, `backdrop-filter`, animated shadow/filter, or infinite loops in `components/standings/*` (static rows by design).
- Only cost worth noting: one-time hydration task on load (~170ms at 4×, ~40ms real). Home → Standings includes the ~0.19s live ESPN call (accepted tradeoff, see above).
- Gaps: the paint-trace counter didn't record in headless Chromium (repaints/sec not measured; idle CPU + zero animations cover it). Sandbox is Chromium, not iOS Safari — on-device Timelines recording skipped given the margins; do one only if it ever *feels* slow.

## Watch in prod
- `pm2 logs pare | grep standings` — warnings only appear when ESPN misbehaves.
- If traffic grows: a 60s cache in front of `fetchStandings` cuts ESPN calls with a one-line change.
