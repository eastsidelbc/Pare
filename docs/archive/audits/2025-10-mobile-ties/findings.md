# Mobile Tie Display Audit - Findings

**Date**: 2025-10-09  
**Scope**: Desktop vs Mobile rank computation and tie display differences  
**Spec**: results.txt (minimal UI change, no math changes yet)

---

## 🎯 **Current State Analysis**

### Desktop Rank Math (Source of Truth)
**Location**: `lib/useRanking.ts`

**Line 109** (useRanking function):
```typescript
if (areValuesEqual(teamValue, targetValue)) {  // ← PRECISION GUARD ADDED
  teamsWithSameValue++;
}
```

**Line 198** (calculateBulkRanking function):
```typescript
if (areValuesEqual(teamValue, targetValue)) {  // ← PRECISION GUARD ADDED
  teamsWithSameValue++;
}
```

**Line 27-29** (helper function):
```typescript
function areValuesEqual(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) < epsilon;
}
```

**Precision**: Epsilon = 0.001 (3 decimal places)  
**Tie Detection**: Precision-aware comparison  
**Tie Formatting**: Lines 116-122 format as "T-5th", "T-2nd", etc.

---

### Mobile Rank Math
**Location**: `components/mobile/CompactRankingDropdown.tsx`

**Line 138**: Uses `calculateBulkRanking` (same as desktop)
```typescript
return calculateBulkRanking(allData, metricKey, teamNames, rankingOptions);
```

**Line 163-168** (secondary sort ADDED):
```typescript
.sort((a, b) => {
  const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
  if (rankDiff !== 0) return rankDiff;
  // Same rank → alphabetical by team name
  return a.team.team.localeCompare(b.team.team);
});
```

**Precision**: Same as desktop (epsilon = 0.001)  
**Tie Detection**: Same function as desktop  
**Secondary Sort**: ADDED (alphabetical within ties)

---

### Mobile Tie Display (Current Implementation)
**Location**: `components/mobile/CompactRankingDropdown.tsx`

**Line 214-220** (rank badge):
```typescript
const textColor = ranking.isTied ? 'rgb(251, 191, 36)' : 'rgb(196, 181, 253)';

return (
  <span className="text-[11px] font-medium" style={{ color: textColor }}>
    {ranking.isTied && '🔸 '}({ranking.formattedRank})
  </span>
);
```

**Line 310** (dropdown list):
```typescript
{isAverage ? emoji : (isTied ? '🔸' : item.ranking?.rank)}
```

**Line 300-307** (dropdown styling):
```typescript
background: isTied 
  ? 'rgba(251, 191, 36, 0.2)'  // ← AMBER for ties
  : 'rgba(100, 116, 139, 0.3)'
color: isTied 
  ? 'rgb(251, 191, 36)'  // ← AMBER text
  : 'rgb(148, 163, 184)'
```

---

## ⚠️ **Results.txt Specification Violations**

### Current Implementation Has:
1. ❌ **Amber color** for ties (`rgb(251, 191, 36)`)
2. ❌ **Diamond emoji** (`🔸`) for ties
3. ❌ **Different background** for tied badges
4. ✅ **Correct text format** (`T-5th`)

### Results.txt Requires:
1. ✅ Same background color as regular badges
2. ✅ No special color (no gold/amber)
3. ✅ No emoji - just text
4. ✅ Label: `"T13th"` (main screen) or `"T13"` (dropdown)

---

## 🔍 **Root Cause: Desktop vs Mobile Differences**

### Precision/Rounding
- **Desktop**: `areValuesEqual(a, b, epsilon=0.001)` (Line 27)
- **Mobile**: Same function (shared code)
- **Status**: ✅ **IDENTICAL**

### Secondary Sort
- **Desktop RankingDropdown.tsx:105**: NO secondary sort
  ```typescript
  .sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999))
  ```
- **Mobile CompactRankingDropdown.tsx:163**: HAS secondary sort
  ```typescript
  .sort((a, b) => {
    const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
    if (rankDiff !== 0) return rankDiff;
    return a.team.team.localeCompare(b.team.team);  // ← ADDED
  })
  ```
- **Status**: ❌ **DIFFERENT** (mobile has extra sort)

### Filtering
- **Desktop TeamDropdown.tsx:47**:
  ```typescript
  .filter(t => 
    !isAverageTeam(t.team) &&
    !isNonSelectableSpecialTeam(t.team)  // ← Filters "Avg Team", "League Total"
  )
  ```
