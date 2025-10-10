# Team Select & Tie Logic - Testing Guide

**Date**: 2025-10-09  
**Branch**: `fix/mobile-teamselect-avg-and-ties`  
**Commit**: `f357f90`

---

## 🎯 **What Was Fixed**

1. **Team Select Filtering**: "Avg Team" and "League Total" now hidden from dropdowns
2. **Tie Detection**: Precision-aware equality detects ties correctly (5.7 vs 5.700001)
3. **Tie Ordering**: Teams with same rank sorted alphabetically (stable display)

---

## 🧪 **Test Matrix**

### Test 1: Team Select - Non-Selectable Teams Hidden ✅
**Location**: Mobile view, any panel  
**Actions**:
1. Open mobile view (320-428px width)
2. Tap Team A logo (top-left of panel header)
3. Observe Team Select dropdown

**Expected Results**:
- ✅ Shows 32 real NFL teams (alphabetically sorted)
- ✅ Shows "Avg (per game)" with 📊 emoji at bottom
- ❌ Does NOT show "Avg Team"
- ❌ Does NOT show "League Total"
- ✅ Total items: 33 (32 teams + 1 average)

**Pass/Fail**: _____________

---

### Test 2: Team Select - Avg Tm/G Pinned Last ✅
**Location**: Team Select dropdown  
**Actions**:
1. Scroll to bottom of Team Select dropdown
2. Verify last item

**Expected Results**:
- ✅ Last item is "Avg (per game)"
- ✅ Has separator border above it
- ✅ Shows 📊 purple emoji badge
- ✅ Selectable (can tap to select)

**Pass/Fail**: _____________

---

### Test 3: Ranking - Tie Detection ✅
**Location**: Rank dropdown on any metric with ties  
**Actions**:
1. Find a metric likely to have ties (e.g., "Yards/Attempt", "Comp %")
2. Open rank dropdown
3. Look for teams with identical values

**Expected Results**:
- ✅ Teams with same value show same rank number (5, 5, 5)
- ✅ "T-" prefix appears ("T-5th", not "5th")
- ✅ All tied teams show same formatted rank
- ✅ Next rank jumps correctly (if 3 teams at 5, next is 8)

**Example**:
```
Rank 5: Buffalo Bills (5.7 YPA)  ← T-5th
Rank 5: Dallas Cowboys (5.7 YPA) ← T-5th
Rank 5: Miami Dolphins (5.7 YPA) ← T-5th
Rank 8: Seattle Seahawks (5.6 YPA) ← 8th (skips 6,7)
```

**Pass/Fail**: _____________

---

### Test 4: Ranking - Deterministic Tie Order ✅
**Location**: Rank dropdown with ties  
**Actions**:
1. Find metric with 3+ tied teams
2. Open rank dropdown, note tie order
3. Close dropdown
4. Reopen dropdown
5. Compare tie order

**Expected Results**:
- ✅ Tie order is **alphabetical by team name**
- ✅ Same order every time (no jitter)
- ✅ Stable across dropdown toggles

**Example** (consistent order):
```
T-5th: Buffalo Bills
T-5th: Dallas Cowboys
T-5th: Miami Dolphins
```
NOT random like:
```
T-5th: Dallas Cowboys    ← Order changed!
T-5th: Buffalo Bills
T-5th: Miami Dolphins
```

**Pass/Fail**: _____________

---

### Test 5: Ranking - Avg Tm/G Appears Last ✅
**Location**: Any rank dropdown  
**Actions**:
1. Open rank dropdown
2. Scroll to bottom

**Expected Results**:
- ✅ "Avg (per game)" appears at bottom (after all ranked teams)
- ✅ Shows 📊 emoji badge
- ✅ Shows metric value
- ❌ NO rank number (no "30th", no "T-15th")
- ✅ Separator border above it

**Pass/Fail**: _____________

---

