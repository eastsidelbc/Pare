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
- **Badges:** `RankBadge` gets opt-in `effects` (28–31 lapping red outline, 32 ember). Only the
  Compare row trigger passes it.
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

## Verification (cloud sandbox, every phase)
`npm run check` · `vitest run` (51 tests) · production build (webpack, Google Font mocked —
the sandbox can't reach fonts.googleapis.com or ESPN) · Playwright screenshots with fixture
stats at 393×852, 393×759 (14 Pro app-mode usable height → no scroll), iPad 834×1194 and
1194×834, Home, reduced motion · all 32 wordmarks measured to fit · tap-wordmark opens picker.

## Not in this branch
Logos on Home / Standings / Leaders (next branch). Global `--bg` switch.
Loading skeleton still uses the old panel shape (brief; restyle with the next pass).

## Found, not fixed (pre-existing)
`ComparisonsProvider.addComparison` reads `added` from inside a `setComparisons` updater; React
may run the updater later, so it can log "cap reached" (and skip `setActiveId`) even when the
add succeeded. Seen in QA with 3 tabs. Needs a go-ahead before touching the store.
