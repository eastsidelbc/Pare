# Mobile Dropdown Testing Guide

**Branch**: `fix/mobile-dropdowns-floatingui`  
**Date**: 2025-10-09  
**Status**: Phase 3 - Ready for Testing

---

## 🧪 **Test Environment Setup**

### 1. Enable Debug Mode:
```bash
# Add to .env.local:
NEXT_PUBLIC_DEBUG_UI=1
```

### 2. Start Dev Server:
```bash
npm run dev
```

### 3. Open DevTools:
- Press F12
- Go to Console tab
- Set responsive mode to mobile

---

## 📋 **Test Matrix (Must Pass All)**

### Test 1: Team A Ranking Dropdown - Top Row
**Setup**: 320px width, Offense panel, top metric  
**Actions**:
1. Click Team A rank badge (30th, 15th, etc.)
2. Observe dropdown opens **to the right** of badge
3. Check console logs

**Expected**:
- ✅ Dropdown anchors to rank badge
- ✅ Opens to the RIGHT (position: 'right-start')
- ✅ NO flash at (0, 0)
- ✅ Console shows:
  ```
  [UI XX:XX:XX.XXX] dropdown:open { side: 'teamA', placement: 'right-start' }
  [UI XX:XX:XX.XXX] ref:teamA { x: ~45, y: ~130 }  ← NOT (0,0)!
  [UI XX:XX:XX.XXX] menu:teamA:after-update { x: ~95, y: ~143 }  ← NOT (0,0)!
  ```

---

### Test 2: Team B Ranking Dropdown - Top Row
**Setup**: 320px width, Offense panel, top metric  
**Actions**:
1. Click Team B rank badge (right side)
2. Observe dropdown opens **to the left** of badge
3. Verify stays within viewport

**Expected**:
- ✅ Dropdown anchors to rank badge
- ✅ Opens to the LEFT (position: 'left-start')
- ✅ Clamped inside viewport (no horizontal overflow)
- ✅ Console shows `side: 'teamB'`, non-zero x,y

---

### Test 3: Defense Bottom Row (Team A)
**Setup**: 375px width, Defense panel, bottom metric  
**Actions**:
1. Scroll to bottom of Defense panel
2. Click Team A rank badge on **bottom-most metric**
3. Check if dropdown flips above when no space below
4. Scroll dropdown content, verify all 32+ teams visible

**Expected**:
- ✅ Menu flips ABOVE if no space below (Floating UI auto-flip)
- ✅ At least 6-8 items visible initially
- ✅ List scrolls smoothly
- ✅ Last items (e.g., "Tennessee Titans") reachable
- ✅ Not hidden under bottom bar

---

### Test 4: Landscape Mode
**Setup**: Rotate to landscape (667x375 or similar)  
**Actions**:
1. Repeat Tests 1-3 in landscape orientation
2. Verify dropdowns still anchor correctly
3. Check viewport clamping

**Expected**:
- ✅ All dropdowns work in landscape
- ✅ No clipping or overflow
- ✅ Console logs still show correct positions

---

### Test 5: Scroll Tracking (autoUpdate)
**Setup**: 375px width, any panel  
**Actions**:
1. Open Team A ranking dropdown
2. While open, scroll the panel up/down
3. Observe dropdown repositions

**Expected**:
- ✅ Dropdown tracks badge position during scroll
- ✅ No visual lag or jump
- ✅ autoUpdate working correctly

---

### Test 6: Team Logo Selectors
**Setup**: 428px width  
**Actions**:
1. Click Team A logo (top-left of panel header)
2. Observe team selector dropdown opens
3. Repeat for Team B logo (top-right)

**Expected**:
- ✅ Dropdown anchors next to logo
- ✅ No flash at (0, 0)
- ✅ Clamped within viewport
- ✅ Console shows `team-selector:open`, `triggerElement: 'present'`
- ✅ ❌ NO ERROR: `'triggerElement is NULL'`

---

## 📊 **Console Verification**

### What to Look For:

