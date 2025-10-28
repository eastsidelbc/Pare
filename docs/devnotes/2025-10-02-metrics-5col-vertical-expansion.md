---
Title: Metrics Selector 5-Column Grid & Vertical Expansion
Date: 2025-10-02
Owner: Jeremy
Versions Affected: 1.0.x
Links:
  - CLAUDE Section: CLAUDE.md#code-standards-patterns
  - Components: components/MetricsSelector.tsx, components/FloatingMetricsButton.tsx
  - Previous: docs/devnotes/2025-10-02-metrics-4col-desktop-layout.md
---

**Normative rules live in CLAUDE.md. This note records implementation details and rationale.**

### 1) Context & Goal
Two final density/UX improvements requested:
1. **5 columns on extra-large screens** (≥1280px) instead of 4
2. **Expand panel vertically** to 75% of viewport height (leaving 25% gap from top)

### 2) Decisions & Alternatives

**Decision 1: 5-Column Grid at xl: Breakpoint**
- **Problem**: 4 columns still had unused horizontal space on very wide screens (≥1280px)
- **Solution**: Add `xl:grid-cols-5` to grid container
- **Breakpoint Strategy**:
  - Mobile (<640px): 1 column
  - Small (640-768px): 2 columns
  - Medium (768-1024px): 3 columns
  - Large (1024-1280px): 4 columns
  - Extra-Large (≥1280px): **5 columns** ✅
- **Result**: +25% more metrics per row on ultra-wide displays
- **Alternatives considered**:
  - 6 columns on 2xl (rejected - cards too narrow even on large monitors)
  - Keep 4 columns max (rejected - wastes modern widescreen real estate)

**Decision 2: Vertical Panel Expansion (75vh)**
- **Problem**: Panel was bottom-anchored with limited height, required excessive scrolling
- **Solution**: 
  - Position: `bottom-20` → `top-[25vh] bottom-4` (75% viewport coverage)
  - Container: Add `h-full flex flex-col` (fill available space)
  - Scroll area: `max-h-[32rem]` → `flex-1` (expand to fill parent)
- **Visual Layout**:
  ```
  ┌─────────────────┐
  │  Top 25% gap    │ ← Page header/content visible
  ├─────────────────┤
  │                 │
  │  Metrics Panel  │ ← 75% of viewport
  │  (scrollable)   │
  │                 │
  └─────────────────┘
  ```
- **Result**: Far more metrics visible without scrolling, better use of vertical space
- **Alternatives considered**:
  - 80vh/90vh heights (rejected - too aggressive, covers too much page)
  - 60vh height (rejected - too conservative, still lots of scrolling)
  - Full screen modal (rejected - too intrusive)

### 3) Implementation Notes

**File 1: `components/MetricsSelector.tsx`**

**Change: Add xl:grid-cols-5 (Line 171)**
```typescript
// Before:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">

// After:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3 lg:gap-4">
```

**File 2: `components/FloatingMetricsButton.tsx`**

**Change 1: Vertical positioning (Line 64)**
```typescript
// Before:
className="fixed bottom-20 inset-x-4 md:inset-x-8 lg:inset-x-12 z-50"

// After:
className="fixed top-[25vh] bottom-4 inset-x-4 md:inset-x-8 lg:inset-x-12 z-50"
```
- `top-[25vh]` = start 25% down from top of viewport
- `bottom-4` = extend to 4px from bottom (1rem margin)
- Net result: Panel spans 75% of viewport height

**Change 2: Container flex layout (Line 68)**
```typescript
// Before:
className="bg-slate-900/95 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-2xl p-4"

// After:
className="bg-slate-900/95 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-2xl p-4 h-full flex flex-col"
```
- `h-full` = fill parent height (75vh)
- `flex flex-col` = vertical flex layout for children

**Change 3: Scrollable area expansion (Line 124)**
```typescript
// Before:
<div className="max-h-[32rem] overflow-y-auto momentum-scroll">

// After:
<div className="flex-1 overflow-y-auto momentum-scroll">
```
- `flex-1` = grow to fill available space in flex container
- Removes fixed `max-h-[32rem]` constraint
- Now expands to fill ~70vh of space (after header/tabs/footer)

