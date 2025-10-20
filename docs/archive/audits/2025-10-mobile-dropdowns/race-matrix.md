# Race Condition & Conflict Matrix

**Audit Date**: 2025-10-09  
**Branch**: `audit/mobile-dropdowns-2025-10`  
**Format**: Symptom → Hypothesis → Evidence → Code Pointer → Confidence

---

## 🔴 **Critical Issues**

### Issue #1: Framer Motion Y-Transform Override
**Symptom**: Dropdown appears at (0, 0) top-left corner  
**Observed**: User console shows `top: 0px, left: 0px, transform: translate(0px, 0px)` initially

**Hypothesis**: Framer Motion's `y: -10` animation overrides Floating UI's transform positioning

**Evidence**:
1. `CompactTeamSelector.tsx:114-116` still has:
   ```typescript
   initial={{ opacity: 0, scale: 0.95, y: -10 }}
   animate={{ opacity: 1, scale: 1, y: 0 }}
   exit={{ opacity: 0, scale: 0.95, y: -10 }}
   ```

2. User console log showed:
   - Initial: `transform: "translate(0px, 0px)"`
   - Then updated to: `transform: "translate(95px, 143px)"`
   - This indicates Framer Motion resets transform before Floating UI applies correct values

3. `CompactRankingDropdown.tsx:205-207` had `y` animation **removed** (fixed in previous iteration)
4. But `CompactTeamSelector` was **not updated** - still has the conflicting animation

**Code Pointers**:
- ❌ `CompactTeamSelector.tsx:114-116` - HAS `y` animation
- ✅ `CompactRankingDropdown.tsx:205-207` - `y` animation REMOVED

**Root Cause**:
Framer Motion applies inline styles with `transform` property. When `y: -10` is set initially, it creates `translateY(-10px)`. When animated to `y: 0`, it resets to `translateY(0px)`. This **overrides** Floating UI's `floatingStyles.transform` which contains `translate(Xpx, Ypx)` for proper positioning.

**Confidence**: 🔴 **CRITICAL - 95%**  
This is the primary root cause of the (0,0) positioning bug.

---

### Issue #2: floatingStyles Empty on First Render
**Symptom**: Dropdown flashes at (0, 0) before jumping to correct position

**Hypothesis**: Floating UI hasn't calculated position when component first renders

**Evidence**:
1. User's console log (from previous debugging):
   ```
   floatingStyles: {
     left: 0,
     top: 0,
     transform: "translate(0px, 0px)"  // Initial
   }
   ```
   Then updated to:
   ```
   transform: "translate(95px, 143px)"  // After calculation
   ```

2. Floating UI requires:
   - Reference element to be rendered
   - `getBoundingClientRect()` to be called
   - Middleware to run (offset, flip, shift)
   - Only then `floatingStyles` is populated

3. React render order:
   ```
   1. Component renders → refs.setReference attached
   2. useLayoutEffect runs → Floating UI calculates position
   3. Component re-renders → floatingStyles updated
   ```

**Code Pointers**:
- `CompactRankingDropdown.tsx:203` - `style={floatingStyles}` applied immediately
- `CompactTeamSelector.tsx:112` - Same issue
- Both rely on `useFloating` hook which populates `floatingStyles` asynchronously

**Timing Diagram**:
```
Render 1: isOpen=true → floatingStyles={} → dropdown at (0,0)
          ↓
Layout Effect: Floating UI calculates → floatingStyles={top:143, left:95}
          ↓
Render 2: dropdown repositions → visible jump
```

**Confidence**: 🟡 **HIGH - 80%**  
This is a secondary issue. Normally not visible, but Framer Motion's `y` animation **extends** the visibility of the (0,0) state.

---

### Issue #3: Ref Timing - triggerElement NULL
**Symptom**: Team selector dropdown may appear at wrong position

**Hypothesis**: `triggerElement` passed to `CompactTeamSelector` is null when component first mounts

**Evidence**:
1. `CompactPanelHeader.tsx:45-46` creates refs:
   ```typescript
   const teamALogoRef = useRef<HTMLButtonElement>(null);
   const teamBLogoRef = useRef<HTMLButtonElement>(null);
   ```

2. `CompactPanelHeader.tsx:102, 114` passes ref.current:
   ```typescript
   triggerElement={teamALogoRef.current}  // May be null!
   ```

3. React ref lifecycle:
   - Refs are populated **after** first render
   - If dropdown renders **before** ref is attached, `triggerElement` is null

4. Conditional rendering pattern:
   ```typescript
   {activeTeamSelector === 'A' && (
     <CompactTeamSelector triggerElement={teamALogoRef.current} />
   )}
   ```
   
   This renders dropdown AFTER state change, but ref should already be populated from button render. **However**, there's a race:
   - User clicks logo → state updates → dropdown renders
   - If button ref hasn't attached yet (unlikely but possible), triggerElement is null