#### ✅ **GOOD** (Passing):
```
[UI 16:23:45.123] dropdown:open { side: 'teamA', currentTeam: 'Kansas City Chiefs', placement: 'right-start' }
[UI 16:23:45.124] floating:state { floatingStyles: { position: 'fixed', top: 143, left: 95, transform: '...' } }
[UI 16:23:45.125] ref:teamA { x: 45, y: 130, w: 24, h: 16 }
[UI 16:23:45.126] menu:teamA:before-update { x: 95, y: 143, w: 280, h: 420 }
[UI 16:23:45.142] menu:teamA:after-update { x: 95, y: 143, w: 280, h: 420 }
```

#### ❌ **BAD** (Failing):
```
[UI 16:23:45.126] menu:teamA:before-update { x: 0, y: 0 }  ← FAIL! At (0,0)!
[UI 16:23:45.127] team-selector:ERROR 'triggerElement is NULL'  ← FAIL! Ref timing!
```

---

## 🔍 **Visual Inspection Checklist**

### Positioning:
- [ ] Dropdown appears **next to** trigger (badge/logo), not at top-left
- [ ] Team A dropdowns open to the **right**
- [ ] Team B dropdowns open to the **left**
- [ ] Bottom row dropdowns **flip above** when needed

### Clipping:
- [ ] No clipping by Offense/Defense panel divider
- [ ] Dropdown overlays cleanly with proper z-index
- [ ] Content not cut off by bottom navigation bar
- [ ] Safe area padding applied (visible space at bottom)

### Animation:
- [ ] No first-frame jump to (0, 0)
- [ ] Smooth fade-in (opacity + scale)
- [ ] Opens/closes at 60fps (no jank)
- [ ] Backdrop fades in/out smoothly

### Scrolling:
- [ ] Panel scroll is **locked** when dropdown open (body scroll lock)
- [ ] Dropdown content scrolls independently
- [ ] Last items (32nd team) fully visible and tappable
- [ ] No overscroll bounce on dropdown

---

## 🐛 **Known Issues to Verify Fixed**

### Issue #1: (0, 0) Flash
**Before**: Dropdown flashed at top-left corner  
**After**: Should appear instantly at correct position  
**How to Verify**: Watch dropdown open animation, no jump from corner

### Issue #2: Team B Off-Screen
**Before**: Team B dropdowns ran off-screen to the right  
**After**: Should clamp within viewport  
**How to Verify**: Open Team B dropdown at 320px width, no horizontal scroll

### Issue #3: Bottom Row Cut Off
**Before**: Bottom row dropdown showed only 2-3 items  
**After**: Should flip above or show 6-8 items with scroll  
**How to Verify**: Open bottom Defense row dropdown, see multiple teams

### Issue #4: Divider Clipping
**Before**: Dropdown clipped by panel overflow-hidden  
**After**: Dropdown renders in portal, no clipping  
**How to Verify**: Open dropdown, verify full height visible

### Issue #5: Ref Null Error
**Before**: "triggerElement is NULL" console error  
**After**: Should guard with conditional render  
**How to Verify**: Check console, no ERROR logs

---

## ✅ **Acceptance Criteria**

All must be TRUE:

1. ✅ Menus anchor to badges/logos on the correct side (A→right, B→left)
2. ✅ Flip/shift middleware keeps dropdowns on-screen
3. ✅ No clipping by panel dividers
4. ✅ Bottom row opens with enough height and full scrollability
5. ✅ No first-frame jump to (0, 0)
6. ✅ Smooth 60fps open/close
7. ✅ Body scroll locked when dropdown open
8. ✅ Safe area padding at bottom
9. ✅ Console logs show non-zero x,y coordinates
10. ✅ No "triggerElement is NULL" errors

---

## 📸 **Screenshot Checklist**

Capture for documentation:

- [ ] Team A dropdown (right placement)
- [ ] Team B dropdown (left placement)
- [ ] Bottom row flipped above
- [ ] Team logo selector
- [ ] Console logs (passing)
- [ ] 320px, 375px, 428px widths

---

## 🚨 **If Tests Fail**

1. **Check console** for error messages
2. **Verify NEXT_PUBLIC_DEBUG_UI=1** is set
3. **Restart dev server** if HMR caused issues
4. **Clear browser cache** and hard reload
5. **Review audit docs** in `docs/audits/2025-10-mobile-dropdowns/`

---

**Last Updated**: 2025-10-09  
**Status**: Ready for Testing ✅  
**Next**: User runs test matrix → If pass, proceed to Phase 4 (cleanup & commit)

