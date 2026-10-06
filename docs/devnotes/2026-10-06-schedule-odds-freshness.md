# 2026-10-06 — Schedule odds freshness (stale weeks + service-worker kill switch)

## Problem
A week loaded before ESPN posts its betting lines could stay blank for a long
time on the installed iPhone home-screen app. Audit found two causes:

1. **Loaded weeks never refreshed.** `ScheduleProvider` fetched each week once
   (seed / `appendWeek` / `prependWeek` / `resetTo`). The 15s live poll only
   covers `currentNflWeek` and only near kickoff. Nothing on foreground/focus
   touched other weeks. iOS resumes the same page for days → odds frozen at
   first load.
2. **Old service worker.** `public/sw.js` served every `/api/*` (incl.
   `/api/schedule?week=N`) stale-while-revalidate with no max age (and
   `/api/nfl-*` cache-first for 30 min). Prod ships `ENABLE_SW = false`
   (verified via curl), but nothing unregistered it on devices that installed
   it earlier.

ESPN check at audit time: w5 = 15 lines on ESPN and pare.gg; w6/w7 = 0 on both
(so not stale *yet* — ESPN just hadn't posted).

## Fix
**Stale-week refresh** (`components/schedule/ScheduleProvider.tsx`,
`lib/scheduleRefresh.ts`):
- Per-week `fetchedAt` kept in a ref (no re-render when a refresh changes nothing).
- `refreshStaleWeeks(activeWeek)` re-fetches the in-view week ±1 when older
  than 5 min (`LIVE_REVALIDATE_SECONDS` — sooner just hits the same server copy).
- Triggers: `activeWeek` change (scroll/jump), `visibilitychange` → visible,
  `pageshow` (bfcache). Same pattern as `useRefreshOnReturn`; reuses its
  `isDataStale`.
- Merge rules (`mergeRefreshedWeek`, pure + tested): never erase a known line;
  never step a game backwards behind the live poll; in-progress games belong to
  the live poll; empty response = failed fetch → keep screen.

**Service-worker kill switch** (`public/sw.js`): skipWaiting → delete `pare-*`
caches → unregister. No fetch handler, so requests go to the network the moment
it activates; no forced reload (avoids a reload loop if the flag is ever
flipped on). Old worker archived in `_to-delete/2026-10-06-sw-pwa-cache/`.

## Not changed / known gaps
- `currentNflWeek` is still seeded once by the server; a session resumed across
  the weekly rollover keeps polling last week until a full reload.
- `/` HTML + ESPN scoreboard fetch are cached 5 min (stale-while-revalidate),
  so worst case after ESPN posts a line ≈ 5 min + one request.
- `/sw.js` is served `max-age=14400` in prod (likely Cloudflare Browser Cache
  TTL overriding `next.config.ts`'s `max-age=0`). Browsers bypass HTTP cache
  for the SW script update check, so the kill switch still lands.
