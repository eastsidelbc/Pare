---
Title: Metrics Selector Full-Width Desktop & UX Cleanup
Date: 2025-10-02
Owner: Jeremy
Versions Affected: 1.0.x
Links:
  - CLAUDE Section: CLAUDE.md#code-standards-patterns
  - Components: components/MetricsSelector.tsx, components/FloatingMetricsButton.tsx
  - Previous: docs/devnotes/2025-10-02-metrics-selector-ui-improvements.md
---

**Normative rules live in CLAUDE.md. This note records implementation details and rationale.**

### 1) Context & Goal
Following the previous toggle/responsive improvements, three UX refinements requested:
1. **Full-width on desktop**: Metrics panel was constrained to 448px - too narrow for desktop
2. **Remove "Customize" step**: Eliminate button, show metrics immediately (no extra click)
3. **Clean labels**: Selected metrics showed `1. Points (points)` - remove parenthetical field key

### 2) Decisions & Alternatives

**Decision 1: Full-Width Desktop Layout**
- **Problem**: FloatingMetricsButton hardcoded `w-96 sm:w-[28rem]` (384px → 448px max)
- **Solution**: Use `inset-x-4 md:inset-x-8 lg:inset-x-12` for responsive horizontal spacing
  - Mobile: 1rem margins (inset-x-4)
  - Tablet: 2rem margins (md:inset-x-8)
  - Desktop: 3rem margins (lg:inset-x-12)
- **Result**: Metrics panel spans full screen width minus comfortable padding
- **Alternatives considered**:
  - `left-4 right-4 md:left-auto md:right-auto md:w-full` (rejected - complex breakpoint logic)
  - Remove all constraints (rejected - would touch screen edges on mobile)

**Decision 2: Remove "Customize" Button**
- **Problem**: Users had to click "Customize" → see metrics grid → click metric (3 steps)
- **Solution**: 
  - Changed `const [isExpanded, setIsExpanded] = useState(false)` to `const isExpanded = true`
  - Removed toggle button (lines 125-130)
  - Removed conditional wrapper `{isExpanded && (` → always render metrics section
- **Result**: Metrics grid always visible, immediate interaction (2 steps)
- **Alternatives considered**:
  - Keep button, default expanded (rejected - unnecessary UI element)
  - Add auto-scroll on mount (rejected - not needed, panel already visible)

**Decision 3: Clean Selected Labels**
- **Problem**: Labels showed `1. Points (points)` - redundant field key
- **Solution**: Remove `<span>({metric?.field || metricKey})</span>` from selected list (lines 148-150)
- **Result**: Clean labels like `1. Points`, `2. Total Yards`
- **Alternatives considered**:
  - Strip parentheses with regex (rejected - removing span is cleaner)
  - Show field on hover (rejected - unnecessary complexity)

### 3) Implementation Notes

**File 1: `components/FloatingMetricsButton.tsx`**

```typescript
// Line 64 - Before:
className="fixed bottom-20 right-4 w-96 sm:w-[28rem] max-w-[calc(100vw-2rem)] z-50"

// Line 64 - After:
className="fixed bottom-20 inset-x-4 md:inset-x-8 lg:inset-x-12 z-50"
```

**Explanation:**
- `inset-x-4` = `left-4 right-4` (sets both horizontal margins)
- Responsive scaling: 1rem → 2rem → 3rem
- No max-width cap - fills available screen width

**File 2: `components/MetricsSelector.tsx`**

**Change 1: Always expanded (line 33-34)**
```typescript
// Before:
const [isExpanded, setIsExpanded] = useState(false);

// After:
// Always show metrics (no expand/collapse needed)
const isExpanded = true;
```

**Change 2: Remove Customize button (lines 125-130 deleted)**
```typescript
// Removed:
<button
  onClick={() => setIsExpanded(!isExpanded)}
  className="text-xs md:text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
>
  {isExpanded ? 'Collapse' : 'Customize'}
</button>
```

**Change 3: Remove conditional wrapper (line 157)**
```typescript
// Before:
{isExpanded && (
  <div className="border-t border-slate-600/30 pt-4">

// After:
<div className="border-t border-slate-600/30 pt-4">
```

**Change 4: Clean selected labels (lines 136-150)**
```typescript
// Before:
<span className="text-blue-300 font-medium">
  {index + 1}. {metric?.name || metricKey}
</span>
<span className="text-blue-400/70 text-xs md:text-sm">
  ({metric?.field || metricKey})  ← REMOVED
</span>

// After:
<span className="text-blue-300 font-medium">
  {index + 1}. {metric?.name || metricKey}
</span>
```

### 4) Testing & Acceptance Criteria
- [x] Desktop: Metrics panel spans full width (with comfortable padding) ✓
- [x] No "Customize" button visible ✓
- [x] Metrics grid immediately visible on panel open ✓
- [x] Selected labels show clean names (no parentheses): `1. Points` ✓
- [x] Mobile: Unchanged layout (1rem margins preserved) ✓
- [x] Toggle behavior: Still works (click metric to add/remove) ✓
- [x] Add All/Clear All: Still functional ✓
- [x] TypeScript: Zero errors ✓
- [x] Linter: Zero errors ✓

### 5) Performance & Limitations
- Zero performance impact - CSS/state changes only
- Desktop now shows 3-column grid with full width (better space utilization)
- Mobile maintains single/dual-column grid (unchanged)

**Improvements:**
- Reduced interaction steps: 3 clicks → 2 clicks (no "Customize" button)
- Better desktop space utilization: ~450px → ~90% screen width
- Cleaner visual hierarchy: Selected labels less cluttered

**Limitations:**
- Always-visible metrics may feel overwhelming for users with few selections (acceptable tradeoff for power users)
- Very wide screens (>2000px) will have wide grids (mitigated by 3rem max padding)

### 6) Follow-ups
- Monitor user feedback on always-visible metrics (vs collapsible)
- Consider adding keyboard shortcut to close panel (Esc key)
- Potential future: Persist panel open/closed state in localStorage

### 7) Graduated to CLAUDE
- None (UX refinement, not architectural pattern)

### 8) Visual Changes Summary

**Before:**
```
Metrics Panel (448px fixed width)
┌────────────────────┐
│ 🏈 Offense Metrics │
│ Add All | Reset |  │
│   Customize ←─────│ Click to expand
│                    │
│ Selected: 1. Pts   │
│ (points) ←────────│ Redundant
└────────────────────┘
```

**After:**
```
Metrics Panel (full width - comfortable margins)
┌──────────────────────────────────────────────┐
│ 🏈 Offense Metrics                           │
│ Add All | Reset Defaults                     │
│                                              │
│ Selected: 1. Points ←───────────────────────│ Clean
│                                              │
│ Click any metric to toggle selection:       │
│ [Points] [Total Yards] [Passing Yards]...   │ Always visible
└──────────────────────────────────────────────┘
```

### 9) Technical Details

**State Changes:**
- `isExpanded` changed from `useState(false)` to `const true` (no state management needed)
- Removed `setIsExpanded` function (no longer called)
- Removed button click handler

**CSS Changes:**
- Container: `w-96 sm:w-[28rem]` → `inset-x-4 md:inset-x-8 lg:inset-x-12`
- Effective width: 384px → ~90% viewport width (responsive)

**DOM Changes:**
- Removed 1 button element (Customize)
- Removed 1 conditional wrapper (`{isExpanded &&`)
- Removed 1 span element per selected metric (field name)

**User Flow:**
- Before: Click ⚙️ → Click "Customize" → Click metric → Metric added
- After: Click ⚙️ → Click metric → Metric added (1 fewer click)

