# Floating UI Implementation - Testing Checklist

**Date**: 2025-10-09  
**Status**: Testing Phase  
**Related**: 
- Implementation: `docs/devnotes/2025-10-09-floating-ui-migration.md`
- Bug Fix: `docs/devnotes/2025-10-09-floating-ui-bugfix.md`
- Audit: `docs/audits/2025-10-09-mobile-dropdown-audit.md`

---

## 🎯 Testing Objective

Verify that all three original issues are fixed with Floating UI implementation:
1. ✅ Dropdowns no longer clipped by panel container
2. ✅ Right-side dropdowns stay within viewport
3. ✅ Bottom row dropdowns auto-flip when needed

---

## ✅ Pre-Testing Checklist

### Code Status
- ✅ Floating UI installed (`@floating-ui/react` v0.27.16)
- ✅ CompactRankingDropdown refactored
- ✅ CompactTeamSelector refactored
- ✅ CompactPanel integration updated
- ✅ CompactPanelHeader integration updated
- ✅ CompactComparisonRow integration updated
- ✅ React setState bug fixed

### Console Status
- [ ] No React errors
- [ ] No console warnings
- [ ] No TypeScript errors (after server restart)

---

## 🧪 TESTING PROTOCOL

### Test Environment Setup

**Browser**: Chrome/Safari/Firefox  
**Viewport Sizes to Test**:
- 320px (iPhone SE) - Narrowest
- 375px (iPhone 12 mini)
- 390px (iPhone 14 Pro) - Primary target
- 428px (iPhone 14 Pro Max) - Widest

**Teams to Test**:
- Buffalo Bills (typically high rank)
- Arizona Cardinals (typically low rank)
- Average Team (📊 Avg)

---

## 📋 TEST SUITE

### Issue #1: Panel Clipping (Divider/Overflow-Hidden)

**Original Problem**: Dropdowns cut off at panel boundaries

#### Test Steps:
1. Open mobile view (390px width)
2. Navigate to Compare page
3. Select: Buffalo Bills vs Kansas City Chiefs
4. Tap any rank badge in **Offense panel**
5. Scroll dropdown to see all 32 teams

**Expected Results**:
- [ ] Dropdown extends beyond offense panel border
- [ ] All 32 teams + "Avg" visible with scrolling
- [ ] Dropdown NOT clipped at panel bottom edge
- [ ] Dropdown NOT clipped by purple divider line
- [ ] Backdrop visible behind dropdown

#### Test Steps (Defense):
6. Close offense dropdown
7. Tap any rank badge in **Defense panel**
8. Scroll dropdown to see all teams

**Expected Results**:
- [ ] Defense dropdown extends beyond panel border
- [ ] Not clipped by purple divider above
- [ ] Not clipped by bottom bar
- [ ] Scrollable to see all teams

**✅ PASS CRITERIA**: Dropdowns render completely, no clipping at panel boundaries

---

### Issue #2: Right-Side Off-Screen

**Original Problem**: Team B dropdowns rendered 100-150px off right edge

#### Test Steps:
1. In Offense panel, tap **Team B logo** (right side)
2. Observe dropdown position

**Expected Results**:
- [ ] Team selector dropdown fully visible
- [ ] Right edge of dropdown within viewport
- [ ] Left edge of dropdown within viewport
- [ ] Positioned near Team B logo
- [ ] No horizontal scrollbar

#### Test Steps (Rank Badge):
3. Close team selector
4. Scroll to last metric in Offense panel
5. Tap **Team B rank badge** (30th, right side)
6. Observe dropdown position

**Expected Results**:
- [ ] Ranking dropdown fully visible
- [ ] Right edge within viewport (no overflow)
- [ ] Positioned near Team B value
- [ ] All 32 teams scrollable

#### Test at Narrowest Viewport:
7. Resize viewport to **320px** (iPhone SE)
8. Repeat steps 1-6

**Expected Results**:
- [ ] Team B dropdowns still fully visible at 320px
- [ ] Floating UI `shift` middleware working
- [ ] Dropdown shifts left to stay in viewport

**✅ PASS CRITERIA**: Team B dropdowns never overflow right edge, even at 320px

---

### Issue #3: Bottom Row Cut-Off

**Original Problem**: Bottom metric dropdowns only showed 1 row, rest clipped

#### Test Steps:
1. Scroll to **5th metric** (bottom row) in Defense panel
2. Tap **Team A rank badge** (left side)
3. Observe dropdown direction

**Expected Results**:
- [ ] Dropdown renders **ABOVE** the rank badge (flipped)
- [ ] All 32 teams + "Avg" scrollable
- [ ] Dropdown does NOT extend below bottom bar
- [ ] Dropdown does NOT get clipped

#### Test Steps (Team B):
4. Close dropdown
5. Tap **Team B rank badge** (right side) on 5th metric
6. Observe dropdown direction

**Expected Results**:
- [ ] Dropdown flips upward (renders above)
- [ ] Fully visible and scrollable
- [ ] Not clipped by bottom bar

#### Test Middle Row (Control):
7. Scroll to **3rd metric** (middle row)
8. Tap any rank badge
9. Observe dropdown direction

**Expected Results**:
- [ ] Dropdown renders **BELOW** rank badge (normal)
- [ ] Does not flip (space available below)
- [ ] Fully visible

**✅ PASS CRITERIA**: Bottom row dropdowns auto-flip upward, middle rows render downward

---

### Edge Case Testing

#### Test: Device Rotation
1. Open dropdown
2. Rotate device (portrait → landscape)

**Expected**:
- [ ] Dropdown repositions smoothly
- [ ] Stays attached to trigger
- [ ] No clipping after rotation