### 4) Testing & Acceptance Criteria
- [x] Extra-large screens (≥1280px): Shows 5 columns ✓
- [x] Large screens (1024-1280px): Shows 4 columns (unchanged) ✓
- [x] Medium/small/mobile: 3/2/1 columns (unchanged) ✓
- [x] Panel height: 75% of viewport (25% gap from top) ✓
- [x] Scrollable area: Expands to fill available space ✓
- [x] Header/tabs/footer: Still visible and functional ✓
- [x] No layout breaking on any screen size ✓
- [x] TypeScript: Zero errors ✓
- [x] Linter: Zero errors ✓

### 5) Performance & Limitations
- Zero performance impact - CSS-only changes
- Dramatically improved information density on wide/tall screens
- Reduced scrolling needed to see all metrics

**Improvements:**
- Ultra-wide displays: 4 cols → 5 cols = **+25% metrics per row**
- Vertical space: ~32rem (512px) → ~75vh (~800px on typical screen) = **~50% more visible content**
- Combined: Up to **+87% more metrics visible** on 1440p+ displays

**Limitations:**
- 5 columns requires ≥1280px width (acceptable - targets modern displays)
- 75vh height may feel large on very small laptop screens (acceptable - users can close panel)
- On ultra-wide screens (>2000px), 5 columns still shows some empty space (could add 2xl:grid-cols-6 in future)

### 6) Follow-ups
- Monitor user feedback on 5-column density (may adjust card min-height if too cramped)
- Consider adding 2xl:grid-cols-6 for 4K/5K displays (≥1536px)
- Potential future: Adjustable panel height (user draggable resize)

### 7) Graduated to CLAUDE
- None (UI density optimization)

### 8) Visual Comparison

**Column Progression:**
| Breakpoint | Width | Columns | Metrics/Row Increase |
|------------|-------|---------|----------------------|
| Mobile | <640px | 1 | baseline |
| sm | 640-768px | 2 | +100% |
| md | 768-1024px | 3 | +50% |
| lg | 1024-1280px | 4 | +33% |
| **xl** | **≥1280px** | **5** | **+25%** ✅ |

**Vertical Space:**
```
Before (bottom-anchored, ~512px max):
┌─────────────────────────┐
│                         │
│   Page Content          │
│                         │
│                         │
│                         │
├─────────────────────────┤
│  Metrics Panel (small)  │ ← ~30% of viewport
│  [lots of scrolling]    │
└─────────────────────────┘

After (75vh):
┌─────────────────────────┐
│  Page Top (25%)         │
├─────────────────────────┤
│                         │
│  Metrics Panel          │ ← 75% of viewport
│  (expansive)            │
│  [minimal scrolling]    │
│                         │
│                         │
└─────────────────────────┘
```

### 9) Technical Details

**Grid Responsiveness:**
```css
/* Compiled CSS classes */
grid-cols-1           /* 1 column: all screens */
sm:grid-cols-2        /* 2 columns: ≥640px */
md:grid-cols-3        /* 3 columns: ≥768px */
lg:grid-cols-4        /* 4 columns: ≥1024px */
xl:grid-cols-5        /* 5 columns: ≥1280px */
```

**Viewport Height Calculation:**
- `top-[25vh]` = 25% from top
- `bottom-4` = 16px from bottom
- Panel height = 100vh - 25vh - 16px ≈ **74.8vh**
- Usable scroll area ≈ 70vh (after header/tabs/footer padding)

**Flexbox Layout:**
```
┌─ .h-full .flex .flex-col ────┐
│  Header (fixed)              │
│  Tabs (fixed)                │
│  ┌─ .flex-1 .overflow-auto ─┐│
│  │ Scrollable Metrics       ││ ← Expands to fill
│  │ (Categories + Grid)      ││
│  └──────────────────────────┘│
│  Footer (fixed)              │
└──────────────────────────────┘
```

**Metric Density Math (1440p display):**
- Before: 4 cols × ~4 rows visible = **16 metrics**
- After: 5 cols × ~6 rows visible = **30 metrics**
- Improvement: **+87.5% more metrics visible** without scrolling

