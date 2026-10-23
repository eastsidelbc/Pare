# Plan — "L4" (last 4 games) mode in Compare + Home mini-compare

## Context

Kobe wants every Compare panel (Compare tab, Home inline mini-compare, Leans game screen — all the same
`CompactPanel`) to show **last-4-games averages** as well as season numbers, so a fan can see a team
"finding its groove" (new QB, hot streak, slump). Decisions made (2026-10-23):

- **UX:** third option in the existing panel header switch → `PG | L4 | TOT` (per panel, like today).
- **Coverage:** every Compare metric gets an L4 number (extend the box-score parser).
- **Ranks/badges in L4:** ranked among all 32 teams' last-4 averages.
- **L4 window** = each team's last 4 games *played* (byes skipped), as of now — same rule as My Team
  (`windowWeeks` in `lib/myteam/rating.ts`). Fewer than 4 games played → all of them.

Flags (Note-level, proceeding unless Kobe objects):
- Touches the **data layer + display-mode** (normally off-limits) — this task explicitly asks for it.
  Hook signatures stay the same; `DisplayMode` just gains a value.
- 4 games is a small sample — L4 ranks swing more than season ones. That's the point of the feature.
- L4 is "last 4 as of today", even on an older week's Home card (season stats behave the same way).
- Box-score cache key bump (`v2 → v3`) = one cold re-download of this season's finals (~110 games at
  W8, 8 at a time) on the first refresh after deploy; shared with the defense route, so it happens once.

## Approach (reuse > new code)

The trick: the L4 endpoint returns rows in the **same shape as the offense/defense routes**, with
`g` = games in the window and counting stats **summed over those games**. The existing per-game
transform (`÷ g`) then yields L4 averages, and `useRanking` / `useBarCalculation` / Power Surge work
unchanged on the swapped dataset.

### 1. Box-score parser — more fields (`lib/espnBoxscore.ts`)
- `GameTeamBox` + `parseGameBox`: add `firstDowns` (`firstDowns`), `passCmp`/`passAtt`
  (`completionAttempts` "a-b" → `pair`), `rushAtt` (`rushingAttempts`), `plays`
  (`totalOffensivePlays`). Best-effort like the existing extras. **Verify the stat names with one
  real summary** (`curl.exe` an ESPN summary from a W7 final) before relying on them.
- `TeamGameLine` + `toTeamGameLines`: carry `td3Conv`, `td3Att` (already parsed, currently dropped)
  plus the new fields. Additive only — My Team / Leans ignore them.
- `lib/espnStats.ts` `getGameBox`: cache key `final-boxscore-v2` → `v3` (+ one-line comment like v2's).

### 2. Pure L4 aggregation — new `lib/last4.ts`
`buildLast4Rows(lines: TeamGameLine[], teams = NFL_TEAMS) → { offense: TeamStats[]; defense: TeamStats[] }`
- Group lines by team; window = `windowWeeks(weeks, 'last4')` (import from `lib/myteam/rating.ts`,
  don't duplicate). Team key = `team.name` (same as `espnStats.ts:255` rows), abbr → name via `NFL_TEAMS`.
- **Offense row** (sums over the window): `g, points, total_yards, pass_yds, rush_yds, pass_cmp,
  pass_att, pass_td, pass_int, plays_offense, first_down, rush_att, rush_td, fumbles_lost, turnovers`,
  `third_down_pct = Σconv / Σatt × 100` (attempts-weighted, same as the defense route).
- **Defense row** = the **opponent's** lines in that team's window: `g, points (= pointsAllowed),
  total_yards, pass_yds, rush_yds, third_down_pct` — exactly the fields `availableInDefense`.
- Values as strings like the other routes (`TeamStats`). Teams with 0 games → omitted (UI shows "—").

### 3. API route — new `app/api/nfl-2025/last4/route.ts`
- Copy the offense route's shape: `export const revalidate = 600`, last-good backup via
  `createTtlCache(0)` (`lib/apiCache.ts`), generic 500 body. Response `{ season, updatedAt, offense, defense }`.
- Calls `getTeamGameLog()` (no `unstable_cache` around it — nesting rule) → `buildLast4Rows`.
- Add the endpoint to `APP_CONSTANTS.API.ENDPOINTS` (`config/constants.ts`).

### 4. Client data — new `components/Last4StatsProvider.tsx`
- Separate context (keeps `useNflStats` / `useSharedNflStats` untouched); mounted in `app/layout.tsx`
  right inside `<NflStatsProvider>`.
- **Prefetch on idle** after mount (`requestIdleCallback`, `setTimeout` fallback) so tapping L4 is
  instant; same foreground-refresh-after-10-min pattern as `NflStatsProvider`.
- Exposes `useSharedLast4Stats() → { offense: TeamData[]; defense: TeamData[]; loading; error }`
  (rows through `transformApiResponseToTeamData`).

### 5. Display mode + UI
- `utils/teamDataTransform.ts`: `DisplayMode = 'per-game' | 'last4' | 'total'`; `last4` takes the
  per-game path (÷ `g`) — one-line comment why.
- `components/mobile/CompactPanel.tsx`: when `mode === 'last4'`, use the L4 offense/defense rows as
  `allData` and look up team A/B rows in it (same name match as `MobileCompareLayout`); otherwise as
  today. Not loaded / failed → rows show "—" (existing missing-value path).
- `components/mobile/CompactPanelHeader.tsx`: `PG | L4 | TOT`, `aria-label="Switch to last 4 games average"`,
  same styling. Check the 28px header still fits at 393px in the inline + quadrant variants.
- `components/mobile/CompactComparisonRow.tsx`: widen the `displayMode` prop type (its `effectKey`
  already replays the bar animation on mode change).

## Tests (Vitest, TDD — write first)
- `lib/__tests__/last4.test.ts`: window skips a bye; <4 games → all; offense sums + `g`;
  defense = opponent lines; 3rd-down % attempts-weighted; zero-game team omitted.
- `parseGameBox` fixture: new fields parsed; missing ones → 0.
- `teamDataTransform`: `last4` divides by `g`, skips `*_pct`.

## Verification
1. `npm run check` · `npm run test:run`
2. `npm run dev` (check port 4000 first — don't run `build` while dev is up) →
   `curl.exe -s http://localhost:4000/api/nfl-2025/last4` | jq: **32** offense + **32** defense rows,
   `g` ≤ 4, spot-check one team's L4 points against ESPN's game log by hand.
3. Kobe checks UI: Home accordion, Compare (phone + tablet quadrant), Leans game screen — L4 tap is
   instant, ranks/bars/badges change, TOT/PG unchanged.
4. After deploy: `curl.exe -sI https://pare.gg/api/nfl-2025/last4` → `x-nextjs-cache`; `pm2 logs pare`
   for the one-time cold box-score fetch (no 429s).

## Docs (with the feature commit)
- `CHANGELOG.md` `[Unreleased] → Added` bullet + dev note `docs/devnotes/2026-10-23-last4-compare.md`.
- `CLAUDE.md`: freshness table row (L4 = route ISR 10 min, box scores 24h) + Architecture mention;
  `DATA_SOURCES.md`: the new summary stat names + the L4 route.
