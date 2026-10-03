# Dev Note — 2026-10-02 — Compare "Neon Frame" redesign (Round 5 R + Round 4 K nav)

Branch `ui/compare-neon-frame`. Rules + recipe: `docs/design-system.md` §8. Decisions came from
five mockup rounds on the "Pare Compare Redesign" canvas.

## What changed
- **Foundation:** `lib/teamColors.ts` (32 teams, lift/clash/fallback), `lib/rankTier.ts`,
  `--bg-deep` + deep-card tokens and `pare-*` keyframes in `app/globals.css`. 14 new unit tests.
- **Nav:** `BottomNav` active tab = sliding gold neon outline (size unchanged).
- **Bars:** new `components/ui/SplitCapsuleBar.tsx` replaces the green/fire bars in
  `CompactComparisonRow`. Bar math (`useBarCalculation`) untouched — percentages are only
  re-normalized so the halves meet with no gap.
- **Badges:** `RankBadge` gets opt-in `effects` (#32 = solid red "ember"; #28–31 keep the plain
  static red outline — the lapping outline was tried and dropped as distracting). Only the Compare
  row trigger passes it.
- **Cards:** `CompactPanel` neon frame; `CompactPanelHeader` slimmed to label + PG|TOT
  (logos + team picker moved out).
- **Hero:** new `components/compare/MatchupHero.tsx` — team-name wordmarks (logos removed from
  Compare), auto-sized by length/wide letters, tap → existing `CompactTeamSelector`.
- **Chrome:** Compare workspace + tab bar on `--bg-deep`; active tab pill washed in the matchup's
  colors; quadrant shells deep (fixes the card-in-card look); ticker copy says "team name".

- **Menus (pass 2):** `components/ui/neonMenu.ts` (shared surface/row/header styles + viewport
  padding), `components/ui/TeamMark.tsx` (abbr wordmark), `getTeamPalette()` in teamColors.
  `CompactTeamSelector` + `CompactRankingDropdown`: 40px rows, no `TeamLogo`, height =
  Floating UI `availableHeight` (old 420px cap and `clamp(…50vh…)` removed; nav reserve via
  padding instead of the old inner `pb-[64px…]`). `BlankComparePicker` rewritten (dashed gold
  slots → team-color frame); quadrant "Add comparison" cell uses the shared `AddMark`.
  Measured: team picker 12 rows visible on 393×759, 24 on iPad; rank list 16 / 26.
- **Week presets (pass 3):** `components/compare/WeekMatchupPills.tsx` reads
  `useSchedule().weeks[currentNflWeek]` (already loaded app-wide — no fetch); hides if the week
  isn't ready. `onPickMatchup` threads ComparePane → BlankComparePicker; Workspace + Quadrants
  supply it via `useFillComparison` (pure `findPairDuplicate` tested). Away = Team A. QA: 16
  pills, tap fills MIA vs BUF with no extra tab; tapping an open pair from a new blank drops the
  blank and jumps (4 tabs → 3).

- **Power Surge (pass 4):** trigger = `isPowered(ranks)` (≥ 3 ranks in 1..5) per card per team,
  computed by `usePowerSurge` with `calculateBulkRanking` + the row badges' direction rule on the
  displayed (per-game/total) data, so it always matches the badges. `StormCrackle` canvas sits
  under the rows (`z-0`, content `z-[1]`) inside the card's inner `relative isolate` box. Picked
  B·9 from two mockup rounds (15 effects → 10 crackle programs). QA: BAL (5/5 top-5) powered on
  both cards; BUF (2/5) not; no console warnings.

