# Team Select & Ranking Tie Logic - Diff Plan

**Audit Date**: 2025-10-09  
**Branch**: `fix/mobile-teamselect-avg-and-ties`  
**Estimated Time**: ~20 minutes

---

## 🎯 **Overview**

**3 Issues → 5 File Changes**

| Change | Files | Lines | Complexity |
|--------|-------|-------|------------|
| **#1**: Filter non-selectable teams | 2 files | ~2 lines each | 🟢 Trivial |
| **#2**: Precision-aware equality | 1 file | ~10 lines | 🟢 Simple |
| **#3**: Deterministic tie sort | 2 files | ~5 lines each | 🟢 Simple |

---

## 📝 **Change #1: Filter Non-Selectable Teams**

### Target Files
1. `components/mobile/CompactTeamSelector.tsx:120`
2. `components/mobile/CompactRankingDropdown.tsx:144`

---

### File 1: `components/mobile/CompactTeamSelector.tsx`

**Line 120** (inside `sortedTeams` useMemo):

```diff
  const sortedTeams = useMemo(() => {
    const avgTeam = allTeams.find(t => isAverageTeam(t.team));
-   const regularTeams = allTeams.filter(t => !isAverageTeam(t.team));
+   const regularTeams = allTeams.filter(t => 
+     !isAverageTeam(t.team) &&
+     !isNonSelectableSpecialTeam(t.team)
+   );
    
    // Sort alphabetically
    const sorted = regularTeams.sort((a, b) => a.team.localeCompare(b.team));
```

**Import** (add to line 17):
```diff
- import { isAverageTeam, getTeamEmoji, getTeamDisplayLabel } from '@/utils/teamHelpers';
+ import { isAverageTeam, isNonSelectableSpecialTeam, getTeamEmoji, getTeamDisplayLabel } from '@/utils/teamHelpers';
```

---

### File 2: `components/mobile/CompactRankingDropdown.tsx`

**Line 144** (inside `sortedTeams` useMemo):

```diff
  const sortedTeams: TeamWithRanking[] = useMemo(() => {
    const avgTeam = allData.find(t => isAverageTeam(t.team));
-   const regularTeams = allData.filter(t => !isAverageTeam(t.team));
+   const regularTeams = allData.filter(t => 
+     !isAverageTeam(t.team) &&
+     !isNonSelectableSpecialTeam(t.team)
+   );
    
    const sorted = regularTeams
      .map(team => {
```

**Import** (add to line 19):
```diff
- import { isAverageTeam, getTeamEmoji } from '@/utils/teamHelpers';
+ import { isAverageTeam, isNonSelectableSpecialTeam, getTeamEmoji } from '@/utils/teamHelpers';
```

---

## 📝 **Change #2: Precision-Aware Equality**

### Target File
- `lib/useRanking.ts`

---

### Step 1: Add Helper Function

**Insert after imports** (line 13, before interface definitions):

```typescript
/**
 * Compare two numeric values with floating-point tolerance
 * 
 * @param a - First value
 * @param b - Second value
 * @param epsilon - Tolerance (default: 0.001 for 3 decimal places)
 * @returns true if values are equal within tolerance
 * 
 * @example
 * areValuesEqual(5.7, 5.700001)  // true
 * areValuesEqual(5.7, 5.8)       // false
 */
function areValuesEqual(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) < epsilon;
}
```

---

### Step 2: Update `useRanking` Function

**Line 93** (inside `forEach` loop):

```diff
    filteredData.forEach(team => {
      const teamValue = parseFloat(String(team[metricKey] || '0'));
      if (isNaN(teamValue)) return;

-     if (teamValue === targetValue) {
+     if (areValuesEqual(teamValue, targetValue)) {
        teamsWithSameValue++;
      } else if (higherIsBetter && teamValue > targetValue) {
        betterTeamsCount++;
```

---

### Step 3: Update `calculateBulkRanking` Function

**Line 182** (inside `forEach` loop):

```diff
    filteredData.forEach(team => {
      const teamValue = parseFloat(String(team[metricKey] || '0'));
      if (isNaN(teamValue)) return;

-     if (teamValue === targetValue) {
+     if (areValuesEqual(teamValue, targetValue)) {
        teamsWithSameValue++;
      } else if (higherIsBetter && teamValue > targetValue) {
        betterTeamsCount++;
```

---

## 📝 **Change #3: Deterministic Tie Sort**

### Target Files
1. `components/mobile/CompactRankingDropdown.tsx:148-149`
2. `components/RankingDropdown.tsx:107-115` (optional - desktop)

---

### File 1: `components/mobile/CompactRankingDropdown.tsx`

**Lines 148-149** (inside `sortedTeams` useMemo):

