# Team Select & Ranking Tie Logic - Detailed Findings

**Audit Date**: 2025-10-09  
**Branch**: `fix/mobile-teamselect-avg-and-ties`  
**Engineer**: Senior Front-End Audit (per phases.txt specification)

---

## 🎯 **Executive Summary**

Found **3 critical issues** preventing correct Team Select behavior and ranking tie display:

1. **Mobile Team Select shows non-selectable teams** ("Avg Team", "League Total")
2. **Floating-point equality fails to detect ties** (precision bug)
3. **Tie order is non-deterministic** (no secondary sort)

**Good news**: Desktop `TeamDropdown` already has the correct filtering pattern. We can replicate it to mobile.

---

## 📊 **Data Structure Analysis**

### CSV Row Types (Lines 35-37)

```csv
Row 35: ,Avg Team,,114.6,1604.9,...        ← Type: SYNTHETIC_AVG (non-selectable)
Row 36: ,League Total,,3668,51358,...       ← Type: AGGREGATE_TOTAL (non-selectable)
Row 37: ,Avg Tm/G,,23.5,329.2,...           ← Type: LEAGUE_AVG_PER_GAME (SELECTABLE!)
```

**Intent** (from phases.txt):
- **Hide**: "Avg Team" (synthetic average, not useful)
- **Hide**: "League Total" (aggregate totals, not useful)
- **Keep**: "Avg Tm/G" (per-game league average, useful for benchmarking)

---

## 🔍 **Issue #1: Non-Selectable Teams May Appear**

### Root Cause

**Mobile** `CompactTeamSelector.tsx:120`:
```typescript
const regularTeams = allTeams.filter(t => !isAverageTeam(t.team));
```

This filter **only** excludes "Avg Tm/G" variants. It does NOT exclude:
- "Avg Team"
- "League Total"

**Desktop** `TeamDropdown.tsx:45-48` (correct pattern):
```typescript
const regularTeams = allTeams
  .filter(t => 
    !isAverageTeam(t.team) &&                      // Exclude average
    !isNonSelectableSpecialTeam(t.team)            // ✅ Exclude non-selectable!
  )
```

### Evidence

**Test**: If CSV contains "Avg Team" or "League Total" rows (which it does), they would appear in mobile Team Select.

**Proof from CSV**:
```
data/pfr/offense-2025.csv:35: ,Avg Team,,114.6,...     ← PRESENT!
data/pfr/offense-2025.csv:36: ,League Total,,3668,...  ← PRESENT!
```

### Impact

**User Experience**:
- User sees confusing "Avg Team" and "League Total" options
- These are not real teams and shouldn't be selectable
- Only "Avg Tm/G" (per-game average) should appear

**Affected Components**:
- ❌ `components/mobile/CompactTeamSelector.tsx:120`
- ❌ `components/mobile/CompactRankingDropdown.tsx:144`
- ✅ `components/TeamDropdown.tsx:45-48` (desktop - already correct!)

### File Pointers

| File | Line | Current | Status |
|------|------|---------|--------|
| `mobile/CompactTeamSelector.tsx` | 120 | Missing filter | ❌ Bug |
| `mobile/CompactRankingDropdown.tsx` | 144 | Missing filter | ❌ Bug |
| `TeamDropdown.tsx` (desktop) | 47 | Has filter | ✅ Correct |

---

## 🔍 **Issue #2: Floating-Point Equality Bug**

### Root Cause

**`lib/useRanking.ts:93`**:
```typescript
if (teamValue === targetValue) {
  teamsWithSameValue++;
}
```

**Problem**: Uses **exact equality** (`===`) for floating-point numbers.

### Why This Fails

**Floating-Point Precision**:
```javascript
// Example: Two teams with "5.7" yards per carry
const team1 = 5.7;
const team2 = parseFloat("5.7");  // May be 5.700000000000001
team1 === team2;  // false! → Tie NOT detected ❌

// Example: Defensive stats with decimals
const def1 = 22.3;
const def2 = 22.3 + 0.0000001;  // Rounding noise
def1 === def2;  // false! → Tie NOT detected ❌
```