### Test 6: Regression - Desktop Unchanged ✅
**Location**: Desktop view (>768px)  
**Actions**:
1. Switch to desktop view
2. Test Team Select dropdown
3. Test Ranking dropdown

**Expected Results**:
- ✅ Team Select still filters non-selectable teams (already worked)
- ✅ Ranking dropdowns still show ties correctly
- ✅ No visual changes
- ✅ No functional regressions

**Pass/Fail**: _____________

---

## 📊 **Edge Cases to Test**

### Edge Case 1: Metric with No Ties
**Test**: Open rank dropdown for unique metric (e.g., "Points")  
**Expected**: No "T-" prefix, ranks are 1st, 2nd, 3rd... 32nd

### Edge Case 2: All Teams Tied (unlikely but possible)
**Test**: If metric has all equal values (e.g., all 0.0)  
**Expected**: All show "T-1st", next different value is "33rd"

### Edge Case 3: Floating-Point Precision
**Test**: Find teams with decimals like 5.7, 22.3  
**Expected**: Values within 0.001 are treated as tied

### Edge Case 4: Empty State (no teams)
**Test**: If data fails to load  
**Expected**: No crash, graceful empty state

---

## 🐛 **Known Issues to Verify Fixed**

| Issue | Before | After | Status |
|-------|--------|-------|--------|
| **Non-selectable in mobile** | "Avg Team", "League Total" visible | Hidden | ✅ |
| **Float tie detection** | 5.7 vs 5.700001 = different ranks | Same rank "T-" | ✅ |
| **Tie order jitter** | Random order on toggle | Alphabetical | ✅ |

---

## ✅ **Acceptance Criteria**

All must pass:

1. ✅ Mobile Team Select shows only 32 teams + "Avg Tm/G"
2. ✅ "Avg Team" and "League Total" do NOT appear
3. ✅ Teams with equal values show same rank with "T-" prefix
4. ✅ Tied teams ordered alphabetically (stable)
5. ✅ "Avg Tm/G" appears last in all dropdowns
6. ✅ Desktop behavior unchanged

---

## 📸 **Screenshot Checklist**

Capture for documentation:

- [ ] Mobile Team Select (33 items, no "Avg Team")
- [ ] Rank dropdown with ties ("T-5th", "T-5th", "T-5th")
- [ ] Alphabetical tie order (Buffalo, Dallas, Miami)
- [ ] "Avg Tm/G" at bottom with separator
- [ ] Desktop comparison (unchanged)

---

## 🚨 **If Tests Fail**

### Failure: "Avg Team" Still Appears
**Check**: 
- Verify `isNonSelectableSpecialTeam` import added
- Verify filter applied in `sortedTeams` useMemo
- Hard reload browser (Ctrl+Shift+R)

### Failure: Ties Not Detected
**Check**:
- Verify `areValuesEqual()` helper added to `useRanking.ts`
- Verify both call sites (line 109, 198) updated
- Check console for ranking logs

### Failure: Tie Order Changes
**Check**:
- Verify secondary sort added: `.localeCompare(b.team.team)`
- Verify sort function has `if (rankDiff !== 0) return rankDiff;`

---

## 📝 **Test Results Log**

**Tester**: _____________  
**Date**: _____________  
**Browser**: _____________  
**Device**: _____________

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Team Select Filter | ⬜ Pass / ⬜ Fail | |
| Test 2: Avg Tm/G Pinned | ⬜ Pass / ⬜ Fail | |
| Test 3: Tie Detection | ⬜ Pass / ⬜ Fail | |
| Test 4: Deterministic Order | ⬜ Pass / ⬜ Fail | |
| Test 5: Avg in Rank Dropdown | ⬜ Pass / ⬜ Fail | |
| Test 6: Desktop Regression | ⬜ Pass / ⬜ Fail | |

**Overall Result**: ⬜ **All Pass** / ⬜ **Some Fail**

---

**Last Updated**: 2025-10-09  
**Status**: Ready for Testing ✅  
**Next**: User runs tests and reports results

