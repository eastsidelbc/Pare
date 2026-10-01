# Pare — Schedule: betting odds on matchup cards

Read VISION.md/DATA_SOURCES.md only if needed. Small additive change to the schedule —
don't touch the compare workspace, data-stats, or ranking math. Dark mode, mobile-first.

## Goal
Show the betting line on each home-screen matchup card, centered (e.g. "KC -2.5  •  O/U 43.5").

## Data (already in the ESPN scoreboard we fetch — no new endpoint)
- Per game: `competitions[0].odds[0]`:
  - `details` → spread string (e.g. "KC -2.5")
  - `overUnder` → total (e.g. 43.5)
  - (provider name under odds[0].provider — optional to show)
- Add these to the mapped Matchup type in lib/schedule.ts (optional fields).

## UI
- On the matchup card, render a compact centered line: `<spread>  •  O/U <total>`
  (your example format "NE -3.5 o/u 47.5"). Style to match the design tokens — small,
  muted, secondary to the team names. Center it between/under the two teams.
- Render ONLY when odds are present. If a game has no odds (early/far-future/none),
  show nothing there — no "undefined", no empty pill.

## Verify (cheap only — no browser)
1. `npm run lint` / tsc clean.
2. `curl` the schedule/scoreboard path and confirm spread + overUnder are parsed onto
   matchups that have them, and matchups without odds simply omit the line.
List files changed and results.