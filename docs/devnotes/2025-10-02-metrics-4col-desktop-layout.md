---
Title: Metrics Selector 4-Column Desktop Layout
Date: 2025-10-02
Owner: Jeremy
Versions Affected: 1.0.x
Links:
  - CLAUDE Section: CLAUDE.md#code-standards-patterns
  - Component: components/MetricsSelector.tsx
  - Previous: docs/devnotes/2025-10-02-metrics-fullwidth-cleanup.md
---

**Normative rules live in CLAUDE.md. This note records implementation details and rationale.**

### 1) Context & Goal
Following full-width desktop implementation, refine layout for better space utilization:
1. **4 columns on desktop** (≥1024px) instead of 3
2. **Smaller, denser cards** on desktop only (reduce padding, font sizes)
3. **Row alignment** via min-height and text clamping

### 2) Decisions & Alternatives

**Decision 1: 4-Column Grid at lg: Breakpoint**
- **Problem**: 3 columns wasted horizontal space on desktop (≥1024px)
- **Solution**: Add `lg:grid-cols-4` to grid container
- **Breakpoint Strategy**:
  - Mobile (<640px): 1 column
  - Small (640-768px): 2 columns
  - Medium (768-1024px): 3 columns
  - Large (≥1024px): **4 columns** ✅
- **Gap Scaling**: `gap-2` (mobile) → `md:gap-3` → `lg:gap-4` (1rem on desktop)
- **Alternatives considered**:
  - 5 columns on xl: (rejected - cards too narrow, poor readability)
  - Keep 3 columns (rejected - wasted space on modern screens)

**Decision 2: Reduced Card Padding/Fonts**
- **Problem**: Desktop cards were too large, wasting vertical space
- **Solution**: Scale down padding and fonts at md/lg breakpoints
  - Padding: `p-3 md:p-4` → `p-3 md:p-3` (consistent 0.75rem)
  - Title: `text-sm md:text-base` → `text-sm md:text-sm` (keep small)
  - Subtitle/Description: `text-xs md:text-sm` → `text-xs md:text-xs` (keep extra small)
- **Result**: More metrics visible per screen, better information density
- **Alternatives considered**:
  - Keep larger sizes (rejected - too much whitespace)
  - Use lg: for size changes (rejected - md: is sufficient)

**Decision 3: Min-Height for Row Alignment**
- **Problem**: Variable content heights caused uneven rows, poor visual rhythm
- **Solution**: Apply `min-h-[120px] md:min-h-[110px] lg:min-h-[105px]`
  - Mobile: 120px (more content per card)
  - Medium: 110px (slight reduction)
  - Large: 105px (tightest for 4-col grid)