#### Test: Scroll During Open
1. Open dropdown
2. Scroll page while dropdown open

**Expected**:
- [ ] Dropdown follows trigger element
- [ ] Position updates in real-time
- [ ] `autoUpdate` middleware working

#### Test: Multiple Rapid Toggles
1. Rapidly click rank badge 5 times
2. Observe behavior

**Expected**:
- [ ] Opens/closes cleanly
- [ ] No stuck dropdowns
- [ ] No console errors

#### Test: Backdrop Dismiss
1. Open dropdown
2. Click backdrop (outside dropdown)

**Expected**:
- [ ] Dropdown closes
- [ ] No errors

#### Test: ESC Key Dismiss
1. Open dropdown
2. Press ESC key

**Expected**:
- [ ] Dropdown closes
- [ ] `useDismiss` working

#### Test: Average Team
1. Select "📊 Avg (per game)" for Team A
2. View comparison rows

**Expected**:
- [ ] Shows "📊 Avg" badge (not rank number)
- [ ] Tapping badge opens dropdown
- [ ] "Avg" appears last in dropdown
- [ ] Purple separator before "Avg"

#### Test: Mutual Exclusion
1. Open Team A logo dropdown
2. Tap rank badge while logo dropdown open

**Expected**:
- [ ] Logo dropdown closes
- [ ] Rank dropdown opens
- [ ] Only one dropdown visible at a time

---

## 🎨 Visual Quality Checks

### Dropdown Appearance
- [ ] Backdrop: rgba(0, 0, 0, 0.6) - semi-transparent black
- [ ] Dropdown: rgba(15, 23, 42, 0.98) - dark blue
- [ ] Border radius: rounded-xl (12px)
- [ ] Shadow: 0 8px 32px rgba(0, 0, 0, 0.4)
- [ ] Backdrop blur: blur(10px)

### Animations
- [ ] Entry: opacity + scale (0.95 → 1.0) + y (-10px → 0)
- [ ] Duration: 150ms
- [ ] Smooth, no jank
- [ ] 60fps scrolling

### Typography & Spacing
- [ ] Team names: 13px-14px, white
- [ ] Rank numbers: 11px, purple-400
- [ ] Values: 11px, slate-400
- [ ] Row height: ~52-56px
- [ ] Padding: Consistent throughout

---

## 📱 Cross-Browser Testing

### Chrome (Primary)
- [ ] All issues fixed
- [ ] No console errors
- [ ] Smooth animations
- [ ] DevTools responsive mode tested

### Safari (iOS Primary)
- [ ] All issues fixed
- [ ] Safe area insets working
- [ ] Touch targets ≥44px
- [ ] No webkit-specific bugs

### Firefox
- [ ] All issues fixed
- [ ] Animations smooth
- [ ] No gecko-specific issues

---

## 🐛 Known Issues to Watch For

### TypeScript Caching
- **Symptom**: `Property 'activeTeamSelector' does not exist` error
- **Cause**: TypeScript cache not updated
- **Fix**: Restart dev server / reload VS Code window
- **Status**: Harmless, will resolve automatically

### Portal Rendering
- **Watch**: Dropdowns should render at `<body>` level in DOM
- **Tool**: Chrome DevTools → Elements → Search for "FloatingPortal"
- **Expected**: Dropdown divs as direct children of body

---

## 📊 PASS/FAIL CRITERIA

### PASS Requirements:
- ✅ All 3 original issues completely resolved
- ✅ No React errors in console
- ✅ Works across all viewport sizes (320px-428px)
- ✅ Edge cases handled (rotation, scroll, rapid toggle)
- ✅ Visual quality matches design (Pare styling)
- ✅ Smooth 60fps animations
- ✅ Accessibility preserved (ARIA labels, keyboard nav)

### FAIL Triggers:
- ❌ Any dropdown clipping issues
- ❌ React errors in console
- ❌ Dropdowns overflow viewport edges
- ❌ Bottom row dropdowns don't flip
- ❌ Performance issues (janky animations)
- ❌ TypeScript errors (after server restart)

---

## 📝 Testing Notes

**Tester**: _________________  
**Date**: _________________  
**Browser**: _________________  
**Viewport**: _________________  

### Issue #1 (Panel Clipping):
- [ ] PASS
- [ ] FAIL - Notes: _________________

### Issue #2 (Right-Side Off-Screen):
- [ ] PASS
- [ ] FAIL - Notes: _________________

### Issue #3 (Bottom Row Cut-Off):
- [ ] PASS
- [ ] FAIL - Notes: _________________

### Edge Cases:
- [ ] PASS
- [ ] FAIL - Notes: _________________

### Overall Status:
- [ ] ✅ APPROVED FOR PRODUCTION
- [ ] ⚠️ MINOR ISSUES (document below)
- [ ] ❌ BLOCKING ISSUES (must fix before production)

**Additional Notes**:
_________________________________
_________________________________
_________________________________

---

## 🚀 Post-Testing Actions

### If PASS:
1. ✅ Mark all TODOs complete
2. ✅ Update CHANGELOG.md (already done)
3. ✅ Update dev notes (already done)
4. ✅ Commit changes with descriptive message
5. ✅ Ready for production deployment

### If FAIL:
1. ❌ Document specific failures above
2. ❌ Create GitHub issue with reproduction steps
3. ❌ Update dev notes with failure details
4. ❌ Plan fix strategy
5. ❌ Re-test after fixes

---

**Testing Checklist Complete**: _________________  
**Production-Ready**: [ ] YES / [ ] NO  
**Signed Off By**: _________________