```diff
    const sorted = regularTeams
      .map(team => {
        const ranking = allTeamRankings[team.team];
        const rawValue = String(team[metricKey] || '0');
        const formattedValue = formatMetricValue(rawValue, metric?.format || 'number');
        
        return {
          team,
          ranking,
          value: rawValue,
          formattedValue
        };
      })
      .filter(item => item.ranking)
-     .sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999));
+     .sort((a, b) => {
+       const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
+       if (rankDiff !== 0) return rankDiff;
+       // Same rank → alphabetical by team name
+       return a.team.team.localeCompare(b.team.team);
+     });
    
    // Add average team last
    if (avgTeam) {
```

---

### File 2: `components/RankingDropdown.tsx` (Optional - Desktop Consistency)

**Lines 107-115** (inside `sortedTeams` useMemo):

```diff
    const sorted = regularTeams
      .map(team => {
        const ranking = allTeamRankings[team.team];
        const rawValue = String(team[metricKey] || '0');
        const formattedValue = formatMetricValue(rawValue, metric?.format || 'number');
        
        return {
          team,
          ranking,
          value: rawValue,
          formattedValue
        };
      })
      .filter(item => item.ranking)
-     .sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999));
+     .sort((a, b) => {
+       const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
+       if (rankDiff !== 0) return rankDiff;
+       // Same rank → alphabetical by team name
+       return a.team.team.localeCompare(b.team.team);
+     });
    
    // Append average team at end if it exists (with null ranking)
    if (avgTeam) {
```

---

## ✅ **Checklist**

### Phase 2A: Filter Non-Selectable Teams
- [ ] Update `mobile/CompactTeamSelector.tsx:120` (add filter)
- [ ] Add `isNonSelectableSpecialTeam` import
- [ ] Update `mobile/CompactRankingDropdown.tsx:144` (add filter)
- [ ] Add `isNonSelectableSpecialTeam` import

### Phase 2B: Fix Tie Logic  
- [ ] Add `areValuesEqual()` helper to `lib/useRanking.ts`
- [ ] Update `useRanking` function (line 93)
- [ ] Update `calculateBulkRanking` function (line 182)
- [ ] Update `mobile/CompactRankingDropdown.tsx` sort (line 148-149)
- [ ] (Optional) Update `RankingDropdown.tsx` sort (line 107-115)

### Phase 3: Testing
- [ ] Team Select: No "Avg Team" or "League Total" visible
- [ ] Team Select: "Avg Tm/G" appears at bottom
- [ ] Rankings: Ties detected correctly (same rank, "T-" prefix)
- [ ] Rankings: Tie order is alphabetical (stable)
- [ ] Regression: Desktop unchanged

### Phase 4: Commit
- [ ] Update `findings.md` with final locations
- [ ] Mark diff-plan items as done
- [ ] Commit with message: `feat(mobile): hide "Avg Team" from Team Select; keep league Avg Tm/G pinned`
- [ ] Commit with message: `fix(ranking): unify tie logic via precision guard; deterministic sort`

---

## 🧪 **Testing Commands**

### Quick Visual Test:
```bash
npm run dev
# Open mobile view (320-428px)
# Click team logo → Team Select dropdown
# Verify: Only 32 teams + "Avg Tm/G" (NO "Avg Team", NO "League Total")
```

### Tie Detection Test:
```bash
# Find metric with ties (e.g., multiple teams with same Yards/Attempt)
# Open rank dropdown
# Verify: Teams with equal values show "T-5th", "T-5th", "T-5th"
# Close and reopen → order stays same (alphabetical within ties)
```

---

## 📊 **Impact Analysis**

### What Changes:
- ✅ Mobile Team Select: 2-3 fewer items (non-selectable teams hidden)
- ✅ Rankings: More accurate tie detection (precision-aware)
- ✅ Rankings: Stable order within ties (alphabetical)

### What Stays Same:
- ✅ Desktop Team Select (already correct)
- ✅ "Avg Tm/G" still appears last
- ✅ "Avg Tm/G" still excluded from rankings
- ✅ Visual styling unchanged
- ✅ API responses unchanged

---

## ⚠️ **Potential Risks**

### Low Risk:
- ✅ Filter addition is additive (only removes items)
- ✅ Precision guard is backward-compatible (stricter equality)
- ✅ Sort change is deterministic (no random behavior)

### Edge Cases:
- If CSV doesn't contain "Avg Team" or "League Total", no visible change
- If no ties exist in current data, sort change has no effect

---

## 📝 **Implementation Order**

1. **Start with Change #1** (filter non-selectable teams)
   - Easiest to test immediately
   - Visible user impact
   - Only 4 lines of code

2. **Then Change #2** (precision equality)
   - Add helper function first
   - Update call sites
   - Test with known tied metrics

3. **Finally Change #3** (deterministic sort)
   - Apply after tie detection works
   - Test stability with repeated opens

---

**Last Updated**: 2025-10-09  
**Status**: Diff Plan Complete ✅ | Ready for Implementation (Phase 2)

