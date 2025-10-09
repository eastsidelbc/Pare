# Mobile Dropdown File Map

**Audit Date**: 2025-10-09  
**Branch**: `audit/mobile-dropdowns-2025-10`  
**Scope**: Comprehensive mapping of mobile dropdown system components, hooks, and state flow

---

## 📦 Component Hierarchy

```
MobileCompareLayout (layout wrapper)
  └─ CompactPanel (state manager)
      ├─ CompactPanelHeader (logo triggers + team selectors)
      │   └─ CompactTeamSelector (logo dropdown)
      └─ CompactComparisonRow (metric row)
          └─ CompactRankingDropdown (rank dropdown)
```

---

## 📄 Component Details

### 1. **CompactRankingDropdown.tsx** (283 lines)
**Purpose**: Rank-based team selection dropdown  
**Location**: `components/mobile/CompactRankingDropdown.tsx`

#### Key Sections:
- **Lines 43-77**: Floating UI setup with placement logic
  - `placement: position === 'left' ? 'right-start' : 'left-start'`
  - Middleware: `offset(8)`, `flip()`, `shift()`, `autoUpdate`
  - ⚠️ **No `strategy: 'fixed'`** specified (defaults to 'absolute')
  
- **Lines 176-183**: Trigger button (rank badge)
  - `ref={refs.setReference}` - Floating UI anchor ref
  - `onClick={onToggle}` - Direct click handler (controlled externally)
  
- **Lines 186-278**: Portal-rendered dropdown
  - `<FloatingPortal>` - Renders at document.body
  - **Lines 201-210**: Motion.div with Floating UI positioning
    - `ref={refs.setFloating}`
    - `style={floatingStyles}` - ⚠️ **POTENTIAL BUG**: Framer Motion removed `y` animation, but floatingStyles might be empty on first render
  - **Lines 211-219**: Scrollable content container
    - `maxHeight: 'clamp(416px, 50vh, 468px)'` - 8-9 rows

#### Props:
```typescript
isOpen: boolean           // Controlled externally
onToggle: () => void      // External state control
position: 'left' | 'right' // Team A vs Team B
```

#### State Management:
- **Controlled**: `isOpen`/`onToggle` props from parent
- **No internal state** for open/close
- **Removed `useClick`** from useInteractions (line 85)

#### Floating UI Config:
```typescript
{
  open: isOpen,
  onOpenChange: onToggle,
  placement: position === 'left' ? 'right-start' : 'left-start',
  middleware: [offset(8), flip(), shift()],
  whileElementsMounted: autoUpdate
}
```

---

### 2. **CompactTeamSelector.tsx** (204 lines)
**Purpose**: Logo-triggered alphabetical team selector  
**Location**: `components/mobile/CompactTeamSelector.tsx`

#### Key Sections:
- **Lines 39-57**: Floating UI setup
  - `placement: 'bottom'`
  - `elements: { reference: triggerElement }` - ⚠️ **CRITICAL**: Accepts external trigger element
  - Middleware: same as CompactRankingDropdown
  
- **Lines 110-118**: Motion.div dropdown
  - ⚠️ **BUG FOUND**: Still has `y: -10` animation (line 114)
  - This overrides Floating UI positioning!

#### Props:
```typescript
isOpen: boolean
onToggle: () => void
triggerElement?: HTMLElement | null  // External ref from parent
```

#### Key Difference from CompactRankingDropdown:
- ❌ Does NOT render its own trigger button
- ✅ Receives trigger element from parent
- ⚠️ **Still has Framer Motion `y` animation** (not removed)

---

### 3. **CompactPanel.tsx** (155 lines)
**Purpose**: State manager for dropdowns and team selection  
**Location**: `components/mobile/CompactPanel.tsx`

#### State Management:
```typescript
// Lines 49-52: Ranking dropdown state
const [activeDropdown, setActiveDropdown] = useState<{
  metricKey: string;
  team: 'A' | 'B';
} | null>(null);

// Lines 55: Team selector state
const [activeTeamSelector, setActiveTeamSelector] = useState<'A' | 'B' | null>(null);
```

#### State Flow:
1. **Open ranking dropdown** (line 79-89):
   - Closes team selector
   - Toggles ranking dropdown (same metric+team = close, else open)

2. **Open team selector** (line 92-99):
   - Closes ranking dropdown
   - Toggles team selector

3. **Change team** (lines 66-76):
   - Closes ALL dropdowns
   - Updates team via parent callback

#### ⚠️ **Potential Race Condition**:
- Lines 140-146: `onDropdownToggle` inline function
- Could create new closure on every render
- May cause stale state captures

---

### 4. **CompactPanelHeader.tsx** (121 lines)
**Purpose**: Logo buttons + team selector rendering  
**Location**: `components/mobile/CompactPanelHeader.tsx`

#### Key Sections:
- **Lines 45-46**: Refs for logo buttons
  ```typescript
  const teamALogoRef = useRef<HTMLButtonElement>(null);
  const teamBLogoRef = useRef<HTMLButtonElement>(null);
  ```

- **Lines 58-65**: Team A logo button
  - `ref={teamALogoRef}`
  - `onClick={onTeamAClick}` - Opens team selector

- **Lines 95-104**: Team A selector dropdown
  - Conditionally rendered when `activeTeamSelector === 'A'`
  - `triggerElement={teamALogoRef.current}` - ⚠️ **POTENTIAL NULL**: May be null on first render

- **Lines 107-116**: Team B selector (same pattern)