**Real-World Impact**:
- Teams with identical stat values (5.7 YPC, 22.3 PPG) may not be marked as tied
- "T-5" label won't appear when it should
- Rankings will show as separate (5th, 6th) instead of tied (T-5, T-5)

### Evidence

**Code Analysis**:
- **Line 93**: `useRanking` function
- **Line 182**: `calculateBulkRanking` function (same bug)
- Both use `teamValue === targetValue` without precision guard

**Phases.txt Requirement**:
> Handle floating-point equality consistently (precision guard).
> Use a shared areClose(a,b,eps=1e-6) OR normalize with toFixed(3).

### Solution Pattern

**Industry Standard**:
```typescript
function areValuesEqual(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) < epsilon;
}

// Usage:
if (areValuesEqual(teamValue, targetValue)) {
  teamsWithSameValue++;
}
```

**Alternative** (simpler):
```typescript
// Normalize to 3 decimal places
const normalizedValue = Number(value.toFixed(3));
```

### File Pointers

| File | Line | Issue |
|------|------|-------|
| `lib/useRanking.ts` | 93 | Exact equality in `useRanking` |
| `lib/useRanking.ts` | 182 | Exact equality in `calculateBulkRanking` |

---

## 🔍 **Issue #3: Non-Deterministic Tie Order**

### Root Cause

**`components/mobile/CompactRankingDropdown.tsx:148-149`**:
```typescript
const sorted = regularTeams
  .map(team => ({ team, ranking, ... }))
  .filter(item => item.ranking)
  .sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999));  // ← No secondary sort!
```

**Problem**: When two teams have the same rank (e.g., both T-5), sort order is **undefined**.

### Why This Matters

**Without Secondary Sort**:
```
Rank 5: Buffalo Bills   ← May reorder on re-render
Rank 5: Dallas Cowboys  ← May reorder on re-render
Rank 5: Houston Texans  ← May reorder on re-render
```

**With Secondary Sort (Correct)**:
```
Rank 5: Buffalo Bills   ← Always alphabetical within ties
Rank 5: Dallas Cowboys  ← Stable order
Rank 5: Houston Texans  ← Predictable
```

### Evidence

**Phases.txt Requirement**:
> Sort within ties deterministically (e.g., by team name/abbr) to avoid jitter.

**Current Sort Logic**:
```typescript
.sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999))
//                ↑ Only sorts by rank
//                ↑ When ranks equal → arbitrary order!
```

**Expected Sort Logic**:
```typescript
.sort((a, b) => {
  const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
  if (rankDiff !== 0) return rankDiff;  // Different ranks
  return a.team.team.localeCompare(b.team.team);  // Same rank → alphabetical
})
```

### Impact

**User Experience**:
- Teams with tied ranks may reorder on dropdown open/close
- Inconsistent UI causes confusion
- Looks like a bug to users

**Affected Components**:
- ❌ `components/mobile/CompactRankingDropdown.tsx:148-149`
- ❌ `components/RankingDropdown.tsx:107-115` (desktop - same issue)

### File Pointers

| File | Line | Issue |
|------|------|-------|
| `mobile/CompactRankingDropdown.tsx` | 148-149 | No secondary sort |
| `RankingDropdown.tsx` (desktop) | 107-115 | No secondary sort |

---

## ✅ **What's Already Working**

### Utility Functions ✅
- `isAverageTeam()` correctly identifies "Avg Tm/G"
- `isNonSelectableSpecialTeam()` correctly identifies non-selectable teams
- `shouldExcludeFromRanking()` correctly excludes all special teams from ranks
- `getTeamDisplayLabel()` and `getTeamEmoji()` provide consistent labeling

### Ranking Calculation ✅
- "Avg Tm/G" excluded from ranking calculations (`excludeSpecialTeams: true`)
- Rank numbering is correct (1-32)
- "T-" prefix formatting works (`formatRank()`)
- Rank compression is correct (1, 2, 2, 4, 5...)

