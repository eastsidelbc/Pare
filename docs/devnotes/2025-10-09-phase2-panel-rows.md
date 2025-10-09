# Phase 2: Panel Headers & Comparison Rows

**Date**: 2025-10-09  
**Status**: ✅ Complete  
**Phase**: Mobile UI Transformation - Phase 2

---

## Context

Phase 2 of mobile transformation implemented the core comparison UI with theScore's compact layout and Pare's visual identity. Built functional panels with headers, comparison rows, and ranking dropdowns - all fully integrated with existing data hooks.

**Key Requirements**:
- theScore layout structure (70px header + 48px rows)
- NO borders (except panel outline)
- Instant toggle for PER GAME/TOTAL
- Tap rank text `(30th)` to open dropdown
- Responsive dropdown height: `clamp(280px, 40vh, 380px)`
- Purple accents, steel gradients, Pare styling
- Full data integration with `useRanking`, `useBarCalculation`, `useDisplayMode`

---

## Implementation

### 1. CompactPanelHeader (`components/mobile/CompactPanelHeader.tsx`)

**Height**: 70px  
**Structure**:
- Team A logo (40px, tappable) - LEFT
- Center section with panel title + instant toggle
- Team B logo (40px, tappable) - RIGHT

**Styling**:
- Purple title text (`text-purple-400`)
- Display mode button (`text-slate-400`, uppercase, tracking-wider)
- NO borders on logos
- Opacity feedback on tap (`active:opacity-50`)

**Instant Toggle**:
```typescript
const handleToggleMode = () => {
  const newMode = displayMode === 'per-game' ? 'total' : 'per-game';
  onDisplayModeChange(newMode);
};
```

### 2. CompactComparisonRow (`components/mobile/CompactComparisonRow.tsx`)

**Height**: 48px  
**Structure**:
```
[Value (15px) + Rank (10px, tappable)] ... [Metric Name (11px) + Bars (8px)] ... [Rank (10px, tappable) + Value (15px)]
```

**Bar Styling**:
- Team A: Purple gradient `rgba(139, 92, 246, 0.8) → rgba(167, 139, 250, 0.6)`
- Team B: Steel gradient `rgba(100, 116, 139, 0.6) → rgba(148, 163, 184, 0.4)`
- Height: 8px (thin, theScore style)
- NO borders

**Ranking Integration**:
- Uses `useRanking()` for each team
- Uses `useBarCalculation()` for amplified bar widths
- Rank badges clickable (opens `CompactRankingDropdown`)
- Average team shows `📊 Avg` badge instead of rank

**Value Formatting**:
- Reads from `AVAILABLE_METRICS` config
- Respects format type (decimal, percentage, time, number)
- Font: 15px semibold for values, 10px for rank

### 3. CompactRankingDropdown (`components/mobile/CompactRankingDropdown.tsx`)

**Height**: `clamp(280px, 40vh, 380px)` (responsive)  
**Width**: 280px  
**Position**: Absolute, anchored to rank badge

**Structure**:
- Backdrop overlay (`rgba(0, 0, 0, 0.6)`)
- Dropdown menu (rounded-xl, purple-tinted background)
- Scrollable team list
- Each row: Rank badge + Logo (32px) + Team name + Value + Selected indicator

**Styling**:
- Background: `rgba(15, 23, 42, 0.98)` with `backdrop-filter: blur(10px)`
- Selected row: `rgba(139, 92, 246, 0.2)` background
- Average team: Purple rank badge `📊` + separator border
- Framer Motion animations (scale + opacity)

**Interaction**:
- Tap to select team
- Close on outside click
- Opacity feedback on tap

### 4. CompactPanel (`components/mobile/CompactPanel.tsx`)

**Integration Hub** - Combines all components with full data flow:

```typescript
// Display mode management
const { mode, setMode, transformTeamData, transformAllData } = useDisplayMode('per-game');

// Dropdown state management
const [activeDropdown, setActiveDropdown] = useState<{
  metricKey: string;
  team: 'A' | 'B';
} | null>(null);

// Transform data based on display mode
const transformedAllData = transformAllData(allData);
const transformedTeamAData = transformTeamData(teamAData);
const transformedTeamBData = transformTeamData(teamBData);
```

**Structure**:
- Panel container (rounded-xl, purple border)
- `CompactPanelHeader` at top
- Map over `selectedMetrics` → render `CompactComparisonRow` for each
- Conditionally render `CompactRankingDropdown` when rank badge clicked
- Dropdowns positioned absolutely (left-3 for Team A, right-3 for Team B)

**Panel Styling**:
- Background: `rgba(15, 23, 42, 0.6)`
- Border: `1px solid rgba(139, 92, 246, 0.2)`
- Rounded corners (`rounded-xl`)
- Overflow hidden

