# 2026-09-14 — Schedule-first home + Sleeper-style UI pass

> Rules & architecture: see [`CLAUDE.md`](../../CLAUDE.md). This note = rationale only, no rule duplication.

## Context
Flip the app's entry point from the manual two-dropdown compare page to a
schedule-first home: a mobile-first list of the current NFL week's matchups as
compact tappable cards. Tapping a matchup deep-links into `/compare` with both
teams preloaded via URL query params. Full Sleeper-style visual overhaul of the
presentation layer. DATA/LOGIC layers (CSV parser, API routes, ranking /
display-mode / bar hooks) stay intact per guardrails.

## Decisions
- **Data seam:** `lib/schedule.ts` exposes `getCurrentWeekMatchups()` returning a
  typed `Matchup[]`, backed by a hardcoded mock for now. A real source (ESPN /
  PFR schedule) can drop in behind the function without touching the UI.
- **Team identity:** `lib/teams.ts` is the single registry mapping team
  abbreviation ↔ full name (the full name is the app's selection key + logo key).
  Reused by schedule mock, matchup cards, and compare-page query-param preload.
- **Query params:** `/compare?away=XXX&home=YYY` (abbreviations). Preloaded into
  the existing global `selectedTeamA` (away) / `selectedTeamB` (home) state — no
  new state store. `useSearchParams` wrapped in `Suspense` (Next 15 requirement).
- **Libraries:** reused already-installed `framer-motion` + `lucide-react`; added
  `Inter` via `next/font/google` (was referenced in tailwind config but never
  loaded). No new dependencies installed.
- **No emoji in UI:** replaced bottom-bar + avg-team emoji and gold ordinal text
  with lucide icons and a custom `RankBadge` component.

## Implementation notes
(see CHANGELOG [Unreleased] for the file-by-file list)

## Testing
- Dev server on :4000, manual browser check of home → matchup tap → compare
  preloaded, back nav, loading/empty/error states.

## Follow-ups
- Replace schedule mock with a live source behind `getCurrentWeekMatchups()`.
- Desktop compare layout still uses the older gradient shell; a later pass can
  bring it fully in line with the new token system.
