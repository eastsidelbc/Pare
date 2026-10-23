# 2026-10-23 — Leans data fixes: star props + missed games (prop engine v2, phase A0)

Branch `feat/prop-engine-v2`. Plan: `docs/plans/pasted-content-id-fcbb-the-prop-deep-crescent.md` (Phase A0).
Found while planning the v2 prop engine; Kobe approved fixing both before any new formula work.

## Why
1. **Most star players never got prop lines.** The book names players by ESPN athlete id; Sleeper's
   player map has an `espn_id` for only 210 of 829 rostered QB/RB/WR/TE (Chase, Nacua, Bijan, St. Brown:
   none). `espnToSleeper` silently dropped everyone else — live and in the backtest.
2. **Missed games counted as 0-stat games.** Sleeper's weekly endpoint sends a row for every rostered
   player every week; an inactive player's row has no `gp` and empty stats (2025: 5,042 of 12,074 rows).
   `toPlayerGame` kept them, so "X of last 4" / season hit rates counted a missed week as 0 yards (biased
   toward the under), and the backtest graded a prop on such a row as 0 instead of voiding it.

## What changed
- `lib/leans/athleteMatch.ts` (new, pure): `buildAthleteIndex` + `matchAthlete` — ESPN id first, else
  normalized name + team (`rookieKey`, the Home box-score join's key), position breaks a shared name, two
  candidates → no match. Tests: `lib/leans/__tests__/athleteMatch.test.ts`.
- `lib/leans/propLinesServer.ts` — names from the game's two ESPN team rosters (site `/teams/{id}/roster`,
  `unstable_cache` 24h over a no-store 6s fetch, empty roster throws). A failed roster falls back to the
  id join. `getGamePropLines(eventId, teams)`.
- `lib/leans/players.ts` — `playedGame(line)` (`gp` > 0, or the rare gp-less row with real usage);
  `selectPlayers` keeps only played weeks and drops never-played players.
- Backtest (`scripts/leans-backtest.ts`, `lib/leans/backtest.ts`):
  - player join = id, else name + team-at-week via Core `seasons/{y}/athletes/{id}` (cached on disk);
  - `playerSeasons` skips unplayed weeks → an inactive player's prop is voided;
  - `lineupCapSet` = who the live app would have listed that week (top `playersPerTeam` by PPR before the
    week, team-at-week); the report shows the capped set (what the app shows) and every matched line;
  - `BacktestGame.openHomeLine` / `openTotal` (the book's openers, for v2 features — prop lines are
    graded on their openers too).
- `lib/leans/record.ts` — re-measured record (capped set) + `roi` per season; the PROP LEANS note now
  reads "return at the book's prices: 2025 317–273 (−2.7%) · 2024 439–355 (−5.6%)".
- `DATA_SOURCES.md` §7 — the name join and the played-week rule.

## Before → after (unchanged engine, `npm run backtest:leans`)
| | Before | After (capped set) |
|---|---|---|
| 2025 matched props | 2,204 | 5,978 (by id 2,204 · by name 3,774 · unmatched 47); 5,114 in the live cap |
| 2025 prop leans | 112–113, −10.0% | 317–273 (53.7%), −2.7% |
| 2024 matched props | 3,496 | 7,495 (by id 3,496 · by name 3,999 · unmatched 16); 7,293 in the cap |
| 2024 prop leans | 225–175, −2.7% | 439–355 (55.3%), −5.6% |

Reports: `docs/devnotes/2026-10-23-leans-backtest/report-2025.md` / `report-2024.md` (overwritten with
the corrected run). Only slice positive in both years on the capped set: **rec under** (2025 +12.2%,
2024 +1.6%). The win rate looks better than the money result because prop unders are often priced
−130 or worse — that's why the note now shows the return.

Live check (dev :4000, week 7): `/api/leans/props?week=7` → 14 games, 411 lines, 192 players (60 would
match by id alone); Chase, Bijan, St. Brown present.

## Verified
- `npm run check` clean; `npm run test:run` 545 pass (new: athleteMatch, players/lineupCapSet tests).
- `node scripts/leans-gates.mjs l3` 5/5; `l6` 16/17 (only the build step: dev holds :4000).

## Risks
- Name join can mis-assign two same-named players on one team at one position — it refuses (null) instead.
- Rosters are a day old at worst: a same-day signing's props join only if Sleeper has his ESPN id.
- Position in the backtest is position-at-week from Sleeper rows (was today's map).
