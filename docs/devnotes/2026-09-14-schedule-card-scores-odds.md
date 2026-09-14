# Dev Note — 2026-09-14 — Schedule card: scores/odds in center, tighter layout

> Rules live in `CLAUDE.md`; rationale only here. Additive/layout on the schedule
> only — no compare/data-stats/ranking changes. Source: ESPN scoreboard we already
> fetch (see `DATA_SOURCES.md`).

## Context
Surface live context on each Home schedule card: betting line for upcoming games,
final scores for completed ones. Per Kobe's follow-up, KEEP the expand chevron
(don't remove it) and tighten the card so everything fits and still looks good.

## Changes
- **Data model** (`lib/schedule.ts`): `Matchup` gains `state` (`pre|in|post`),
  `completed`, `statusDetail`, `awayScore`, `homeScore`, `winner`, `odds`
  (`{ spread, overUnder }`). Parsed in `mapEspnScoreboard` from `status.type`
  (`state`/`completed`/`shortDetail`), `competitors[].score` + `winner`, and
  `competition.odds[0]` (`details` + `overUnder`). Scores only populated once
  live/final; odds only for pre-game with a line. Fallback week = all upcoming,
  no scores/odds.
- **Card** (`components/schedule/MatchupCard.tsx`): abbreviations on the outer
  edges, each score just inboard, status-driven center:
  - `pre`  → day + time + `<spread> · O/U <total>` (line omitted if no odds).
  - `post` → both final scores flank the center (winner gold, loser dimmed) + "Final".
  - `in`   → live scores + short status (e.g. "Q3 5:20") in `--red`.
  - Kept the far-right rotating chevron; tightened logos (38→32), gaps (3→2),
    padding (12/14 → 10/12), and font sizes so scores + odds fit.
- **Serialization** (`components/schedule/ScheduleBoard.tsx`): `SerializedMatchup`
  extended with the new fields so the `/api/schedule` (week stepper) revive keeps
  them (kickoff still string→Date).

## Files
- Changed: `lib/schedule.ts`, `components/schedule/MatchupCard.tsx`,
  `components/schedule/ScheduleBoard.tsx`.

## Testing (cheap; no browser)
- `tsc --noEmit` + `eslint` clean on changed files.
- Compiled `lib/schedule.ts` and ran `getCurrentWeekMatchups()` against live ESPN:
  - Completed → final scores + winner (e.g. NE@SEA 10–13 home, SF@LAR 27–7 away).
  - Upcoming → `KC -2.5 · O/U 42.5` parsed; no scores.
  - No-odds path omits the line (`{line && …}` guard; `overUnder` null → spread only).

## Confirmation
I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.
