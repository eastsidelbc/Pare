# Dev Note — 2026-09-14 — RankBadge 3-tier system (dark mode)

> Rules & architecture live in `CLAUDE.md`; this note is implementation rationale only.
> State authority: `CHANGELOG.md` `[Unreleased]`.

## Goal
Upgrade `components/ui/RankBadge.tsx` into a 3-tier badge across the 32-team
field. Surgical — badge only. No ranking-calculation or data-layer changes.
Dark mode only.

## Tiers (by rank within the ranked field of size `n`)
- **Top 5 → GOLD**: `#1` filled gold pill (dark text `#1a1400`, soft gold glow —
  the "crown"); ranks 2–5 gold text on faint gold tint + gold border.
- **Middle 6..(n-5) → SLATE**: quiet neutral (slate text/tint/border).
- **Bottom 5 → RED**: worst (`= n`) filled red pill (white text, soft red glow);
  the other four red text on faint red tint + red border.
- Top checks take precedence over bottom in the (rare) tiny-field overlap.

Tokens (inline in the component — dark only): gold `#e8b923` / tint
`rgba(232,185,35,.14)` / border `rgba(232,185,35,.45)`; red `#e5484d` / tint
`rgba(229,72,77,.14)` / border `rgba(229,72,77,.45)`; slate `#7c8698` / tint
`rgba(124,134,152,.14)` / border `rgba(124,134,152,.30)`. Glow = same-hue
box-shadow on the two filled pills only.

## Details / decisions
- **Ordinal bug fixed**: proper `ordinalSuffix` → 1st/2nd/3rd/…/21st/31st/32nd
  (no "31th").
- **Tie-aware**: unchanged tie handling; tied teams share a rank → same tier and
  the `T-` prefix.
- **Actual ranked count**: bottom-5 is based on `totalTeams` (the real ranked
  field size, which may be < 32 while data loads), not a hard-coded 32. Threaded
  from `CompactRankingDropdown` using the ranking result it already computes
  (`allTeamRankings[currentTeam]?.totalTeams`) — `CompactComparisonRow` untouched,
  so the (pre-existing) rules-of-hooks warnings in that file aren't in scope.
  `RankBadge` defaults `totalTeams=32` if unknown.
- **Missing rank**: `rank === null` (or non-finite) → neutral slate "—" chip, no
  crash.
- Applied everywhere `RankBadge` renders (mobile offense + defense rows via
  `CompactRankingDropdown`). No other component behaviour changed.

## Files changed
- `components/ui/RankBadge.tsx` — tier system + ordinal + null handling.
- `components/mobile/CompactRankingDropdown.tsx` — pass `totalTeams`; removed 3
  pre-existing unused symbols so the file lints clean.
- `CHANGELOG.md` — `[Unreleased]` entry.

## Verify (cheap)
1. `npx eslint components/ui/RankBadge.tsx components/mobile/CompactRankingDropdown.tsx`
   → clean.
2. Tier + ordinal sanity (n=32):
   | rank | render |
   |---|---|
   | 1st  | GOLD (filled crown) |
   | 2nd  | GOLD (outline) |
   | 5th  | GOLD (outline) |
   | 6th  | SLATE |
   | 15th | SLATE |
   | 27th | SLATE |
   | 28th | RED (outline) |
   | 31st | RED (outline) |
   | 32nd | RED (filled worst) |
