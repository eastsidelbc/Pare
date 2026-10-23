# 2026-10-23 — Fantasy: League moves (Wave C3)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md) (Wave C "league history", smallest useful slice)

## Why

"What did my league just do?" is the most-checked fantasy question after your own lineup. Sleeper's transactions and users
endpoints answer it; rosters were already fetched.

## What changed

- `lib/myteam/leagueMoves.ts` (pure): `buildLeagueMoves` — completed trade / waiver / free-agent only, one side per team
  (adds + drops), team name from `metadata.team_name` else `display_name`, my roster flagged, newest first, 6 shown;
  `agoText`.
- Provider `getLeagueMoves(leagueId, userId, weeks)` (Sleeper adapter: transactions 5 min per league+week, users 1h).
  Bundle asks for this week + last, best-effort.
- `components/myteam/LeagueMoves.tsx` under `WaiverWatch`; "ago" measured from `bundle.generatedAt` (pure render).
- **Privacy first:** /privacy "Fantasy tab" paragraph now lists the league's public matchup scores, members' team names and
  recent adds/drops/trades (also covers "Your season"). CLAUDE.md privacy row updated. Nothing new stored on the device.

## Verification

- `lib/myteam/__tests__/leagueMoves.test.ts` (4): failed + commissioner moves skipped, trade sides, team-name preference,
  newest first, ago text. e2e `myteam.spec.ts` 44 passed incl. "league moves" (phone + iPad).
- **Not checked on a real league** (no league id in this session) — shapes follow Sleeper's documented transaction object
  (docs/data-catalog.md "League extras"). Kobe: open Fantasy after a waiver run and compare with the Sleeper app.

## Risks / open

- 2 more Sleeper calls per cold league load (transactions × 2 weeks) + 1 users call per hour.
