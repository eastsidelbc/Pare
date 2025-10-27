---
source_of_truth: PROJECT_PLAN.md
rules_reference: CLAUDE.md
branch: docs-refactor
last_moved: 2025-10-20
---

> _This document is maintained under `/docs-refactor` and aligns with CLAUDE.md and PROJECT_PLAN.md._

# Spec: Scoreboard Rail (Phase 1)

## Purpose
Compact left rail showing games grouped by status with double-row items. Desktop: pinned. Mobile: slide-out drawer. Mock data only (no remote fetch).

## Grouping Order
1. LIVE
2. UPCOMING (sorted by kickoff ascending)
3. FINAL

## Row Format (Double-Row)
- Line 1: `AWAY_ABBR  AWAY_SCORE` … right-aligned: `HOME_SPREAD  ·  O/U`
- Line 2: `HOME_ABBR  HOME_SCORE` … right-aligned: `STATUS_OR_KICKOFF`

### Status/Kickoff Rules
- LIVE → `Q{N} {MM:SS}` (e.g., `Q3 04:31`)
- FINAL → `Final`
- UPCOMING → Local time (e.g., `3:25 PM`)

## Styling
- Monospace font for numeric parts (scores, odds, totals)
- Tight vertical rhythm (~8px)
- One-line truncation where needed
- Right column always right-aligned
- Subtle section headers (uppercase, small, muted)

## Interaction
- Each row is a button; on click/tap → `onSelect({ awayAbbr, homeAbbr })`
- Mobile drawer closes on selection
- Temporary verification line: `Selected: AWY @ HOM`

## Component API
```ts
type GameStatus = 'LIVE' | 'UPCOMING' | 'FINAL';
type TeamSide = { abbr: string; score: number | null };
type Game = {
  id: string;
  away: TeamSide;
  home: TeamSide;
  status: GameStatus;
  quarter?: number;
  clock?: string;
  spread?: string;
  total?: string;
  kickoffIso?: string;
};

type ScoreboardRailProps = {
  onSelect?: (m: { awayAbbr: string; homeAbbr: string }) => void;
};
```

## Layout Integration
- Desktop (md+): pinned left rail at 320–360px
- Mobile: header with ☰ button, drawer width 300–320px
- Main content shows temporary selection line (verification)

## Out of Scope
- No search box
- No remote data
- Compare page not wired