## Verification (cloud sandbox, every phase)
`npm run check` · `vitest run` (58 tests by the end) · production build (webpack, Google Font mocked —
the sandbox can't reach fonts.googleapis.com or ESPN) · Playwright screenshots with fixture
stats at 393×852, 393×759 (14 Pro app-mode usable height → no scroll), iPad 834×1194 and
1194×834, Home, reduced motion · all 32 wordmarks measured to fit · tap-wordmark opens picker.

## Not in this branch
Logos on Home / Standings / Leaders (next branch). Global `--bg` switch.
Loading skeleton still uses the old panel shape (brief; restyle with the next pass).

## Fixed (pre-existing bug)
`ComparisonsProvider.addComparison` read `added` from inside a `setComparisons` updater; React
may run the updater later, so it logged "cap reached" and skipped `setActiveId` even when the add
succeeded ("+" left you on the old tab). Now `setActiveId` runs inside the updater (like
`setActive`/`removeComparison`) and the cap check uses a ref of the committed list. QA: 8 taps
of "+" → each lands on the new blank tab; cap holds at 8; no warnings.

- **Polish (pass 5, 2026-10-03):** close × on every comparison tab / iPad card in soft gold
  (`--gold-bright` 70% active / 50% inactive / 65% card); closing the LAST comparison re-seeds a
  blank tab (the "pick 2 teams" screen) instead of the default matchup; a lone blank tab hides its
  ×. Quadrant × border switched to longhands (same React shorthand/longhand warning class as the
  bar fix). Week pills: plain white 13px/700 abbreviations (the outlined TeamMark was hard to read
  at 12.5px) + a second line with kickoff day/time (local), live clock in red, or "Final"; pills
  44px tall. Design-system §8 gained **type roles** (outlined display text only at 20px+).

---

## Full summary — what the Compare overhaul is (2026-10-02 → 10-03)

**Look ("Neon Frame", Round 5 R + Round 4 K nav).** Near-black Compare background (`--bg-deep`),
deep-gradient cards wrapped in a 2px frame that fades team A color → neutral → team B color, with
each team's glow spilling off its side. Team-name wordmarks (city · record over an outlined
nickname) replace logos on Compare. Bottom nav: dark glass capsule, active tab = sliding gold
neon outline (sizing unchanged). Gold (`--gold-bright`) is the UI accent: nav, PG|TOT, "+", ×,
headers, "WEEK n".

**Bars.** `SplitCapsuleBar`: one capsule split at the exact `useBarCalculation` ratio, each half a
see-through neon tube in its team color; short soft white divider; widths spring-animate. Team
colors (`lib/teamColors.ts`): lifted to ≥ 3:1 contrast on the background, clash-checked (ΔE < 32 →
alt colors), fallback green/fire — 0 fallbacks across all 32×32 matchups.

**Rank tiers** (`lib/rankTier.ts`): #1 gold ring + gold sparks + fast team-color breathe · #2–5
soft team-color breathe · #6–27 plain · #28–31 static red badge outline · #32 solid red ember
badge. All stat numbers white.

**Layout rule.** Offense + Defense (5 + 5 metrics) fit one iPhone 14 Pro screen in app mode
(393×759) with no scroll.

**Pickers & menus.** One shared menu look (`neonMenu.ts`): deep card, hairline 40px rows, gold
header, height follows the screen. Team picker rows = TeamMark + city/nickname; rank list = badge
+ TeamMark + nickname + value. No logo artwork anywhere on Compare.

**New comparison flow.** "+" (or closing the last tab) → blank screen: two dashed-gold "+" slots
and this week's games as one-tap pills (color wash, kickoff/live/final). Already-open matchups
jump to their tab instead of duplicating. "+" now always lands on the new tab (store bug fixed).

**Power Surge.** A team top 5 in ≥ 3 of a card's metrics gets the storm-crackle effect (faint
plasma web always on + random edge flares, Subtle, fades to the middle) on its half of that card.

**Process.** Every look decision came from interactive mockup rounds: "Pare Compare Redesign"
canvas (rounds 1–5), "Power Surge Lab" (15 effects) and "Storm Crackle Lab" (10 on/off programs,
B·9 picked). Each pass: check + tests + production build + Playwright screenshots on phone and
iPad, then mirrored to the PC repo; Kobe commits/pushes.

**Untouched (by rule):** data layer, `useRanking`, `useBarCalculation`, display-mode math, hook
signatures.

## Open items / next
- **Background lightness:** `--bg-deep` (#030409) reads too dark next to the equally dark nav.
  Plan: mock 3–4 levels side by side (≈ #0a0d14 deep navy-slate), then set a ladder
  background < card, nav darkest; re-check team-color contrast (`COMPARE_BG` + tests).
- **Go global:** promote Neon Frame from Compare-only to app-wide rules (surfaces, card types,
  type roles, gold accent, TeamMark/wordmarks instead of logos), then restyle Home `MatchupCard`,
  Standings `DivisionTable`, Leaders. Busy screens (32-team Standings): team color on the mark
  only, neutral rows.
- Dropdown TeamMarks are outlined at 14–15px — same readability concern as the old pills
  (Kobe chose to leave them for now).
- `PanelSkeleton` still uses the old panel shape.
- Optional "3× TOP 5" chip for Power Surge (not shipped).