### Visual Presentation ✅
- "Avg Tm/G" appears last in all dropdowns
- Separator line before average team
- Purple emoji badge (📊) for average team
- Desktop `TeamDropdown` filters non-selectable teams correctly

---

## 📋 **Summary Table**

| Issue | Severity | Affected | Desktop | Mobile | Fix |
|-------|----------|----------|---------|--------|-----|
| **Non-selectable teams** | 🔴 High | Team Select | ✅ Fixed | ❌ Bug | Add filter |
| **Float equality** | 🟡 Medium | Rankings | ❌ Bug | ❌ Bug | Precision guard |
| **Tie order** | 🟡 Medium | Rankings | ❌ Bug | ❌ Bug | Secondary sort |

---

## 🔧 **Proposed Solutions**

### Solution #1: Add Non-Selectable Filter
**Pattern**: Copy from desktop `TeamDropdown.tsx:47`

```typescript
// Current (mobile):
const regularTeams = allTeams.filter(t => !isAverageTeam(t.team));

// Fixed:
const regularTeams = allTeams.filter(t => 
  !isAverageTeam(t.team) &&
  !isNonSelectableSpecialTeam(t.team)  // ← ADD THIS
);
```

**Apply to**:
- `components/mobile/CompactTeamSelector.tsx:120`
- `components/mobile/CompactRankingDropdown.tsx:144`

---

### Solution #2: Precision-Aware Equality
**Create shared utility**: `lib/ranking/computeRanks.ts` (or add to `useRanking.ts`)

```typescript
/**
 * Compare two values with floating-point tolerance
 */
function areValuesEqual(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) < epsilon;
}

// Usage in useRanking.ts:93, 182:
// Before:
if (teamValue === targetValue) {
  teamsWithSameValue++;
}

// After:
if (areValuesEqual(teamValue, targetValue)) {
  teamsWithSameValue++;
}
```

**Epsilon Choice**: `0.001` (3 decimal places) is appropriate for NFL stats.

---

### Solution #3: Deterministic Tie Sort
**Add secondary sort** by team name:

```typescript
// Current:
.sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999))

// Fixed:
.sort((a, b) => {
  const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
  if (rankDiff !== 0) return rankDiff;
  // Same rank → alphabetical
  return a.team.team.localeCompare(b.team.team);
})
```

**Apply to**:
- `components/mobile/CompactRankingDropdown.tsx:148`
- `components/RankingDropdown.tsx` (desktop - optional for consistency)

---

## 🧪 **Test Plan**

### Test 1: Team Select - Non-Selectable Teams
**Setup**: Open mobile Team Select (logo tap)  
**Expected**:
- ✅ "Avg Tm/G" appears at bottom
- ❌ "Avg Team" does NOT appear
- ❌ "League Total" does NOT appear

---

### Test 2: Rankings - Tie Detection
**Setup**: Find metric with tied values (e.g., multiple teams with 5.7 YPC)  
**Expected**:
- ✅ All teams with same value show same rank (5, 5, 5)
- ✅ "T-" prefix appears for tied teams ("T-5th")
- ✅ Rank jumps correctly (if 3 teams tied at 5, next is 8)

---

### Test 3: Rankings - Deterministic Order
**Setup**: Open rank dropdown, close, reopen multiple times  
**Expected**:
- ✅ Teams within same rank always appear in same order (alphabetical)
- ✅ No "jitter" or reordering on dropdown toggle

---

## 📝 **Implementation Notes**

### Phase 2A: Filter Non-Selectable Teams (5 min)
- Simple filter addition
- Copy pattern from desktop
- No algorithm changes

### Phase 2B: Fix Tie Logic (15 min)
- Add `areValuesEqual()` helper (5 min)
- Update 2 call sites in `useRanking.ts` (5 min)
- Add secondary sort in 2 components (5 min)

**Total Estimated Time**: ~20 minutes

---

**Last Updated**: 2025-10-09  
**Status**: Findings Complete ✅ | Ready for Diff Plan