- **Result**: Cards in same row align top and bottom, cleaner grid appearance
- **Alternatives considered**:
  - Flexbox with align-stretch (rejected - doesn't handle variable content well)
  - Taller min-heights (rejected - defeats density goal)

**Decision 4: Text Clamping**
- **Problem**: Long metric names/descriptions broke row alignment
- **Solution**: 
  - Title: `line-clamp-1` (truncate to 1 line with ellipsis)
  - Description: `line-clamp-2` (truncate to 2 lines with ellipsis)
- **Result**: Predictable card heights, consistent row alignment
- **Alternatives considered**:
  - `overflow-hidden text-ellipsis whitespace-nowrap` (rejected - only works for single line)
  - No truncation (rejected - breaks alignment and wastes space)

### 3) Implementation Notes

**File**: `components/MetricsSelector.tsx`

**Change 1: Grid Container (Line 171)**
```typescript
// Before:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">

// After:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
```
- Added `lg:grid-cols-4` for 4-column desktop layout
- Added `lg:gap-4` for 1rem gap on large screens

**Change 2: Card Button Styles (Lines 182-183)**
```typescript
// Before:
text-left p-3 md:p-4 rounded-lg border text-sm md:text-base transition-all

// After:
text-left p-3 md:p-3 rounded-lg border text-sm md:text-sm transition-all
min-h-[120px] md:min-h-[110px] lg:min-h-[105px]
```
- Changed `md:p-4` → `md:p-3` (consistent padding)
- Changed `md:text-base` → `md:text-sm` (smaller desktop font)
- Added responsive min-heights for row alignment

**Change 3: Title Line Clamping (Line 193)**
```typescript
// Before:
<div className="font-medium">

// After:
<div className="font-medium line-clamp-1">
```
- Added `line-clamp-1` to truncate long titles

**Change 4: Subtitle Font Size (Line 196)**
```typescript
// Before:
<div className="text-xs md:text-sm opacity-70 mt-1">

// After:
<div className="text-xs md:text-xs opacity-70 mt-1">
```
- Changed `md:text-sm` → `md:text-xs` for consistency

**Change 5: Description Line Clamping (Line 200)**
```typescript
// Before:
<div className="text-xs md:text-sm opacity-60 mt-1">

// After:
<div className="text-xs md:text-xs opacity-60 mt-1 line-clamp-2">
```
- Changed `md:text-sm` → `md:text-xs` for smaller text
- Added `line-clamp-2` to truncate long descriptions

### 4) Testing & Acceptance Criteria
- [x] Large screens (≥1024px): Shows 4 columns consistently ✓
- [x] Medium screens (768-1024px): Shows 3 columns (unchanged) ✓
- [x] Small screens (640-768px): Shows 2 columns (unchanged) ✓
- [x] Mobile (<640px): Shows 1 column (unchanged) ✓
- [x] Desktop cards: Smaller padding (0.75rem, not 1rem) ✓
- [x] Desktop fonts: text-sm/text-xs (not text-base) ✓
- [x] Row alignment: Min-heights applied, cards align ✓
- [x] Text clamping: Titles 1 line, descriptions 2 lines max ✓
- [x] No behavior changes: Toggle, Add All/Clear All work ✓
- [x] TypeScript: Zero errors ✓
- [x] Linter: Zero errors ✓

### 5) Performance & Limitations
- Zero performance impact - CSS-only changes
- Better information density on desktop (more metrics visible per scroll)
- Improved visual rhythm with consistent row heights

**Improvements:**
- Desktop: 3 cols → 4 cols = **33% more metrics per row**
- Viewport utilization: Better use of modern widescreen displays
- Visual consistency: Min-height + text clamping = aligned rows

**Limitations:**
- Text clamping may hide full metric names/descriptions (hover shows full text via title attribute)
- Very long metric names may be truncated (acceptable tradeoff for density)
- Fixed min-heights may cause extra whitespace for short content (acceptable for alignment)

### 6) Follow-ups
- Monitor user feedback on 4-column density (may adjust min-heights if too cramped)
- Consider tooltip component for full text on hover (instead of native title)
- Potential future: User preference for grid density (2/3/4 columns)

### 7) Graduated to CLAUDE
- None (UI density optimization, not architectural pattern)

### 8) Visual Comparison

**Before (3 columns):**
```
Desktop View (≥1024px)
┌─────────┬─────────┬─────────┬─────────┐
│ Metric1 │ Metric2 │ Metric3 │         │ ← Wasted space
│ Tall    │ Short   │ Medium  │         │
│ Card    │ Card    │ Card    │         │
├─────────┼─────────┼─────────┤         │
│ Metric4 │ Metric5 │ Metric6 │         │
│ Short   │ Tall    │ Short   │         │ ← Unaligned rows
│ Card    │ Card    │ Card    │         │
│         │ Extra   │         │         │
└─────────┴─────────┴─────────┴─────────┘
```

**After (4 columns):**
```
Desktop View (≥1024px)
┌─────────┬─────────┬─────────┬─────────┐
│ Metric1 │ Metric2 │ Metric3 │ Metric4 │ ← Full width
│ Title…  │ Title…  │ Title…  │ Title…  │ ← Clamped
│ Desc... │ Desc... │ Desc... │ Desc... │ ← Clamped
│ (105px) │ (105px) │ (105px) │ (105px) │ ← Aligned
├─────────┼─────────┼─────────┼─────────┤
│ Metric5 │ Metric6 │ Metric7 │ Metric8 │
│ Title…  │ Title…  │ Title…  │ Title…  │
│ Desc... │ Desc... │ Desc... │ Desc... │
│ (105px) │ (105px) │ (105px) │ (105px) │ ← Perfect alignment
└─────────┴─────────┴─────────┴─────────┘
```

### 9) Technical Details

**Responsive Grid Strategy:**
| Breakpoint | Width | Columns | Gap | Padding | Font |
|------------|-------|---------|-----|---------|------|
| Mobile | <640px | 1 | 0.5rem | 0.75rem | text-sm |
| sm | 640-768px | 2 | 0.5rem | 0.75rem | text-sm |
| md | 768-1024px | 3 | 0.75rem | 0.75rem | text-sm |
| lg | ≥1024px | **4** | **1rem** | **0.75rem** | **text-sm** |

**Text Clamping Utility:**
- `line-clamp-1` = `-webkit-line-clamp: 1` + `display: -webkit-box`
- `line-clamp-2` = `-webkit-line-clamp: 2` + `display: -webkit-box`
- Tailwind plugin required: `@tailwindcss/line-clamp` (or built-in v3.3+)

**Min-Height Calculation:**
- Mobile: 120px (base + breathing room)
- Medium: 110px (-10px for density)
- Large: 105px (-5px more for 4-col tightness)
- Based on: Title (1 line) + Subtitle (1 line) + Description (2 lines) + padding

**Space Utilization Improvement:**
- Before: 3 cols × ~33% width = 99% used (1% gap)
- After: 4 cols × ~25% width = 100% used (efficient)
- Metrics per screen: +33% (e.g., 12 → 16 visible metrics)