- **Mobile CompactTeamSelector.tsx:120**:
  ```typescript
  .filter(t => 
    !isAverageTeam(t.team) &&
    !isNonSelectableSpecialTeam(t.team)  // ← ADDED (was missing)
  )
  ```
- **Status**: ✅ **NOW IDENTICAL** (was different)

### Dataset
- **Desktop**: Reads from `useNflStats` → offense/defense CSV
- **Mobile**: Same source
- **Status**: ✅ **IDENTICAL**

---

## 💡 **Root Cause Hypothesis**

### Original Issue: "Desktop T-13th vs Mobile 15th"

**Hypothesis**: Mobile was missing `isTied` boolean in the ranking interface.

**Evidence**:
1. Desktop `RankingDropdown.tsx:36` has `isTied: boolean` in interface
2. Mobile `CompactRankingDropdown.tsx:31` was **missing** `isTied` initially
3. This was added in recent changes (Line 31 now has `isTied: boolean`)

**Before Fix**:
- Mobile didn't receive `isTied` flag
- Displayed as regular rank "15th" instead of "T-13th"

**After Fix**:
- Mobile receives `isTied` flag
- Displays correctly as "T-13th"
- BUT added amber color + emoji (not per results.txt spec)

---

## 📋 **File/Line Pointers Summary**

| Component | File | Line | What |
|-----------|------|------|------|
| **Rank Math (Shared)** | `lib/useRanking.ts` | 27-29 | `areValuesEqual` epsilon=0.001 |
| | | 109 | Tie detection (useRanking) |
| | | 198 | Tie detection (calculateBulkRanking) |
| | | 116-122 | Format as "T-5th" |
| **Desktop Display** | `components/RankingDropdown.tsx` | 36 | Has `isTied` boolean |
| | | 196-202 | Tie emoji (🔸) |
| | | 308 | Amber color for ties |
| **Mobile Display** | `components/mobile/CompactRankingDropdown.tsx` | 31 | Has `isTied` (ADDED) |
| | | 214-220 | Amber + emoji (ADDED) |
| | | 310 | Diamond emoji in list |
| **Mobile Sort** | `components/mobile/CompactRankingDropdown.tsx` | 163-168 | Secondary sort (ADDED) |

---

## 🎨 **Current UI State**

### Main Screen Badge (in comparison row):
- **Format**: `🔸 (T-5th)` when tied
- **Color**: Amber `rgb(251, 191, 36)` when tied
- **Background**: Same as regular badge

### Dropdown List:
- **Rank Badge**: Shows `🔸` instead of rank number when tied
- **Background**: Amber `rgba(251, 191, 36, 0.2)` when tied
- **Text**: Amber color when tied

---

## 📝 **Recommended Changes (Per results.txt)**

### Remove Special Styling:
1. **Line 214**: Remove amber color logic, use standard color
2. **Line 218**: Remove `🔸` emoji
3. **Line 300-307**: Remove amber background, use standard badge color
4. **Line 310**: Show rank number instead of emoji

### Expected Result:
```typescript
// Badge (main screen)
<span className="text-[11px] font-medium" style={{ color: 'rgb(196, 181, 253)' }}>
  ({ranking.formattedRank})  // "T-5th" or "5th"
</span>

// Dropdown list
<div style={{
  background: 'rgba(100, 116, 139, 0.3)',  // Same as non-tie
  color: 'rgb(148, 163, 184)'              // Same as non-tie
}}>
  {item.ranking?.rank}  // "5" not "🔸"
</div>
```

---

## ⏱️ **Quick Test Plan (2 minutes)**

1. Open mobile view on metric with ties (e.g., multiple teams with 5.7 YPA)
2. Main screen badge should show: `(T-13th)` in **purple** (not amber)
3. Open dropdown
4. Tied teams should show rank number **"13"** (not 🔸) in **standard gray**
5. Compare full list order mobile vs desktop - should match

---

## 📊 **Status**

- ✅ Rank math is correct (precision guard working)
- ✅ Tie detection is correct (isTied flag present)
- ✅ Text formatting is correct ("T-13th")
- ❌ **Visual styling violates results.txt** (has amber + emoji)
- ❌ **Secondary sort not in desktop** (mobile has extra)

**Next Step**: Remove amber color + emoji to match results.txt minimal UI spec.

