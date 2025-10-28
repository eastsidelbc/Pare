# Team Select & Ranking Tie Logic - File Map

**Audit Date**: 2025-10-09  
**Branch**: `fix/mobile-teamselect-avg-and-ties`  
**Scope**: Locate all team selection, ranking, and tie logic

---

## 📦 **Data Sources**

### CSV Files
**Location**: `data/pfr/offense-2025.csv` & `data/pfr/defense-2025.csv`

**Lines 35-37** (identical in both files):
```csv
35: ,Avg Team,,114.6,1604.9,298.3,...          ← NON-SELECTABLE (should be hidden)
36: ,League Total,,3668,51358,9547,...          ← NON-SELECTABLE (should be hidden)
37: ,Avg Tm/G,,23.5,329.2,61.2,...              ← SELECTABLE (keep, pin to bottom)
```

**Issue**: All 3 rows are loaded into data arrays, but only "Avg Tm/G" should be selectable.

---

## 🔧 **Utilities**

### `utils/teamHelpers.ts` (104 lines)

**Function Signatures**:
```typescript
isAverageTeam(teamName): boolean                    // Line 18-25
isNonSelectableSpecialTeam(teamName): boolean       // Line 38-43
shouldExcludeFromRanking(teamName): boolean         // Line 57-65
getTeamDisplayLabel(teamName): string               // Line 78-84
getTeamEmoji(teamName): string | null               // Line 96-102
```

**Key Logic**:
- **Line 18-25**: `isAverageTeam()` identifies "Avg Tm/G", "Avg/TmG", "Average team/G"
- **Line 38-43**: `isNonSelectableSpecialTeam()` identifies "Avg Team", "League Total"
- ⚠️ **Gap**: No function filters data arrays to remove non-selectable teams

---

## 📊 **Ranking Logic**

### `lib/useRanking.ts` (268 lines)

**Exports**:
```typescript
useRanking(allData, metricKey, targetTeam, options)       // Line 31-135
calculateBulkRanking(allData, metricKey, teams, options)  // Line 141-213
useMetricStats(allData, metricKey, options)               // Line 218-267
```

**Tie Logic** (Desktop source of truth):
- **Line 93**: `if (teamValue === targetValue)` → ⚠️ **EXACT EQUALITY (Float Bug!)**
- **Line 104**: `const isTied = teamsWithSameValue > 1`
- **Line 116-122**: Formats as "T-1st", "T-2nd", etc.
- **Line 182**: Same exact equality issue in `calculateBulkRanking`

**Special Team Filtering**:
- **Line 62-64**: Hardcoded list `['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG']`
- **Line 157-159**: Duplicate list in `calculateBulkRanking`
- **Line 239-241**: Duplicate list in `useMetricStats`

**⚠️ Critical Issues**:
1. **Floating-point equality** without precision guard (lines 93, 182)
2. **No deterministic sort** within ties (no secondary sort by team name)
3. **Hardcoded special team lists** (should use `shouldExcludeFromRanking()`)

---

## 📱 **Mobile Components**

### `components/mobile/CompactTeamSelector.tsx` (258 lines)

**Team List Construction**:
```typescript
// Lines 119-130: Sorting logic
const avgTeam = allTeams.find(t => isAverageTeam(t.team));
const regularTeams = allTeams.filter(t => !isAverageTeam(t.team));
const sorted = regularTeams.sort((a, b) => a.team.localeCompare(b.team));
if (avgTeam) {
  sorted.push(avgTeam);  // ← Appends "Avg Tm/G" last
}
```

**⚠️ Issue**: 
- Only filters by `isAverageTeam`, **NOT** by `isNonSelectableSpecialTeam`
- "Avg Team" and "League Total" **may still appear** if present in `allTeams` prop!

---

### `components/mobile/CompactRankingDropdown.tsx` (323 lines)

**Ranking Calculation**:
```typescript
// Lines 126-139: Uses calculateBulkRanking (correct)
const allTeamRankings = useMemo(() => {
  const rankingOptions: RankingOptions = {
    higherIsBetter,
    excludeSpecialTeams: true  // ← Filters special teams in ranking
  };
  return calculateBulkRanking(allData, metricKey, teamNames, rankingOptions);
}, [allData, metricKey, panelType]);
```

**Team List Construction**:
```typescript
// Lines 142-158: Sorting logic
const avgTeam = allData.find(t => isAverageTeam(t.team));
const regularTeams = allData.filter(t => !isAverageTeam(t.team));

const sorted = regularTeams
  .map(team => ({ team, ranking, value, formattedValue }))
  .filter(item => item.ranking)  // ← Only ranked teams
  .sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999));  // ← Sort by rank

if (avgTeam) {
  sorted.push({ team: avgTeam, ranking: null, ... });  // ← Appends last
}
```

