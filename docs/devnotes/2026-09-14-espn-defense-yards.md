# Dev Note — 2026-09-14 — DEFENSE yards-allowed via opponent-aggregation (2026)

> Rules & architecture live in `CLAUDE.md`; this note is implementation rationale only.
> State authority: `CHANGELOG.md` `[Unreleased]`.

## Context
Step 4 of the ESPN migration. Fills the defense `total_yards` / `pass_yds` /
`rush_yds` that Step 3 left as "—". No ESPN endpoint exposes "yards allowed"
directly (`DATA_SOURCES.md §A`), so we compute it: **a team's yards allowed =
the sum of its opponents' offensive yards across its completed games.**

Scope guardrails:
- Defense yards-allowed ONLY. Offense, schedule, and Step-3 points-allowed
  untouched.
- No new deps. TypeScript, no `any`. `TeamStats` shape + hook signatures unchanged.
- Cheap verification only — no browser/screenshots.

## Data source
- Completed games: `GET .../scoreboard?seasontype=2&week=N` for weeks
  `1..currentWeek` (current week from `getCurrentWeekInfo()`), collecting event
  IDs whose `competitions[0].status.type.name === 'STATUS_FINAL'`.
- Per-game box score: `GET .../summary?event={id}` → `boxscore.teams[]`, each with
  `team.id` + `statistics[]`. We read `totalYards`, `netPassingYards`,
  `rushingYards` (by stat `name`).

## Algorithm (`lib/espnStats.ts` → `fetchDefenseYardsAllowed()`)
- For each completed game with teams X, Y:
  - `allowed[X] += Y.offense`, `allowed[Y] += X.offense` (+ games counter)
  - `gained[X] += X.offense`, `gained[Y] += Y.offense` (consistency bookkeeping)
- Sum across all games → season totals per team; map ESPN `team.id → team name`
  via `NFL_TEAMS.espnId`. Returns `Map<teamName, {total_yards, pass_yds, rush_yds, games}>`.
- **Concurrency cap**: scoreboards fetched 4-at-a-time, summaries 8-at-a-time
  (`inBatches`). Each request has an 8s abort timeout.
- **Resilience**: a scoreboard/summary that fails or is missing a required field
  is logged and skipped; partial data is fine. Throws only if it can compute
  nothing.

## Wiring (`app/api/nfl-2025/defense/route.ts`)
- On the live standings success path, best-effort call `fetchDefenseYardsAllowed()`
  and merge the yards onto each row (only for teams with `games > 0`).
- If aggregation throws, log and keep Step-3 rows (yards stay "—"). Never crash.
- Whole result cached in the existing 6h cache — not recomputed per request.

## Net vs gross note
The box-score `netPassingYards` (sacks subtracted) is used for `pass_yds`
allowed, whereas the offense endpoint (Step 2) reports **gross** `passingYards`.
Likewise summary `totalYards` is net-based. This is internally consistent within
the defense panel (all teams same basis) and within the offense panel, but the
two panels use slightly different passing/total definitions. Acceptable for now;
noted for a future reconciliation.

## Files changed
- `lib/espnStats.ts` — added `fetchDefenseYardsAllowed()` + scoreboard/summary
  types, `fetchJsonWithTimeout`, `inBatches`; imported `getCurrentWeekInfo`.
- `app/api/nfl-2025/defense/route.ts` — merge yards onto standings rows
  (best-effort); removed two pre-existing unused vars so the file lints clean.
- `CHANGELOG.md` — `[Unreleased]` entry.

## Testing (dev, port 4000 — cheap checks only)
1. `GET /api/nfl-2025/defense` → **32 rows**, `season` 2026, `X-Source:
   ESPN-STANDINGS`. `total_yards`/`pass_yds`/`rush_yds` populated for **30/32**.
   The two "—" teams are **Denver** & **Kansas City** — their Week-1 game is MNF
   (not `STATUS_FINAL` yet), so 0 completed games. Real, matches Step-3 (`g=0`).
2. **Internal consistency** (independent re-sum of the same box scores):
   - total: gained `10094` === allowed `10094` — **MATCH**
   - pass:  gained `6524`  === allowed `6524`  — **MATCH**
   - rush:  gained `3570`  === allowed `3570`  — **MATCH**
3. Eyeball: **Bills** allowed `total 381 / pass 257 / rush 124` — exactly their
   only opponent (Houston) offense that week. ✓
4. `npx eslint lib/espnStats.ts app/api/nfl-2025/defense/route.ts` → clean.

## Follow-ups
- **Net vs gross** passing/total reconciliation across panels (see note above).
- **Sc% (`score_pct`)** still "—" (no clean ESPN source).
- **Route rename**: `nfl-2025` → season-agnostic path (cosmetic, later).
