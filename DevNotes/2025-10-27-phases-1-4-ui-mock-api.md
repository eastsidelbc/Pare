# Dev Note: Phases 1–4 — UI Foundations → Header/Chips → Compare Wiring → Mock API

Date: 2025-10-27  
Branch: docs-refactor  
Scope: Implement Phases 1–4 (rail, header/chips, compare wiring, mock API)  
Session Type: Product engineering (UI + mock data)

---

## Context
We executed a four-phase build: left scoreboard rail (Phase 1), compact header + two chips (Phase 2), compare wiring with compact defaults (Phase 3), and mock API integration with polling and skeletons (Phase 4). This locks UI contracts before moving to real adapters.

Links:
- Rules/reference: ../CLAUDE.md
- Plan: ../PROJECT_PLAN.md (Phase notes)
- QA: ../docs/audit/qa-checklist.md (Phase 1–4 sections)

---

## Decisions
- Single global selection store via SelectionContext; no URL/query dependency.
- Visual-only swap via swapVisual; semantics (values/ranks) unchanged.
- Introduce mock endpoints and shared types to stabilize contracts before real data.
- Odds formatting: home-based spread (0 => PK), O/U one decimal; kickoff in America/Chicago.

---

## Implementation

### Phase 1 — UI Foundations
- components/ScoreboardRail.tsx: Double-row items; LIVE → UPCOMING (sorted) → FINAL; 24px logos; monospace digits.
- components/SiteLayoutShell.tsx: Desktop pinned rail, mobile drawer.
- app/layout.tsx: Wraps pages with SiteLayoutShell.

### Phase 2 — Header + Mismatch Chips
- components/CompareHeader.tsx: AWAY @ HOME • STATUS/CLOCK • SPREAD • O/U • [Swap]; skeleton on initial load.
- components/MismatchChips.tsx: Up to 2 chips; skeleton during fetch.

### Phase 3 — Compare Wiring + Compact Rows
- app/compare/page.tsx: Subscribes to SelectionContext; passes swapVisual to panels.
- components/OffensePanel.tsx / DefensePanel.tsx: Default 5 rows + More/Less; tighter spacing.
- components/DynamicComparisonRow.tsx: swapVisual, rank pills, missing stat handling, monospace digits.

### Phase 4 — Mock API Integration
- types/matchup.ts: ScoreboardGame, MatchupPayload, Chip.
- mocks/mockScoreboard.ts, mocks/mockMatchup.ts: Mock data sources.
- app/api/mock/scoreboard & app/api/mock/matchup: Next.js routes; 5s cache/polling.
- utils/time.ts (Chicago kickoff), utils/odds.ts (spread/total formatters).
- lib/hooks/useScoreboardMock.ts: 5s polling, loading/error states.
- Wiring: Rail polls scoreboard; Header/Chips fetch matchup; added skeletons.

---

## Testing
- Rail groups/sorts correctly; selection updates Header/Chips/Compare.
- Swap flips visuals only; ranks/bars remain correct.
- Rail/header formatting: BUF -2.5, PK, O/U 46.5, kickoff 3:25 PM (America/Chicago).
- Skeletons appear during initial fetch.

---

## Performance
- 5s polling with lightweight JSON; no heavy computations.
- Minimal layout shifts; compact rows reduce DOM work.

---

## Follow-ups
- Optional: skeletons for compare panels on first mount.
- Next: introduce live adapters and aggregator; swap mocks to real sources without UI changes.

---

## Commits (key)
- feat(ui): Phase 1 layout + ScoreboardRail (mock, pinned rail/drawer)
- fix(runtime): import SiteLayoutShell and render via JSX in RootLayout
- feat(ui): Phase 2 header + mismatch chips (mock), logos in rail, selection context
- feat(compare): Phase 3 wiring - swapVisual, 5-row defaults with More, tighter spacing, missing stat handling, rank pills
- fix(compare): subscribe to global selection + pass swapVisual; add Phase 3 QA checklist
- feat(mock): add scoreboard/matchup types, mocks, API routes, time/odds utils; wire rail to 5s polling with formatting
- feat(mock): wire header/chips to mock APIs; rail uses mock scoreboard with formatted spread/total/kickoff
- feat(mock): add rail skeleton and Phase 4 QA checklist
