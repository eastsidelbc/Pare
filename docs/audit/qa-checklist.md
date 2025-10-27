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
- Sorting order: LIVE (as-is), UPCOMING by kickoff ascending, FINAL as-is
- Mock covers LIVE, UPCOMING, FINAL sample games


