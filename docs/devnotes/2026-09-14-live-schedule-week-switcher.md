# 2026-09-14 — Live ESPN schedule + week switcher

> Rules & architecture: see [`CLAUDE.md`](../../CLAUDE.md). Source notes:
> [`DATA_SOURCES.md`](../../DATA_SOURCES.md). This note = rationale only.

## Context
Two isolated steps on the schedule-first home, data/UI only — stats & compare untouched.

## Step 1 — live schedule from ESPN
- Replaced the mock in `lib/schedule.ts` `getCurrentWeekMatchups()` with a live
  fetch of ESPN's public scoreboard (no key), mapped into the existing `Matchup`
  shape. `Matchup` type + all downstream consumers unchanged.
- Server-side fetch, `next: { revalidate: 3600 }`. ESPN abbr aliases (`WSH→WAS`);
  unresolved abbrs are logged + skipped.
- Kept the old hardcoded week as a named fallback (`FALLBACK_WEEK`) so the home
  never blanks if ESPN fails.
- `app/page.tsx` converted from client component to async **server** component.

## Step 2 — week switcher (`‹ Week N ›`)
- `lib/schedule.ts` generalized: `getMatchupsForWeek(week)` (`?seasontype=2&week=N`),
  `getCurrentWeekInfo()` (current week+season, not hardcoded), `MIN_WEEK`/`MAX_WEEK`,
  shared `fetchScoreboard()`. Reuses the same `mapEspnScoreboard`.
- New route `app/api/schedule/route.ts` — `GET ?week=N` (validates 1–18), returns
  `{ week, matchups }` via `getMatchupsForWeek` (no duplicate mapping). Inherits
  cache + fallback.
- New client component `components/schedule/ScheduleBoard.tsx` — holds selected
  week, renders section header + stepper top-right, fetches `/api/schedule?week=N`
  on arrow clicks (stale-response guard), shows skeleton while loading, disables
  ‹ at week 1 / › at week 18. Empty week → "No games" state.
- Initial render is server-side (current week) for a flash-free first paint.

## Decisions
- Specific-week fetch failure → `[]` (empty state), not the wrong-week mock; only
  the current-week home render uses the mock fallback.
- Season label bumped 2025 → 2026 (matches ESPN `season.year`).

## Testing
- ESPN reachable from this Windows box (agent sandbox is network-locked per
  DATA_SOURCES). Live: 16 Week-1 games, correct order + local times, `WSH`→Commanders.
- API: wk1=16, wk6=14 (incl. SEA@DEN 2026-10-16), wk18=16; `week=25`/`week=abc`→400.
- Fallback verified by breaking the URL (page fell back, no blank), then reverted.
- Phone width 390px: stepper compact, 44px arrows; skeleton on week change.

## Follow-ups
- Stats still from local PFR CSV — ESPN stats wiring is a later step (see
  DATA_SOURCES gaps A/B: yards-allowed + Sc% substitute).
- Future weeks with missing kickoff dates are skipped (rare); revisit if ESPN
  starts returning TBD placeholders we want to show.
