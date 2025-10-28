---
Title: Metrics Selector UI Improvements
Date: 2025-10-02
Owner: Jeremy
Versions Affected: 1.0.x
Links:
  - CLAUDE Section: CLAUDE.md#code-standards-patterns
  - Component: components/MetricsSelector.tsx
---

**Normative rules live in CLAUDE.md. This note records implementation details and rationale.**

### 1) Context & Goal
- Improve MetricsSelector UX with three key enhancements:
  1. Toggle selection by clicking metric bubbles (add OR remove)
  2. Add single "Add All / Clear All" button with dynamic label
  3. Scale up desktop sizing for better readability

### 2) Decisions & Alternatives
**Decision 1: Toggle Behavior**
- Added `handleToggleMetric()` function that checks if metric is selected
- If selected → removes it; if not selected → adds it (respecting maxMetrics limit)
- Updated bubble onClick to use toggle instead of add-only
- Selected metrics now show `hover:bg-green-600/30` to indicate they're clickable
- **Alternatives considered**: 
  - Add separate remove buttons per metric (rejected - clutters UI)
  - Keep add-only, improve X button visibility (rejected - less intuitive)

**Decision 2: Add All / Clear All Button**
- Added `handleAddOrClearAll()` function with smart label logic
- Button label: "Add All" when `!allMetricsSelected`, "Clear All" when all selected
- Uses `availableMetricKeys.every()` to determine state
- Positioned in header button group, styled with purple theme
- **Alternatives considered**:
  - Separate "Add All" and "Clear All" buttons (rejected - takes more space)
  - Add to footer (rejected - less discoverable)

**Decision 3: Desktop Responsive Sizing**
- Applied `md:` breakpoint classes throughout component
- Grid: `sm:grid-cols-2` → `sm:grid-cols-2 md:grid-cols-3` (3 columns on desktop)
- Gap: `gap-2` → `gap-2 md:gap-3` (larger spacing)
- Padding: `p-3` → `p-3 md:p-4` (bubbles), `p-4` → `p-4 md:p-6` (container)
- Text: `text-sm` → `text-sm md:text-base` (all text elements)
- **Alternatives considered**:
  - Inline styles with window.innerWidth checks (rejected - not responsive, violates CLAUDE.md)
  - lg: breakpoint (rejected - md: is optimal for desktop)

### 3) Implementation Notes
**File**: `components/MetricsSelector.tsx`

**New Functions:**
```typescript
// Line 54-62: Toggle metric (add OR remove)
const handleToggleMetric = (metricKey: string) => {
  if (selectedMetrics.includes(metricKey)) {
    onMetricsChange(selectedMetrics.filter(key => key !== metricKey));
  } else if (selectedMetrics.length < maxMetrics) {
    onMetricsChange([...selectedMetrics, metricKey]);
  }
};

// Line 71-81: Add all or clear all
const handleAddOrClearAll = () => {
  const allSelected = availableMetricKeys.every(key => selectedMetrics.includes(key));
  if (allSelected) {
    onMetricsChange([]);
  } else {
    const newMetrics = [...new Set([...selectedMetrics, ...availableMetricKeys])];
    onMetricsChange(newMetrics.slice(0, maxMetrics));
  }
};
```

**UI Changes:**
- Line 102: `allMetricsSelected` computed value for button label
- Line 105: Container padding `p-4 md:p-6`
- Line 108: Header text `text-lg md:text-xl`
- Line 112-118: New "Add All / Clear All" button (purple theme)
- Line 180: Grid `sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3`
- Line 188: Bubble onClick now uses `handleToggleMetric`
- Line 191-193: Selected metrics now show hover state (clickable indicator)
- Line 199: Dynamic title for bubbles based on selection state

**Responsive Classes Added:**
- `md:p-6` (container)
- `md:text-xl` (header)
- `md:text-sm` (buttons)
- `md:text-base` (all content text)
- `md:grid-cols-3` (3-column grid on desktop)
- `md:gap-3` (larger gaps)
- `md:p-4` (bubble padding)

### 4) Testing & Acceptance Criteria
- [x] Toggle: Click unselected metric → adds it ✓
- [x] Toggle: Click selected metric (green) → removes it ✓
- [x] Add All: Shows "Add All" when not all selected ✓
- [x] Add All: Clicking adds all available metrics ✓
- [x] Clear All: Shows "Clear All" when all selected ✓
- [x] Clear All: Clicking removes all metrics ✓
- [x] Desktop: Text/grid/spacing noticeably larger on md+ screens ✓
- [x] Mobile: Sizing unchanged (sm: breakpoints preserved) ✓
- [x] No per-metric buttons added (simple bubble clicks) ✓
- [x] TypeScript: No type errors, full type safety ✓
- [x] Linter: Zero errors ✓

### 5) Performance & Limitations
- Zero performance impact - client-side only, no API changes
- All state management still handled via props (no new global state)
- Responsive classes add ~5KB to generated CSS (negligible)
- Mobile performance unchanged (no additional breakpoints below sm:)

**Limitations:**
- maxMetrics limit (99) still enforced - "Add All" respects this
- Toggle disabled when at max and metric not selected (expected behavior)

### 6) Follow-ups
- Monitor user feedback on 3-column desktop grid (may adjust to 2 if preferred)
- Consider adding keyboard shortcuts (Space/Enter for toggle) in future iteration
- Potential animation on toggle for smoother visual feedback

### 7) Graduated to CLAUDE
- None (UI improvement, not architectural pattern)

### 8) Technical Details
**State Flow:**
- `selectedMetrics: string[]` (parent state)
- `onMetricsChange: (metrics: string[]) => void` (callback)
- Toggle logic: pure function, no side effects
- Add All logic: uses Set for deduplication, slices to maxMetrics

**Visual States:**
- Unselected: Gray background, hover to lighter gray
- Selected: Green background with ✓, hover to lighter green (now clickable!)
- Disabled: Dark gray, cursor-not-allowed (at max limit)
- Add All button: Purple theme, dynamic label

