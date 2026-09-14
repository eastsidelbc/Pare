# Dev Note: Mobile Layout Fundamentals Fix

**Date**: 2026-09-14  
**Task**: Fix broken mobile UI — layout fundamentals, debug import cleanup  
**Rules**: See [CLAUDE.md](../../CLAUDE.md)

---

## Context

Returning to the project after a gap. Mobile UI had been built in October 2025 sessions but was visually broken — things were "off, off-centered, not balanced." The root causes turned out to be structural, not stylistic.

---

## Problems Found

### 1. Broken debug imports (build blocker)
Three mobile components imported `@/debug/traceDropdown` which was deleted in the repo cleanup pass:
- `CompactPanel.tsx`
- `CompactRankingDropdown.tsx`
- `CompactTeamSelector.tsx`
- `CompactComparisonRow.tsx` (used inline `console.log` debug block)

### 2. Fixed-bar layout anti-pattern
`MobileTopBar` and `MobileBottomBar` used `position: fixed` + compensated with hardcoded `calc(56px + env(safe-area-inset-top))` padding. This is fragile and caused misalignment on different devices/viewports.

### 3. Floaty row spacing
`CompactComparisonRow` used `mb-2` to separate rows, creating 8px gaps. theScore-style density has tight rows with subtle separators.

### 4. Panel header off-center risk
`CompactPanelHeader` used `flex-1` center section between unequal-width side items, which can drift. Replaced with 3-column CSS grid.

### 5. `DEFAULT_DEFENSE_METRICS` copy-paste bug
`lib/metricsConfig.ts` had `DEFAULT_DEFENSE_METRICS` identical to `DEFAULT_OFFENSE_METRICS` (5 metrics), missing defense-specific metrics (turnovers forced, interceptions, scoring%, turnover%). The CLAUDE.md documented the intended 8-metric version but the code didn't match.

---

## Implementation

### Layout redesign (core fix)
Changed from `position: fixed` compensated layout to proper flex-column layout:

```
flex flex-col h-[100dvh]
  ├── MobileTopBar (flex-none, safe-area-inset-top preserved)
  ├── Content (flex-1, overflow-y-auto, min-h-0)  ← KEY: min-h-0 allows shrinking
  └── MobileBottomBar (flex-none, safe-area-inset-bottom preserved)
```

**Why `min-h-0` matters:** Flex items default to `min-height: auto`, which prevents shrinking. Without it, the content area won't stay within the viewport and the scroll doesn't work.

### Files changed
- `components/mobile/MobileCompareLayout.tsx` — flex-column root, no more calc()
- `components/mobile/MobileTopBar.tsx` — removed `fixed`, kept safe-area padding
- `components/mobile/MobileBottomBar.tsx` — removed `fixed`, kept safe-area padding
- `components/mobile/CompactPanelHeader.tsx` — `grid-cols-[44px_1fr_44px]` for guaranteed centering
- `components/mobile/CompactComparisonRow.tsx` — removed `mb-2`, added `grid-cols-[1fr_auto_1fr]` for balanced row layout, `tabular-nums` on values
- `components/mobile/CompactPanel.tsx` — removed debug imports/useEffects, added `divide-y divide-white/5` on row container
- `components/mobile/CompactRankingDropdown.tsx` — removed debug import + trace useEffect
- `components/mobile/CompactTeamSelector.tsx` — removed debug import + trace useEffect
- `lib/metricsConfig.ts` — restored `DEFAULT_DEFENSE_METRICS` to 8-item intended design

---

## Testing

- Verified in browser at iPhone 14 viewport (390×844, deviceScaleFactor=2)
- Offense panel: 5 rows correct
- Defense panel: 8 rows correct (was 5 due to copy-paste bug)
- Scrolling works: `flex-1 overflow-y-auto min-h-0` container, scrollH=789 > clientH=722
- Top/bottom bars stay fixed as user scrolls
- No linter errors across all changed mobile components

---

## Follow-ups (future)
- Sticky panel headers when scrolling (section headers don't scroll away)
- Ordinal suffix bug: "21th" should be "21st" (ranks 21, 31, etc.)
- Tablet-first layout pass (768px-1023px breakpoint)
- Game header line, mismatch chips, scoreboard rail (see `docs/audits/2025-10-ui-compact-spec.md`)
