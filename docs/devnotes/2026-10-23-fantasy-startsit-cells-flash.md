# 2026-10-23 — Fantasy: Start / Sit current week, filled week cells, no sign-in flash

Branch `feat/last4-compare` (Kobe's working branch at the time; unrelated to L4). Plan:
`docs/plans/start-sit-doesn-t-show-joyful-hartmanis.md`.

## Why

Kobe reported three things on /myteam:

1. **Start / Sit showed next week, not this week.** `StartSitPanel` drew `row.strip`, which is
   `lookaheadWeeks(week)` = week+1 … week+5 (`lib/myteam/viewModel.ts`). You set *this* week's lineup, so the
   comparison has to start at the current week.
2. **Week cells were black boxes** with a tier-colored 3px top edge. Kobe wants the whole box filled.
   Picked: solid tier fill + dark text, everywhere `WeekCell` renders.
3. **The tab flashed the sign-in form, and the login sometimes looked lost.** Root cause: restoring a saved
   username ran `lookup()`, which set `phase = 'lookup'`, and `MyTeamApp` maps `'lookup'` to the `'entry'`
   onboarding state, which is the username form with a busy Continue button. While Sleeper answered, the user
   saw the sign-in form. When Sleeper was slow, it looked exactly like being logged out. It happened on every
   visit because `MyTeamProvider` is route-scoped (`app/myteam/layout.tsx`): leaving the tab unmounts it, and
   coming back re-ran user lookup + league fetch.

## What changed

- `lib/myteam/startSit.ts`: new `startSitWeeks(row)` = `[thisWeek, ...strip].slice(0, 5)`. `compareStartSit`
  counts good weeks over that window. The this-week verdict and the `easier` rule are unchanged.
- `components/myteam/StartSitPanel.tsx`: header, lanes and "good wks" use `startSitWeeks`. The current week's
  label is `--gold-bright` 800. The summary is "W8–W12: …" (was "Next 5 weeks: …"). The expanded row's
  next-5 strip and `NextFiveBar` are untouched.
- `components/myteam/MatchupMeter.tsx` `WeekCell`: a rated game gets `background` + `border` = `tierColor()`,
  and opp + rank in `var(--bg)`. Dark text, because white fails contrast on the bright `--matchup-*` colors.
  Byes stay dashed and dark. Unrated weeks are `--nav-bg` + hairline. Pinned cards' inside "W8" is dark at 0.7
  opacity. This also changes Leans player vs defense (`PlayerVsDefenseView` uses `WeekCells`), which was
  intended ("everywhere").
- `components/myteam/MyTeamProvider.tsx`:
  - `lookup(..., mode)`: `'restore'` (saved username on mount, `retry`) → `phase = 'loading'` (shimmer
    skeleton). `'submit'` (typed) → `'lookup'` (form, busy) as before.
  - Module-level `lastSession` (username, league, leagues, season, bundle, loadedAt) is written whenever a
    bundle is on screen and cleared on unlink. On mount, if it matches the saved username + league, the
    provider renders `ready` immediately and silently refreshes once it's ≥10 min old (the existing
    `REFRESH_ON_RETURN_AFTER_MS`). It survives client-side tab switches, not reloads. Other tabs still fetch
    nothing (no move to the root layout, no architecture change).
- `docs/design-system.md` §9.4: Week cells, Start / Sit rows and the fix-pass color note updated.

## Verified

- `npm run check` (tsc + eslint) clean.
- `npm run test:run`: 52 files / 419 tests pass. `startSit.test.ts` expectations moved to the new window, and
  new `startSitWeeks` tests (normal, W17 → 2 cells, W18 → 1 cell).
- UI not driven by me (repo rule). Kobe to check: Fantasy → other tab → Fantasy = roster with no form flash;
  reload = skeleton → roster; Start / Sit first column = this week (gold); filled cells on rows, Start / Sit,
  pinned (iPad), Leans player page.

## Open risks

- **Real storage loss is outside the code.** `pare:myteam` saving is correct (hydration-guarded, only
  "Use another username" clears it). But Safari on the web (not the iOS app) deletes site storage after
  7 days without a visit (ITP), and Safari and the iOS app keep separate storage, so a username typed in one
  isn't in the other. Only accounts fix this.
- `lastSession` holds one bundle in memory per page session (small JSON). A league whose roster changed in
  Sleeper shows the old roster until the 10-min refresh or a reload, which is the same staleness rule as before.