#### ⚠️ **Potential Issues**:
1. **Ref timing**: `teamALogoRef.current` may be `null` when `CompactTeamSelector` first mounts
2. **Conditional rendering**: Dropdown only renders AFTER state changes, ref might not be ready

---

### 5. **CompactComparisonRow.tsx** (188 lines)
**Purpose**: Metric row with embedded ranking dropdowns  
**Location**: `components/mobile/CompactComparisonRow.tsx`

#### Key Sections:
- **Lines 119-130**: Team A ranking dropdown
  - `isOpen={activeDropdownTeam === 'A'}`
  - `onToggle={() => onDropdownToggle?.('A')}`
  - `position="left"` - Dropdown appears RIGHT

- **Lines 141-151**: Team B ranking dropdown
  - `position="right"` - Dropdown appears LEFT

#### Props Flow:
```typescript
activeDropdownTeam?: 'A' | 'B' | null  // From parent
onDropdownToggle?: (team: 'A' | 'B') => void  // To parent
```

---

### 6. **MobileCompareLayout.tsx** (128 lines)
**Purpose**: Top-level layout wrapper  
**Location**: `components/mobile/MobileCompareLayout.tsx`

#### Layout Structure:
- **Lines 59-65**: Root div with gradient background
- **Lines 70-78**: Scrollable content container
  - ⚠️ **POTENTIAL CLIPPING**: `overflow-y-auto` could clip dropdowns if not using portals
  - Padding for safe areas

#### CSS Properties to Check:
```typescript
overflow-y-auto  // Line 71
paddingTop/Bottom  // Lines 74-75
```

---

## 🎯 Floating UI Integration Points

### Reference Elements (Triggers):
1. **CompactRankingDropdown**: Internal button (line 177)
   - `ref={refs.setReference}`
   - Controlled by component itself ✅

2. **CompactTeamSelector**: External element (line 44)
   - `elements: { reference: triggerElement }`
   - ⚠️ **Depends on parent** passing valid ref

### Floating Elements (Menus):
1. **Both components**:
   - `ref={refs.setFloating}` on motion.div
   - Rendered inside `<FloatingPortal>`
   - ⚠️ **Framer Motion** applies transforms that may conflict

### Portal Targets:
- Both use `<FloatingPortal>` (default: document.body)
- Should escape any `overflow: hidden` ancestors ✅

---

## 🔍 State Management Flow

```
CompactPanel (root state)
  ├─ activeDropdown: { metricKey, team } | null
  ├─ activeTeamSelector: 'A' | 'B' | null
  │
  ├─> CompactPanelHeader
  │     ├─ teamALogoRef (local ref)
  │     ├─ teamBLogoRef (local ref)
  │     └─> CompactTeamSelector
  │           └─ useFloating(triggerElement)
  │
  └─> CompactComparisonRow (per metric)
        ├─> CompactRankingDropdown (Team A)
        │     └─ useFloating(internal ref)
        └─> CompactRankingDropdown (Team B)
              └─ useFloating(internal ref)
```

---

## ⚠️ Potential Issues Identified

### 1. **Framer Motion Conflict** 🔴
- **File**: `CompactTeamSelector.tsx:114`
- **Issue**: `y: -10` animation overrides Floating UI's transform
- **Evidence**: Removed from CompactRankingDropdown but NOT from CompactTeamSelector
- **Impact**: Dropdown appears at (0, 0) until animation completes

### 2. **Ref Timing** 🟡
- **File**: `CompactPanelHeader.tsx:102, 114`
- **Issue**: `triggerElement={teamALogoRef.current}` may be null on first render
- **Impact**: Floating UI can't position dropdown without reference element

### 3. **Missing `strategy: 'fixed'`** 🟡
- **Files**: Both dropdown components
- **Issue**: Defaults to `position: absolute`
- **Impact**: May not escape scrollable containers properly

### 4. **Inline Closure** 🟡
- **File**: `CompactPanel.tsx:140-146`
- **Issue**: `onDropdownToggle` inline function recreated every render
- **Impact**: May cause unnecessary re-renders or stale closures

### 5. **Overflow Clipping** 🟡
- **File**: `MobileCompareLayout.tsx:71`
- **Issue**: `overflow-y-auto` on scroll container
- **Impact**: Should be fine with portals, but worth verifying

---

## 📊 Grep Results Summary

### Floating UI Usage:
```bash
useFloating:     2 instances (CompactRankingDropdown, CompactTeamSelector)
FloatingPortal:  2 instances (both dropdowns)
autoUpdate:      2 instances (both use whileElementsMounted)
strategy:        0 instances ⚠️ (not explicitly set)
```

### State Management:
```bash
isOpen:          4 props (2 components × 2 instances)
setOpen:         0 (using onToggle instead)
activeDropdown:  1 state (CompactPanel)
activeTeamSelector: 1 state (CompactPanel)
```

### CSS Properties:
```bash
overflow-hidden: 1 (dropdown content, line 209)
overflow-y-auto: 2 (MobileCompareLayout:71, dropdown scroll:212)
position:        Many (Tailwind utilities)
transform:       2 (Framer Motion animations)
z-index:         Multiple (z-40 backdrop, z-50 dropdown)
```

---

## 🧪 Next Steps

1. **Instrument with debug traces** (see debug/traceDropdown.ts)
2. **Run repro matrix** on 320-428px widths
3. **Capture evidence** of ref timing, animation conflicts
4. **Create race matrix** with hypothesis → evidence → confidence
5. **Document findings** with exact line pointers

---

**Last Updated**: 2025-10-09  
**Status**: Mapping Complete ✅ | Ready for Instrumentation

