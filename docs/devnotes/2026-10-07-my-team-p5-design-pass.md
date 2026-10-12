# 2026-10-07 — My Team P5: design pass (Fantasy tab)

Plan: `docs/plans/my-team-fantasy.md` (P4 picks, P5). Look: `docs/design-system.md` §1, §9 rule 3, **§9.4**.
Restyle, not rebuild — the data layer (`lib/myteam/fpa.ts`, `lib/myteam/sleeper/*`,
`lib/myteam/seasonSchedule.ts`, `app/api/myteam/*`) is untouched; `git diff fce3a86` on those paths is empty.

## What changed and why

- **Route `/myteam`** (lowercase, no dash) with a `middleware.ts` 308 for every casing/dash variant. Middleware
  rather than `next.config` redirects: Next matches `redirects` case-insensitively by default, so a
  `/myteam`-shaped source can't tell `/MyTeam` from `/myteam` (it would loop). The matcher keeps the
  middleware off every other request.
- **N3 nav on every page.** `--nav-pill-h` 58 / `--nav-h` 78. Everything that reserves nav space already uses
  `--nav-h`, so content padding followed automatically. Two knock-ons fixed in the same pass:
  `MENU_VIEWPORT_PADDING.bottom` 76 → 94 (menus stay clear of the taller nav), and Home's "Open full" capsule,
  which borrowed `--nav-pill-h` for its height, is pinned at its old 40px.
- **Start / Sit** — pure `lib/myteam/startSit.ts`: likely swap (starter → first bench at the position, then
  IR/taxi; bench/IR/taxi → first starter), `easierWeek` (higher FPA rank = easier; a game beats a bye; equal
  ranks tie; unknown/unrated = no call), `goodWeeks` (Good + Great). The highlighted side = this week's
  verdict, with the next 5 breaking a tie / no-call.
- **View model additions** (`lib/myteam/viewModel.ts`, UI-facing only): kickoff on each cell, `slotLabel`
  → "FLEX" / "SFLX" for the position circle, `weekKickoffRange` for the week bar's dates.
- **Provider**: a `pickleague` phase (several leagues and none saved → ask instead of auto-picking), and
  league switching keeps the old roster on screen (dimmed + "Loading {league}…") until the new bundle lands.
- **Slide**: the Start / Sit panel shares a 200%-wide track with the action buttons; the panel we slid away from
  stays laid out for 340ms, then collapses (height 0, `visibility: hidden`, `inert`) so the card doesn't keep
  the taller panel's height. Transform-only (`.pare-slide`), no transition under reduced motion.

## Deviations / open items (for Kobe)

- **League format line**: the switcher shows the full line ("PPR · Superflex · 10 teams") for the *current*
  league only. Other leagues show "{n} teams · In season" — the `/api/myteam/user` league list carries no
  scoring/roster/dynasty settings, and adding them is a data-layer change (out of P5 scope). "Dynasty" isn't
  in any payload yet.
- **iPad Start / Sit**: per the pick, the iPad action pair is "Pin to side" + "Compare" — Start / Sit is phone-only.
- **Game day** (live dot, points column, starters total) is layout-reserved only; it lands in P6.
- **Hit-area spec scope**: the ≥44px check covers every My Team control + the nav. The compact site footer's
  13px text links (all pages, pre-existing) are excluded.
- **Compare density** (§8 "Offense and Defense fit without scrolling" on a 14 Pro): the nav is 18px taller —
  re-check on the phone during the P5 human gate.

## Verification

`npx vitest run` (incl. `startSit.test.ts`, `matchupContrast.test.ts`), `npm run check`, CI token-guard grep,
`npx playwright test --project=iphone-393` / `--project=ipad-834` against dev on :4000, curl of the
`/MyTeam`, `/my-team`, `/My-Team` redirects. Build: see the session summary (port 4000 rule).
