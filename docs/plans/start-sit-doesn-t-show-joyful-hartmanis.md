# Fantasy tab fixes — Start/Sit current week, filled week cells, no sign-in flash

## Context

Kobe reported three things on the Fantasy tab (/myteam):

1. **Start/Sit grid starts at next week.** You're deciding *this* week's lineup, so the 5-week grid should start with the current week.
   **Root cause:** `StartSitPanel` draws `row.strip`, and that is `lookaheadWeeks(week)` = week+1 … week+5 ([viewModel.ts:56-60](lib/myteam/viewModel.ts#L56-L60)). The "good wks" counts and the "Next 5 weeks" line count that same strip ([startSit.ts:65-72](lib/myteam/startSit.ts#L65-L72)).
2. **Week cells are black.** The team boxes ("@SEA #11") have a dark `--nav-bg` fill with only a tier-colored top edge ([MatchupMeter.tsx:97-127](components/myteam/MatchupMeter.tsx#L97-L127)). Kobe wants the whole box filled. **Decided:** a solid tier color with dark text, applied **everywhere** `WeekCell` is used (Start/Sit, the expanded row's next weeks, pinned cards).
3. **Tab flashes the sign-in page, and the login sometimes looks lost.**
   **Root cause:** On every visit the provider restores the saved username and calls `lookup()`, which sets `phase = 'lookup'`. `MyTeamApp` maps `'lookup'` to the **`'entry'` onboarding state**, which is the username form ([MyTeamApp.tsx:55](components/myteam/MyTeamApp.tsx#L55)). So while Sleeper answers (it can take a while), you see the sign-in form with a spinner, and then the roster appears. When Sleeper is slow, that looks exactly like "I have to log in again."
   The flash happens on *every* visit because `MyTeamProvider` is route-scoped ([app/myteam/layout.tsx](app/myteam/layout.tsx)): leaving the tab unmounts it, and coming back re-runs user lookup + league fetch from scratch.
   Saving itself works: `pare:myteam` is written after the hydration guard, and nothing clears it except "Use another username". Data can be truly lost outside the code: Safari on the web (not the iOS app) wipes site storage after 7 days without a visit (ITP), and Safari and the iOS app keep **separate** storage. Only accounts can fix that, so it's out of scope; note it in the dev note.

## Changes

### 1. Start/Sit shows this week + next 4 — `lib/myteam/startSit.ts`, `components/myteam/StartSitPanel.tsx`
- Add pure `startSitWeeks(row): MatchupCell[]` = `[row.thisWeek, ...row.strip].slice(0, 5)` in `startSit.ts`.
- In `compareStartSit`, count `goodWeeks` over `startSitWeeks(a/b)` instead of `strip`. The `thisWeek` verdict and `easier` logic stay the same.
- `StartSitPanel`: the header labels, lanes and "good wks" all use `startSitWeeks(row)`. Show the current week's label (`W8`) in `var(--gold-bright)` so the "now" column stands out. The summary line goes from "Next 5 weeks: …" to "W8–W12: …" (built from the first and last week shown).
- The expanded row's own next-weeks strip and `NextFiveBar` stay next-5 ("just for that").
- Update [startSit.test.ts](lib/myteam/__tests__/startSit.test.ts) so the `next` counts include `thisWeek`. Add a test for `startSitWeeks`, including week 17/18 where the window gets shorter.

### 2. Solid-filled week cells — `components/myteam/MatchupMeter.tsx` (`WeekCell`)
- Rated game: `background: tierColor(tier)`, `border: 1px solid` the same color (the 3px top edge goes away, since the whole box is the color), opponent and rank text `var(--bg)` (near-black #0a0e1a). Dark on these bright tier colors (#81FDA0, #B4D35C, #B0AAA3, #E07E2F, #E15957) gives good contrast. Bump the rank to weight 800.
- Bye stays dashed and dark. An unrated/unknown week stays `--nav-bg` with a hairline border. Both are "no color" on purpose.
- `weekInside` (pinned cards): the second line shows `W{n}` in dark text at 0.7 opacity.
- Tokens only (no hex in the component). Keep `data-tier`/`data-bye`. Update the file header comment ("Dark cell, tier-colored edge" → "solid tier fill, dark text"). Update design-system §9.4's WeekCell description to match.

### 3. No sign-in flash on return — `components/myteam/MyTeamProvider.tsx`, `components/myteam/MyTeamApp.tsx`
- **Restoring ≠ signing in:** `lookup(username, savedLeagueId, mode)` with `mode: 'submit' | 'restore'`. Restore (mount hydrate + `retry`) sets `phase = 'loading'` (the shimmer skeleton), never `'lookup'`. Only a typed username uses `'lookup'` (the form with busy Continue). Keep the existing `'lookup' → 'entry'` mapping in MyTeamApp, because it's correct for submits.
- **Instant return within the session:** a module-level `lastSession` in MyTeamProvider (`{ username, leagueId, leagues, season, bundle, loadedAt }`). JS modules survive client-side tab navigation, so other tabs still pay nothing (no fetches, no root-layout change, no architecture change). On mount, if the saved username + league match `lastSession`, render `ready` right away with the cached bundle. If it's older than `REFRESH_ON_RETURN_AFTER_MS` (10 min, the existing rule), do a silent `loadBundle(..., 'refresh')`. Write `lastSession` on every successful bundle load. Clear it in `unlink`.
- A full reload / cold app start still does the restore lookup, but now shows the loading skeleton instead of the sign-in form.

### Docs (with the commit)
- `CHANGELOG.md` `[Unreleased]`: `### Fixed` Start/Sit starts at the current week; no sign-in flash when opening Fantasy. `### Changed` week cells are solid tier-colored.
- Dev note `docs/devnotes/2026-10-23-fantasy-startsit-cells-flash.md`: root causes above, key files, verification, and open risk (Safari 7-day storage wipe + separate app/Safari storage → only accounts fix it).
- design-system §9.4 WeekCell + Start/Sit text.

## Verification
- `npm run check`, `npm run test:run` (startSit tests updated + new).
- Kobe checks the UI (no browser driving by me): open Fantasy → no username form flashes, roster shows straight away when coming back from another tab. Reload → skeleton, then roster. Start/Sit → first column = current week (gold label), "W8–W12" line. Week cells solid colored with dark text on expanded rows, Start/Sit and pinned (iPad).
- Optional: `npx playwright test e2e/myteam.spec.ts` (the Start/Sit test doesn't assert week numbers; should still pass).
