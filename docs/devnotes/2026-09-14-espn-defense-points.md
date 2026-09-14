# Dev Note — 2026-09-14 — Live DEFENSE points-allowed from ESPN standings (2026)

> Rules & architecture live in `CLAUDE.md`; this note is implementation rationale only.
> State authority: `CHANGELOG.md` `[Unreleased]`.

## Context
Step 3 of the ESPN migration. Make the defense panel show **live 2026 points
allowed**, sourced from ESPN standings. Points-allowed ONLY — yards-allowed is
Step 4 (the team-stats + standings endpoints don't expose opponent yards; see
`DATA_SOURCES.md §A`).

Scope guardrails:
- **Defense points-allowed only.** No offense/schedule/compare-flow changes.
- To avoid mixing 2026 points with stale 2025 yards, the defense route **stops
  reading the 2025 CSV entirely**. Non-live defense "allowed" metrics render as
  `—` (null), not stale numbers.
- No new deps. TypeScript, no `any`. Don't change hook signatures, the
  `TeamStats` shape, or the ranking math.

## Decisions
- **Source**: `GET https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season={SEASON}`.
  Traverse `children[] → standings.entries[]`; per entry read `pointsAgainst`
  and `wins/losses/ties`.
- **Mapping** (`lib/espnStats.ts` → `fetchDefenseStatsFromESPN()`):
  - `points ← pointsAgainst`
  - `g ← wins + losses + ties` (no `gamesPlayed` stat in standings)
  - everything else (`total_yards`, `pass_yds`, `rush_yds`, …) omitted → `—`.
  - Team key resolved by abbreviation via `lib/teams.ts` with a `WSH→WAS` alias
    (only mismatch vs our registry).
- **Ranking**: unchanged. Defense panels already invert `higherIsBetter`, so
  fewest points allowed = best. Nothing touched here.
- **Graceful `—`**: `useRanking`/`calculateBulkRanking` coerce a missing value to
  `0` (not NaN), so an unpopulated metric would otherwise show `0` and a bogus
  `T-1st`. Fixed at the presentation layer only:
  - `components/mobile/CompactComparisonRow.tsx` — detect presence; show `—`,
    hide bars (neutral track), suppress the rank badge when a side is missing.
  - `components/DynamicComparisonRow.tsx` — same for the desktop row (value `—`,
    zero-width bars + hidden separator).
  - `components/RankingDropdown.tsx` — desktop trigger shows `—` instead of a
    value-0 rank when the current team's metric is unpopulated.
  This also incidentally cleans up offense `score_pct` (now `—` until the Sc% step).

## Wiring / Resilience
`app/api/nfl-2025/defense/route.ts`:
1. Cache HIT → serve cache.
2. Fresh → `fetchDefenseStatsFromESPN()` (`X-Source: ESPN-STANDINGS`).
3. Standings fail / `<32` teams → serve **stale cache** if present
   (`X-Source: ESPN-STANDINGS-STALE`).
4. No cache → return 32 team rows with **no stats** so the UI shows `—`
   (`X-Source: EMPTY-FALLBACK`, response flagged `stale`). **Never** the 2025 CSV.
Only a full live standings result is cached. Each path logs its source.

`offense/route.ts` and `lib/schedule.ts`: untouched.

## Files changed
- `lib/espnStats.ts` — added `fetchDefenseStatsFromESPN()` + standings types +
  `WSH→WAS` alias; imported `getTeamByAbbr`.
- `app/api/nfl-2025/defense/route.ts` — ESPN standings primary + stale/empty
  fallback + `SEASON`; dropped the CSV reader import.
- `components/mobile/CompactComparisonRow.tsx` — `—` render, bar/rank gating.
- `components/DynamicComparisonRow.tsx` — `—` render, bar gating.
- `components/RankingDropdown.tsx` — `—` for unpopulated-metric rank trigger.
- `CHANGELOG.md` — `[Unreleased]` entry.

## Testing (dev, port 4000)
1. `GET /api/nfl-2025/defense` → `rows.length` = **32**, `season` = **2026**,
   `X-Source: ESPN-STANDINGS`.
2. Spot-check points (= ESPN `pointsAgainst`): **BAL 23, BUF 31, PHI 22, DET 30**,
   `g=1`; **KC** `points=0, g=0` (hasn't played yet — real).
3. **Compare defense panel** (browser, BUF vs BAL): Points shows real numbers with
   ranks — BUF 31 (T-24th) vs BAL 23 (T-15th), i.e. fewer allowed ranks better.
   Total/Passing/Rushing Yards rows show **`—`** with **no bars**. Offense panel
   still renders real numbers + bars.
4. Offense API unchanged (32 rows, live ESPN); schedule untouched.
5. **Simulated standings failure** (broke the URL): `X-Source: EMPTY-FALLBACK`,
   32 empty rows, `stale:true`, **no crash**. Reverted → back to `ESPN-STANDINGS`.

Small numbers are expected — early 2026 season (~1 game).

## Follow-ups
- **Yards-allowed (Step 4)**: total/pass/rush allowed not in team-stats or
  standings. Needs opponent-aggregation or another source (`DATA_SOURCES.md §A`).
- **Sc% (`score_pct`)**: still no clean ESPN source — currently `—`.
- **Route rename**: `nfl-2025` → season-agnostic path (cosmetic, later).