**Code Pointers**:
- `CompactPanelHeader.tsx:102, 114` - Passes `ref.current` which may be null
- `CompactTeamSelector.tsx:44` - `elements: { reference: triggerElement }`
- Debug trace at `CompactTeamSelector.tsx:80-82` checks for null

**Confidence**: 🟡 **MEDIUM - 60%**  
Low probability (ref should be populated by click time), but possible in edge cases (fast state changes, HMR).

---

## 🟡 **Potential Issues**

### Issue #4: Missing `strategy: 'fixed'`
**Symptom**: Dropdown may not escape scrollable containers

**Hypothesis**: Default `position: absolute` doesn't work well with `FloatingPortal`

**Evidence**:
1. Neither component specifies `strategy: 'fixed'` in `useFloating()` config
2. Floating UI docs recommend `strategy: 'fixed'` when using portals
3. Default is `position: absolute` which calculates position relative to offset parent
4. `FloatingPortal` renders at `document.body`, but absolute positioning may still reference wrong parent

**Code Pointers**:
- `CompactRankingDropdown.tsx:60-77` - No `strategy` specified
- `CompactTeamSelector.tsx:39-57` - No `strategy` specified

**Expected Fix**:
```typescript
useFloating({
  strategy: 'fixed',  // Add this
  open: isOpen,
  // ...
})
```

**Why This Matters**:
- `position: absolute` → calculated from offset parent (first positioned ancestor)
- `position: fixed` → calculated from viewport (works better with portals)
- With `FloatingPortal` rendering at body level, `fixed` is more reliable

**Confidence**: 🟡 **MEDIUM - 50%**  
May not cause visible bugs (portals usually work), but not following best practices.

---

### Issue #5: Inline Closure Recreation
**Symptom**: Potential unnecessary re-renders or stale state

**Hypothesis**: `onDropdownToggle` inline function creates new closure every render

**Evidence**:
1. `CompactPanel.tsx:140-146`:
   ```typescript
   onDropdownToggle={(team) => {
     if (activeDropdown?.metricKey === metricKey && activeDropdown?.team === team) {
       setActiveDropdown(null);
     } else {
       setActiveDropdown({ metricKey, team });
       setActiveTeamSelector(null);
     }
   }}
   ```

2. This function is recreated every render of `CompactPanel`
3. Passed as prop to `CompactComparisonRow`, which passes to `CompactRankingDropdown`
4. May cause:
   - Unnecessary re-renders of child components
   - Stale closure over `activeDropdown` if captured incorrectly

**Code Pointers**:
- `CompactPanel.tsx:140-146` - Inline function in JSX
- Passed through: `CompactPanel` → `CompactComparisonRow` → `CompactRankingDropdown`

**Better Pattern**:
```typescript
const handleDropdownToggle = useCallback((metricKey: string, team: 'A' | 'B') => {
  // ...
}, [activeDropdown, setActiveDropdown, setActiveTeamSelector]);
```

**Confidence**: 🟢 **LOW - 30%**  
Likely not causing the current bug, but could cause performance issues or subtle state bugs.

---

## 🟢 **Ruled Out**

### ❌ Not Using Portal
**Status**: ✅ **CLEAR**  
Both components use `<FloatingPortal>` correctly (lines 186, 95).

### ❌ Missing autoUpdate
**Status**: ✅ **CLEAR**  
Both components use `whileElementsMounted: autoUpdate` (lines 76, 56).

### ❌ Parent Overflow Clipping
**Status**: ✅ **CLEAR**  
`MobileCompareLayout` has `overflow-y-auto`, but portals render at body level, escaping clipping.

### ❌ Double-Open State
**Status**: ✅ **CLEAR**  
Single state source in `CompactPanel`. Proper mutual exclusion logic (lines 79-99).

### ❌ Z-Index Stacking Context
**Status**: ✅ **CLEAR**  
Dropdown uses `z-50`, backdrop uses `z-40`. No competing stacking contexts found.

---

## 🎯 Summary Table

| # | Issue | Type | Confidence | Fixed? |
|---|-------|------|------------|--------|
| 1 | Framer Motion `y` override | Race Condition | 🔴 95% | ❌ No |
| 2 | Empty floatingStyles | Timing | 🟡 80% | ❌ No |
| 3 | NULL triggerElement | Ref Timing | 🟡 60% | ❌ No |
| 4 | Missing `strategy: 'fixed'` | Config | 🟡 50% | ❌ No |
| 5 | Inline closure recreation | Performance | 🟢 30% | ❌ No |

---

## 📋 Fix Priority

1. **CRITICAL**: Remove `y` animation from `CompactTeamSelector.tsx:114-116`
2. **HIGH**: Add `strategy: 'fixed'` to both useFloating configs
3. **MEDIUM**: Add initial positioning guard (render dropdown off-screen until floatingStyles populated)
4. **LOW**: Refactor inline closures to useCallback
5. **LOW**: Add ref null check before passing to triggerElement

---

**Last Updated**: 2025-10-09  
**Status**: Analysis Complete ✅ | Ready for Implementation

