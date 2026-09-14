BATCH 3 now (#1 from the audit) — data caching for Vercel/serverless. Preserve the existing
fallback + timeout behavior and displayed values. Cheap verification only (no browser).

- Remove `cache: 'no-store'` from the ESPN fetches in lib/espnStats.ts (scoreboard, standings,
  summary, team stats). Use `fetch(url, { next: { revalidate: REVALIDATE } })` so Vercel's
  Data Cache PERSISTS them across serverless invocations (this is the whole point).
- Wrap the heavy defense aggregation (yards + third-down) in `unstable_cache` with a tag/key,
  and/or set `export const revalidate = REVALIDATE` on the nfl-2025/offense, nfl-2025/defense,
  and schedule API routes, so the computed result is cached and NOT recomputed on cold requests.
- Add a REVALIDATE constant in config/constants.ts (default 3600 = 1h) so freshness is tunable;
  keep schedule on ~1h too. (Data still updates on its own each revalidate window.)
- Keep the existing graceful fallback (stale/CSV) and 8s timeouts intact — don't remove them.

Verify (cheap):
1. npm run build clean; confirm NO `cache:'no-store'` remains on ESPN calls and the aggregation
   is wrapped in a persisted cache (unstable_cache and/or route revalidate).
2. curl the defense endpoint twice — second response is fast (served from cache), not a full
   re-aggregation. Note the REVALIDATE value used.
List files changed and results.