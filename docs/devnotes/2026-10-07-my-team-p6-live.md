# 2026-10-07 — My Team P6: live fantasy points

Plan: `docs/plans/my-team-fantasy.md` (P6). Look: `docs/design-system.md` §9.4 "Game day" (layout reserved in P5).

## How it works

- **One ESPN poll, still.** Game state (live / final / clock) comes from `useSchedule()` — the ScheduleProvider's
  existing `useLiveScores` — filtered to this week's games involving my roster's NFL teams (`myWeekGames`).
  `git grep "useLiveScores("` = the ScheduleProvider call + the hook's own definition.
- **Gate** (`shouldPollMyTeam`, pure + tested): poll only while a game of MINE is in its live window
  (`lib/liveWindow` rule: live, or 10 min before → 3 h after a listed kickoff), the tab is visible, the route is
  mounted (the hook lives in `MyTeamApp`; leaving `/myteam` unmounts it and clears the interval) and not all my
  games are final. Filtering to my teams means a bye-heavy or early-window Sunday doesn't poll for nothing.
- **No timer at rest.** Instead of ticking every minute all week, the hook schedules one timeout for the next
  kickoff boundary (`nextGateChangeMs`) and re-checks the gate then.
- **Outside the gate**: one fetch when the week has started but nothing is on screen (e.g. Monday morning), and
  one more when the last game goes final (final numbers). Not a poll.
- **Interval** `LIVE_POLL_MS = 60s` = Sleeper's `s-maxage=60`; the adapter's keyed cache also holds matchups 60s,
  so the server makes ≤1 Sleeper call per league per minute however many tabs are open. P0b confirms the cadence.
- **Last-good**: `liveReducer` keeps the previous points on an error and marks them stale ("Couldn't update —
  showing points from 4:41 PM"); a new league/week resets so deltas never compare two rosters.
- **Total** = `startersTotal(byPlayer, my starters)`, cents-exact. On every roster in the anonymized P0a week-4
  matchups it equals Sleeper's roster `points` (unit test), so the header matches the league app.

## UI (assist, don't compete)

Points column (46px, 15/800 tabular) beside the meter — never instead of it; "—" before kickoff / on bye; live dot +
ESPN clock or "Final" on line 2; a SMALL "123.45 PTS" in the STARTERS header with `aria-live="polite"`; gold
"+N.N" flash (`.pare-flash`, 2.6s once, `display: none` under reduced motion); a one-line freshness note under the
week bar showing the update TIME (no "n s ago" timer). No total card, no opponent score. Static preview: the
"Game day" frame on `/sandbox/myteam`.
