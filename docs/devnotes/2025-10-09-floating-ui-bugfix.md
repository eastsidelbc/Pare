# Floating UI Bug Fix - React setState During Render

**Date**: 2025-10-09  
**Status**: ✅ Fixed  
**Priority**: HIGH (Blocking)  
**Cross-links**: `docs/devnotes/2025-10-09-floating-ui-migration.md`

---

## 🐛 Bug Description

After implementing Floating UI, encountered React error:
```
Cannot update a component (CompactTeamSelector) while rendering a different component (CompactPanel). 
To locate the bad setState() call inside CompactPanel, follow the stack trace.
```

**Root Cause**: Used `useState` + `useEffect` pattern to pass Floating UI refs between components, causing `setState` to be called during render phase.

---

## ❌ Problematic Pattern

### What We Did Wrong:
```typescript
// In CompactPanel.tsx
const [teamALogoRef, setTeamALogoRef] = useState<...>(null);

<CompactTeamSelector 
  setRefCallback={setTeamALogoRef}  // ← Passes setState
/>

// In CompactTeamSelector.tsx
useEffect(() => {
  if (setRefCallback) {
    setRefCallback(refs.setReference);  // ← Calls setState during render
  }
}, [setRefCallback, refs.setReference]);
```

**Problem**: `useEffect` runs during render phase, calling parent's `setState` → React error.

---

## ✅ Solution

### Pattern Used:
**Moved dropdown logic into CompactPanelHeader** (where logo buttons live), using `useRef` instead of `useState`:

```typescript
// In CompactPanelHeader.tsx
const teamALogoRef = useRef<HTMLButtonElement>(null);
const teamBLogoRef = useRef<HTMLButtonElement>(null);

<button ref={teamALogoRef} onClick={onTeamAClick}>
  <TeamLogo teamName={teamA} size="40" />
</button>

{activeTeamSelector === 'A' && (
  <CompactTeamSelector
    triggerElement={teamALogoRef.current}  // ← Pass ref.current directly
    ...
  />
)}
```

```typescript
// In CompactTeamSelector.tsx
const { refs, floatingStyles, context } = useFloating({
  elements: {
    reference: triggerElement  // ← Use passed element directly
  },
  ...
});
```

**Benefits**:
- ✅ No `setState` during render
- ✅ Refs stay within single component scope
- ✅ Simpler data flow
- ✅ No useEffect needed

---

## 📝 Code Changes

### Files Modified:
1. ✅ `components/mobile/CompactPanel.tsx`
   - Removed `useState` for logo refs
   - Removed `teamALogoRef`/`teamBLogoRef` props to header
   - Added `activeTeamSelector`, `onTeamAChange`, `onTeamBChange`, `allData` props
   - Removed direct rendering of `CompactTeamSelector` components

2. ✅ `components/mobile/CompactPanelHeader.tsx`
   - Added `useRef` hooks for logo buttons
   - Added props: `activeTeamSelector`, `onTeamAChange`, `onTeamBChange`, `allData`
   - Now renders `CompactTeamSelector` components internally
   - Passes `triggerElement` prop to selectors

3. ✅ `components/mobile/CompactTeamSelector.tsx`
   - Changed interface: removed `setRefCallback`, added `triggerElement`
   - Removed `useEffect` that was causing setState during render
   - Uses `elements: { reference: triggerElement }` in `useFloating`
   - Removed `useClick` interaction (not needed, trigger handled separately)

---

## 🎯 Result

✅ **React error completely resolved**  
✅ **Dropdown positioning still works perfectly**  
✅ **All Floating UI benefits preserved**  
✅ **Cleaner component architecture**

---

## 🎓 Key Learning

**Rule**: Never call `setState` during render phase (including via useEffect that runs synchronously).

**Best Practice for Floating UI**:
- Use `useRef` for trigger elements
- Pass `ref.current` as prop
- Use `elements: { reference: element }` in `useFloating`
- Keep trigger and dropdown logic in same component when possible

---

## ✅ Testing

**Verified**:
- ✅ No React errors in console
- ✅ Team logo dropdowns open correctly
- ✅ Positioning works (anchored to logo buttons)
- ✅ Portal rendering works (no clipping)
- ✅ All edge cases still work

---

**Bug Fixed**: 2025-10-09  
**Time to Fix**: ~20 minutes  
**Status**: Production-ready ✅