**⚠️ Issues**:
1. **No deterministic sort within ties**: When ranks are equal (e.g., T-5), order is arbitrary
2. **No secondary sort by team name**: Ties may reorder on re-render
3. **Only filters by `isAverageTeam`**: "Avg Team" and "League Total" might appear!

---

## 🖥️ **Desktop Components** (Reference)

### `components/RankingDropdown.tsx` (310 lines)

**Same pattern** as mobile:
- Line 87-88: Filters by `isAverageTeam`
- Line 107-115: Sorts by rank, appends average last
- ⚠️ **Same issues**: No secondary sort, no filter for non-selectable teams

### `components/TeamDropdown.tsx` (175 lines)

**Line 41-53**: Has additional filtering!
```typescript
const avgTeam = allTeams.find(t => isAverageTeam(t.team));
const regularTeams = allTeams
  .filter(t => 
    !isAverageTeam(t.team) &&                      // ← Exclude average
    !isNonSelectableSpecialTeam(t.team)            // ← ✅ Exclude non-selectable!
  )
  .sort((a, b) => a.team.localeCompare(b.team));

if (avgTeam) {
  sorted.push(avgTeam);
}
```

**✅ Desktop TeamDropdown DOES filter non-selectable teams!**  
**❌ Mobile CompactTeamSelector DOES NOT!**

---

## 🎯 **Summary of Findings**

| Component | Filters Non-Selectable? | Pins Avg Tm/G Last? | Deterministic Tie Sort? |
|-----------|-------------------------|---------------------|-------------------------|
| **Desktop TeamDropdown** | ✅ Yes (line 47) | ✅ Yes (line 53) | N/A |
| **Mobile CompactTeamSelector** | ❌ **NO** | ✅ Yes (line 127) | N/A |
| **Desktop RankingDropdown** | ❌ **NO** | ✅ Yes (line 107) | ❌ **NO** |
| **Mobile CompactRankingDropdown** | ❌ **NO** | ✅ Yes (line 162) | ❌ **NO** |

---

## 🐛 **Root Causes Identified**

### Issue #1: Non-Selectable Teams May Appear in Mobile
**Affected**: `components/mobile/CompactTeamSelector.tsx:120`  
**Current**: `allTeams.filter(t => !isAverageTeam(t.team))`  
**Missing**: Filter for `isNonSelectableSpecialTeam`

**Risk**: If "Avg Team" or "League Total" are in the data, they'll appear in mobile Team Select.

---

### Issue #2: Floating-Point Equality in Tie Detection
**Affected**: `lib/useRanking.ts:93, 182`  
**Current**: `if (teamValue === targetValue)`  
**Problem**: Fails for values like `5.7` vs `5.700000001` (precision noise)

**Example**:
```typescript
const a = 5.7;
const b = 5.7 + 0.0000001;
a === b  // false → Won't detect tie!
```

---

### Issue #3: No Deterministic Sort Within Ties
**Affected**: `components/mobile/CompactRankingDropdown.tsx:148-149`  
**Current**: `.sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999))`  
**Problem**: When ranks are equal (T-5), no secondary sort by team name

**Result**: Team order within ties is arbitrary and may change on re-render.

---

## 📋 **Files to Modify**

### Phase 2A: Filter Non-Selectable Teams
1. **`components/mobile/CompactTeamSelector.tsx:120`**
   - Add `!isNonSelectableSpecialTeam(t.team)` filter
   - ✅ Already pins "Avg Tm/G" last

2. **`components/mobile/CompactRankingDropdown.tsx:144`**
   - Add `!isNonSelectableSpecialTeam(t.team)` filter
   - ✅ Already pins "Avg Tm/G" last

### Phase 2B: Fix Tie Logic
1. **`lib/useRanking.ts:93, 182`**
   - Replace exact equality with precision-aware comparison
   - Add helper: `areValuesEqual(a, b, epsilon = 0.001)`

2. **`components/mobile/CompactRankingDropdown.tsx:148-149`**
   - Add secondary sort by team name within ties
   - `.sort((a, b) => { ... if (rankA === rankB) return a.team.team.localeCompare(b.team.team); ... })`

3. **`components/RankingDropdown.tsx:107-115`** (Desktop - optional)
   - Same fix for consistency

---

## ✅ **Already Working Correctly**

- ✅ `isAverageTeam()` utility correctly identifies "Avg Tm/G"
- ✅ `isNonSelectableSpecialTeam()` utility correctly identifies non-selectable teams
- ✅ "Avg Tm/G" excluded from ranking calculations (`excludeSpecialTeams: true`)
- ✅ "Avg Tm/G" appears last in all dropdowns
- ✅ "T-" prefix formatting works correctly (`formatRank()`)
- ✅ Desktop `TeamDropdown` filters non-selectable teams

---

**Last Updated**: 2025-10-09  
**Status**: Audit Complete ✅ | Ready for Phase 1E (Findings + Diff Plan)

