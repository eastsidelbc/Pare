# Dev Note — 2026-10-03 — Home "Neon Frame" (Frame Row game cards)

Branch `ui/home-neon-frame`. Recipe: `docs/design-system.md` §9 (page header, day labels) + §9.1 (game card).

## How it was picked
Two mockup rounds on the "Pare Home Redesign" board (real 393×759 phones):
- Round 1 — 3 game cards (A Frame Row · B Wordmark · C Scoreboard), 3 headers, 3 day labels → **A + H1 + D1**.
  B was flagged: long nicknames (COMMANDERS, BUCCANEERS) can't fit half a card at 20px.
- Round 2 — one dial at a time: glow (none / subtle / Compare), color (muted / standard / vivid),
  name style (outline / outline + glow / solid), size (20 / 24 / 28) → **G1 · C2 · N3 · 24px**.

## What changed
- `components/schedule/MatchupCard.tsx` — rewritten render (same props, same accordion contract):
  no `TeamLogo`, no chevron; `getMatchupPalettes(away, home)` for frame + abbreviation colors.
- `MatchupCardSkeleton.tsx` — new footprint. `WeekSection.tsx` — gold-bright day labels, hairlines,
  deep empty state. `ScheduleScreen.tsx` — `--bg-deep` page + header, 52px header; dropped an unused
  `eslint-disable`. `WeekControl.tsx` — glass capsule + `neonMenu` week list.
  `MatchupAccordion.tsx` / `PostGameBox.tsx` — deep peek container, hairline dividers.
- `app/globals.css` — `--glass-edge` token, `.pare-live-dot` (opacity pulse, static under reduced motion).
  `BottomNav.tsx` — its literal edge color now uses `--glass-edge`.
- Test: every team's line color clears 3:1 (WCAG large text) on `--card-deep-a` in all 32×32 matchups.

## Performance
Static box-shadows only (no animated glow, no blur, no canvas). The only animation is the 6px live
dot's opacity. In line with the Compare perf audit (no backdrop-filter over animated content).

## Verification (cloud sandbox)
`npm run check` clean · `vitest run` 59 passed · production build (webpack, Inter mocked) ·
Playwright 393×759 + iPad 834×1194: Home, week menu, open accordion; a sandbox-only fixture page
with pre / live / halftime / final + all 32 teams → no row overflow, every card 67px tall,
widest abbreviation WAS ≈ 59px in an ≥ 85px cell. Clash swaps verified (KC vs TB, NYG vs BUF).
Sandbox can't reach ESPN, so real records/odds and live polling need an on-device check.

## Open items
- "Open full" button in the peek is still the old filled `--gold` (§9 says UI accent = gold-bright) — restyle with the peek pass.
- `PostGameBox` PPR numbers still `--gold`.
- iPad: cards span the 600px column; a 2-column grid could come later (CardGrid).
- Next: Standings (`DivisionTable` still uses `TeamLogo`), then Leaders.
