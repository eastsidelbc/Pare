# 2026-10-02 — Data freshness fix (self-hosted pare.gg)

Branch: `fix/data-freshness` · Supersedes the **"Still open (data)"** list in `2026-10-02-session-pickers-premium-cleanups.md` (Compare-stats freshness + kickoff polling done; Option B still deferred; standings-tick-while-open still open).

## What was wrong (measured, not guessed)

Tested a production build (`next build` + `next start`, same as the Mac mini) against a **fake ESPN** whose data could be changed on demand, plus a **clock skip** so hour-long timers could be checked in seconds.

1. **Compare stats froze for ~6h on pare.gg.** `app/api/nfl-2025/{offense,defense}/route.ts` checked a module-level in-memory cache (`PRODUCTION_MAX_AGE` = 6h) *before* anything else. ISR re-ran the route hourly, but the route answered from memory → **0 ESPN calls for 5h** after a stat change. Vercel hid it (instances restart → memory wiped). Also froze the **W-L record on Compare** (it rides on the defense route) while the Standings tab was instant.
2. **Every refresh re-downloaded every box score of the season.** The yards-allowed aggregation ran inside an outer `unstable_cache`, and Next **bypasses all caching nested inside `unstable_cache`** (`isNestedUnstableCache` in `next/dist/server/web/spec-extension/unstable-cache.js`). ~16 box scores per finished week, ~270 by Week 18, every refresh.
3. **Live scores never started if the page was opened before kickoff.** `useLiveScores` only polled when a loaded game was already `state === 'in'`; a "pre" page stayed frozen until reload (0 polls in 40s after kickoff), and the home page ISR (5 min) kept serving "pre" right after kickoff.

## What changed

| File | Change |
|---|---|
| `app/api/nfl-2025/{offense,defense}/route.ts` | Removed the `getFresh()` short-circuit; memory copy is now a **last-good backup only** (`createTtlCache(0)`, read via `getStale()` on ESPN failure). `revalidate` 3600 → **600**. |
| `config/constants.ts` | `REVALIDATE_SECONDS` 3600 → **600**; new `FINAL_BOXSCORE_REVALIDATE_SECONDS` = 24h; removed now-unused `PRODUCTION_MAX_AGE` / `DEBUG_MAX_AGE`. |
| `lib/espnStats.ts` | Removed outer `unstable_cache` on the yards aggregation (route ISR already caches it; the wrapper disabled the inner caches). New per-game `getGameYards()` `unstable_cache` (24h) — **incomplete box scores throw** so they're retried next refresh instead of being frozen. |
| `lib/liveWindow.ts` (new) + `lib/__tests__/liveWindow.test.ts` (new) | `shouldPollLive()` — poll if any game is live, or "pre" within 10 min before / 3h after listed kickoff. 8 unit tests. |
| `lib/hooks/useLiveScores.ts` | Uses `shouldPollLive`, re-evaluated on data change + every 60s (no network; no re-render unless the answer flips). |
| Comments | `app/api/schedule/route.ts` (said 1h, is 5 min), `app/api/standings/route.ts` + `app/standings/page.tsx` (said ~1h, is uncached), `lib/schedule.ts` (said ~1h, is 5 min), `app/leaderboards/page.tsx` (page actually re-renders ~5 min; data 6h). |
| `CLAUDE.md` | New **Data Freshness** table + rules; corrected Data line, deploy commands (`pm2 … pare`), data flow; removed CSV section. `docs/proposed/CLAUDE.lean.md` caching line + key-facts row updated. |

## Verification (all on this branch)

- `npm run check` (tsc + eslint) ✅ · `npm run test:run` 37/37 ✅ (8 new) · `next build` ✅ (offense/defense show **10m**).
- **Stats:** ESPN change → Compare offense + ATL W-L record updated at **+10 min** (was +5h). ESPN untouched between refreshes.
- **ESPN calls per 10-min refresh (Week 5 mock):** 32 team stats + 5 week scoreboards + 1 standings + **0 box scores** (was 64 every refresh).
- **New final game:** next refresh downloads exactly **1** box score; ARI yards-allowed updated. **Incomplete box score** at the final → not cached, retried and counted next refresh. **24h later:** one daily re-check of all box scores (stat corrections).
- **Kickoff (headless browser, 393px):** kickoff 60 min away → 0 polls (no waste). Page opened 5 min before kickoff → polling on its own, live score shown, polling **stops** after final. Kickoff 11 min away → first poll at **+60s** when the window opened.
- **Standings:** still instant (unchanged).

## Expected on pare.gg after deploy

| Data | Before | After |
|---|---|---|
| Compare stats + W-L record on Compare | ~5–6h | **≤10 min** (+ one reload) |
| Live scores, page opened pre-kickoff | frozen until reload | **auto-live within ~15s** |
| ESPN box-score calls | all season, every refresh | **only new finals** + 1 daily re-check |
| Standings / schedule / leaderboards | instant / 5 min / 6h | unchanged |

Note: ESPN's own team-stat feed may lag the final whistle by some amount (not measured) — that adds on top of the 10 min.

## Deploy (Mac mini)

```
git pull
npm install
npm run clean
npm run build
pm2 restart pare
```

## Still open
- **Option B** — `revalidatePath()` endpoint + PM2 watcher that pings it when a game goes final → stats within ~1–2 min. Next step after one real game day.
- Standings don't tick while the tab stays open (fresh on load only).
