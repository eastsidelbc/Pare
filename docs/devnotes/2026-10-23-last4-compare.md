# 2026-10-23 — Compare "L4" (last 4 games) mode

Branch: `feat/last4-compare` · Plan: `docs/plans/wanting-to-add-the-starry-volcano.md` · Data: `DATA_SOURCES.md` §8

## Why
Season averages hide how a team plays *now*: after a QB change or a mid-season turnaround, a team's last few games
tell a different story. Kobe wanted that next to the season numbers on Compare and Home, without new chrome.

## Decisions (Kobe, 2026-10-23)
- **UX:** a third option in the existing per-panel header switch → `PG | L4 | TOT` (not a separate Season/Last 4 pill,
  not a per-row trend arrow). Per panel, like PG/TOT today; defaults to PG.
- **Coverage:** every Compare metric gets an L4 number (parser extended), not only what the log already had.
- **Ranks:** in L4, ranks/badges are among all 32 teams' last-4 averages (so "3rd" = 3rd-best over the last 4).
- **Window:** last 4 games *played*, byes skipped, as of today (same `windowWeeks` as My Team). < 4 games → all of them.
  On an older week's Home card it's still "last 4 as of today" — same as season stats.

## What changed
- `lib/espnBoxscore.ts` — `GameTeamBox` + `parseGameBox` read `firstDowns`, `completionAttempts` (ESPN sends
  **"24/31"** — `pair()` now accepts `-` or `/`), `rushingAttempts`, `totalOffensivePlays`. `TeamGameLine` carries
  those plus `td3Conv/td3Att` (parsed before, dropped when lines were built). Additive; My Team / Leans unaffected.
- `lib/espnStats.ts` — per-game cache key `final-boxscore-v2` → `v3` (old entries lack the new fields).
- `lib/last4.ts` (new, pure) — `buildLast4Rows(lines, teams)` → offense/defense rows shaped like the season routes,
  `g` = games in the window, counting stats summed, 3rd-down % attempts-weighted. Defense = opponents' lines.
- `app/api/nfl-2025/last4/route.ts` (new) — ISR 600 + last-good backup, same pattern as offense/defense.
- `components/Last4StatsProvider.tsx` (new) — shared copy, prefetched on `requestIdleCallback`, re-fetched on
  foreground after 10 min. Separate context so `useNflStats` / `useSharedNflStats` are untouched. Mounted in `app/layout.tsx`.
- `utils/teamDataTransform.ts` — `DisplayMode` gains `'last4'`, which takes the per-game (÷ g) path.
- `components/mobile/CompactPanel.tsx` — in L4, swaps `allData` + team A/B rows to the L4 rows; everything downstream
  (ranking, bar math, Power Surge, rank dropdown) unchanged. `CompactPanelHeader.tsx` — `PG | L4 | TOT`.
  `CompactComparisonRow.tsx` — prop type widened only.

## Verification
- `npm run check` clean; `npm run test:run` 52 files / 417 tests pass. New: `lib/__tests__/last4.test.ts`
  (bye skipped, < 4 games, opponent-based defense, weighted 3rd down, omitted teams), parser + game-line fields on the
  PIT@CLE fixture, `last4` transform.
- Real data (dev, 2026-10-23): `/api/nfl-2025/last4` → 32 offense + 32 defense rows, all `g = 4`. Cross-checked against
  ESPN team schedules: CHI 91 for / 90 against, NE 124 / 92 (weeks 4–7) — exact match.
- Gotcha seen: the **first** dev request after a restart returned weeks 2–5 (stale week scoreboards in `.next/cache`,
  refreshed in the background); the second request was correct. Normal stale-while-revalidate — prod's 10-min fetch
  cache bounds it ("reload twice").
- UI not driven by me (Kobe checks): Home accordion, Compare phone + tablet quadrant, Leans game screen.

## Open risks
- First prod refresh after deploy re-downloads every final box score once (~110 summaries at W8, 8 at a time, shared
  with the defense route). Watch `pm2 logs pare` for 429s.
- 4 games is a small sample — L4 ranks move a lot week to week (intended).
- If a box score lacks a new field it counts as 0 (best-effort, like the existing extras) — would drag that team's L4
  average down for that stat. Not seen on real data.
- 3-option header at 393px: same 10px labels; Kobe to confirm it doesn't crowd the quadrant variant.