---

## Technical Details

### Data Flow

1. **Display Mode Toggle** → `useDisplayMode` → transforms all data
2. **Rank Badge Click** → `handleRankClick(metricKey, team)` → sets `activeDropdown`
3. **Team Selection** → `CompactRankingDropdown` → `onTeamChange` → updates global state
4. **Bar Calculation** → `useBarCalculation` → amplified widths based on rank gap
5. **Ranking** → `useRanking` → per-metric rank calculation

### Performance

- `useMemo` in `CompactRankingDropdown` for expensive ranking calculations
- Framer Motion for smooth animations
- Conditional rendering of dropdowns (only one open at a time)
- No heavy backdrop blur (theScore style)

### Accessibility

- Semantic HTML (`<button>` for interactive elements)
- `aria-label` on all clickable badges
- Clear visual feedback (opacity change on tap)
- Keyboard navigation support (via native button elements)

---

## Files Changed

### New Files Created
- `components/mobile/CompactPanelHeader.tsx` (76 lines)
- `components/mobile/CompactComparisonRow.tsx` (186 lines)
- `components/mobile/CompactRankingDropdown.tsx` (214 lines)

### Modified Files
- `components/mobile/CompactPanel.tsx` (154 lines) - Full integration

---

## Testing Checklist

✅ Panel header renders with correct team logos  
✅ Display mode toggle switches instantly (PER GAME ↔ TOTAL)  
✅ Comparison rows show correct values and rankings  
✅ Bar widths reflect rank-based amplification  
✅ Rank badges clickable and open dropdown  
✅ Dropdown shows all teams sorted by rank  
✅ Average team shows `📊 Avg` badge  
✅ Team selection updates global state  
✅ Dropdown closes on outside click  
✅ No lint errors  

## Bug Fixes

### Fix #1: TeamData Property Access (2025-10-09)
**Issue**: Runtime error `Cannot read properties of undefined (reading 'points')`  
**Root Cause**: Incorrectly assumed `TeamData` has a `stats` property. Stats are directly on the object.  
**Fix**: Changed `teamData.stats[metricKey]` → `teamData[metricKey]` in:
- `CompactComparisonRow.tsx` (lines 51-52)
- `CompactRankingDropdown.tsx` (lines 76, 91)

**Before**:
```typescript
const teamAValue = teamAData.stats[metricField] || '0'; // ❌ Wrong
```

**After**:
```typescript
const teamAValue = teamAData[metricField] || '0'; // ✅ Correct
```

### Fix #2: Two-Line Layout with Edge-to-Edge Bars (2025-10-09)
**Issue**: Initial single-line layout didn't match theScore's compact structure. Bars had padding.  
**Root Cause**: Original implementation combined data and bars on one line with padding applied to both.  
**Fix**: Restructured `CompactComparisonRow.tsx` to match theScore's two-line layout:

**LINE 1 (Data)**: `px-3 py-2` padding
- Team A: Value + Rank badge
- Center: Metric name
- Team B: Rank badge + Value

**LINE 2 (Bars)**: NO padding - edge-to-edge
- Team A: Green gradient `#10B981 → #059669` with glow
- Team B: Orange gradient `#F97316 → #EA580C` with glow
- Height: 6px (down from 8px)
- Bars touch left and right panel edges (0px gaps)

**Color Change**: Purple/steel gradients → Pare desktop colors (green/orange)  
**Total Row Height**: ~52px (36px data line + 6px bar line + 10px gap)

**Visual Structure**:
```
┌─────────────────────────────────────┐
│ [12px padding]                      │
│ 24.6 (15th)   POINTS   (1st) 34.8  │ ← LINE 1: Data (WITH padding)
│                                     │
│[green bar full width][orange bar]  │ ← LINE 2: Bars (NO padding)
└─────────────────────────────────────┘
↑                                   ↑
Bars touch edge                Bars touch edge
```  

---

## Next Steps

**Phase 3**: Team Logo Dropdown Integration
- Make team logos open full team selector (alphabetical list)
- Reuse dropdown styling pattern from ranking dropdown
- Logo click → team selector dropdown → select new team

---

## Cross-References

- **Parent Doc**: `docs/devnotes/2025-10-09-phase1-mobile-foundation.md` (Phase 1)
- **Rules**: `CLAUDE.md` § Mobile Development Roadmap
- **Prompt**: Desktop file references for theScore layout specs
- **Components**: `lib/useRanking.ts`, `lib/useBarCalculation.ts`, `lib/useDisplayMode.ts`

---

**Graduation**: If patterns stabilize across remaining phases, promote styling constants and layout measurements to `CLAUDE.md` Mobile Design System section.

