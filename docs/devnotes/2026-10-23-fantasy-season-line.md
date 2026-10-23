# 2026-10-23 — Fantasy "Your season" line (Wave A3)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md)

## Why

My Team had no sense of the season: no record, no "am I good or lucky?". Sleeper's rosters response (already
fetched to find my roster) carries wins/losses/points/max points; only the matchups for past weeks were missing.

## What changed

- `lib/myteam/leagueSeason.ts` (new, pure): `sleeperPoints` (whole + hundredths), `allPlayRecord` (each played
  week, my score vs every other team's; expected wins = share beaten, ties half), `buildLeagueSeason` (record,
  points-for rank, bench left = `ppts − fpts`, luck = wins − expected wins).
- Provider: `getLeagueSeason(leagueId, userId, weeks)` on `FantasyProvider`; Sleeper impl fetches
  `/matchups/{w}` per completed regular-season week (cached 1h, `pastMatchups`). `SleeperRoster.settings` typed.
- Bundle: `leagueSeason` computed in parallel with the FPA/usage tables; `.catch(() => null)` so a Sleeper hiccup
  never blocks the roster. Weeks ≥ `playoffWeekStart` excluded.
- `components/myteam/SeasonSummary.tsx`: one line under the week bar (WeekBar's type scale), visible text
  `aria-hidden`, full sentence in an `sr-only` span. Hidden until a week is scored.

## Verification

- `lib/myteam/__tests__/leagueSeason.test.ts` (6) on the captured Sleeper fixtures: top W4 score (201.7) → 9-0
  all-play, bottom (103.72) → 0-9, unplayed weeks skipped, ties = half, 380 + 54/100 = 380.54, bench left 69.0.
- e2e: new "your season line" test (phone + iPad), whole spec 40 passed; mockup screenshot reviewed (wraps to two
  lines at 393, no overflow).
- `npm run check`, `npm run test:run`.
- **Not verified against a live league** (no real league id in this session). Kobe: open Fantasy with your league
  and sanity-check the record against Sleeper's standings.

## Risks / open

- One extra Sleeper call per completed week per league on a cold cache (≤ 17, then 1h cached). Well under
  Sleeper's 1,000/min.
- Sleeper's `ppts` (max points) can lag a day after games; bench-left updates with it.
