---
source_of_truth: PROJECT_PLAN.md
rules_reference: CLAUDE.md
branch: docs-refactor
last_moved: 2025-10-20
---

> _This document is maintained under `/docs-refactor` and aligns with CLAUDE.md and PROJECT_PLAN.md._

# QA Checklist — Phase 1 (UI Foundations)

## Scope
Left scoreboard rail with double-row items, pinned on desktop, drawer on mobile. Local mock data only.

## Desktop (md and up)
- [ ] Rail is pinned left at ~320–360px width
- [ ] Section headers in order: LIVE → UPCOMING → FINAL
- [ ] Each item renders 2 lines:
  - [ ] L1: `AWAY_ABBR  AWAY_SCORE` (mono) … right-aligned: `HOME_SPREAD  ·  O/U`
  - [ ] L2: `HOME_ABBR  HOME_SCORE` (mono) … right-aligned: `STATUS_OR_KICKOFF`
- [ ] Right columns are right-aligned
- [ ] Numeric parts use monospace font
- [ ] Clicking an item updates selection text: `Selected: AWY @ HOM`

## Mobile (< md)
- [ ] Header shows ☰ button; tapping opens left drawer (~300–320px)
- [ ] Drawer lists the same sections and rows as desktop
- [ ] Tapping an item updates selection and closes the drawer
- [ ] No visual jank on open/close or selection

## Density & Style
- [ ] Tight vertical rhythm (~8px)
- [ ] One-line truncation where needed
- [ ] Section headers are subtle, uppercase, small

## Status Rendering
- [ ] LIVE shows `Q{N} {MM:SS}`
- [ ] FINAL shows `Final`
- [ ] UPCOMING shows local time (`3:25 PM`)

## Accessibility
- [ ] Buttons are focusable; focus ring visible
- [ ] Semantics: rail has `aria-label`, drawer uses `role="dialog"`

## Out of Scope (Must Nots)
- [ ] No search box present
- [ ] No remote fetch; mock data only
- [ ] Compare page not wired

## Notes
-
---

# QA Checklist — Phase 2 (Header + Mismatch Chips)

## Scope
Compact header line above compare view and two insight chips (mocked rules).

## Header Line
- [ ] Shows: `AWAY @ HOME • STATUS/CLOCK • SPREAD • O/U`
- [ ] Swap button flips only the visual order (left/right labels) — values keep meaning
- [ ] Status rendering: same rules as rail (LIVE/UPCOMING/FINAL)
- [ ] Truncation: long team abbreviations/names don’t overflow

## Logos
- [ ] 24px logos render for both teams next to abbreviations
- [ ] Good contrast on dark background

## Chips
- [ ] Max 2 chips visible
- [ ] Horizontal scroll for extras (future; mock now still scrollable)
- [ ] Different severities use distinct colors (extreme/high/moderate)

## Integration
- [ ] Header + chips render above compare panels on desktop
- [ ] No layout shift when swapping
- [ ] Works with selection from rail

## Accessibility
- [ ] Swap button is focusable and has label
- [ ] Chips are readable with sufficient contrast

## Out of Scope
- [ ] Real rules engine (mock texts only)
- [ ] Deep links / URL params

---

# QA Checklist — Phase 3 (Compare Wiring + Compact Rows)

## Scope
Wire Compare to global selection (rail) with visual swap only; compact defaults with “More”.

## Selection Wiring
- [ ] Selecting rail items updates all sections immediately
- [ ] Compare does not read from URL/search; selection is global store
- [ ] Header [Swap] flips columns visually; values/ranks remain semantically correct

## Compact Rows
- [ ] Each section shows first 5 rows by default
- [ ] “More” expands remaining rows without layout jump; “Less” collapses
- [ ] Row height targets: ~32–36px desktop, ~36–40px mobile
- [ ] No logos inside stat rows

## Formatting & Badges
- [ ] Integers/1-decimals/% follow spec; monospace digits render for values
- [ ] Tiny rank pill (e.g., #3) present next to values where rank exists
- [ ] Missing stats show `—` and zero-width bars

## Bars
- [ ] Bars continue to meet in the middle; math uses the shared helper


- Sorting order: LIVE (as-is), UPCOMING by kickoff ascending, FINAL as-is
- Mock covers LIVE, UPCOMING, FINAL sample games


