# Cross-Surface Ranking - File Map

**Date**: 2025-10-09  
**Audit Type**: SOT conformance and drift detection  
**Scope**: Desktop vs Mobile ranking, derivation, formatting, and filtering

---

## 🎯 Source of Truth (SOT) Libraries

### 1. Ranking Computation

**File**: `lib/useRanking.ts`  
**Lines**: 1-284  
**Purpose**: Client-side ranking system with precision-aware tie detection

| Function | Lines | Purpose |
|----------|-------|---------|
| `areValuesEqual()` | 27-29 | Precision guard (epsilon=0.001) for float comparison |
| `useRanking()` | 47-151 | Main ranking hook for single team |
| `calculateBulkRanking()` | 157-229 | Bulk ranking utility for multiple teams |
| `useMetricStats()` | 234-283 | League-wide stats (min/max/avg/median) |

**Key Parameters**:
- **Epsilon**: `0.001` (3 decimal places) - line 27
- **Tie Detection**: `Math.abs(a - b) < epsilon` - line 28
- **Rank Formula**: `betterTeamsCount + 1` - line 119, 207
- **Tie Flag**: `isTied = teamsWithSameValue > 1` - line 120, 208
- **Label Format**: `"T-{n}th"` if tied - lines 131-138, 210-217
- **Special Teams Filter**: `['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG']` - lines 78-81, 173-176

**No Secondary Sort**: Rank computation does NOT include alphabetical tiebreaker

---

### 2. Value Derivation (Per-Game Transform)

**File**: `utils/teamDataTransform.ts`  
**Lines**: 1-116  
**Purpose**: Transform raw CSV data by display mode

| Function | Lines | Purpose |
|----------|-------|---------|
| `transformApiResponseToTeamData()` | 15-32 | API → UI format conversion |
| `transformTeamDataByMode()` | 38-59 | **Main per-game transform** |
| `transformAllTeamDataByMode()` | 64-71 | Batch transform |
| `transformApiResponseWithMode()` | 76-82 | Combined transform |
| `shouldConvertFieldToPerGame()` | 88-115 | Field whitelist logic |

**🔴 CRITICAL LINE 54** - Rounding Before Ranking:
```typescript
transformedData[key] = (numericValue / games).toFixed(1);  // ← Rounds to string
```

**Impact**: This rounds values **BEFORE** ranking computation, breaking tie detection.

**Whitelisted Fields** (lines 94-115):
- **Skip**: `g`, `rk`, `team`, `*pct*`, `*per*`, `*_per_att`, `*_per_play*`
- **Convert**: All counting stats (points, yards, attempts, TDs)

---

### 3. Display Mode Hook

**File**: `lib/useDisplayMode.ts`  
**Lines**: 1-82  
**Purpose**: Manage per-game vs total toggle

| Function | Lines | Purpose |
|----------|-------|---------|
| `useDisplayMode()` | 37-81 | Main hook with mode state |
| `transformTeamData` callback | 49-52 | Single team transform |
| `transformAllData` callback | 54-57 | Batch transform |

**Delegates to**: `utils/teamDataTransform.ts` functions

---

### 4. Rank Label Formatting

**Location**: `lib/useRanking.ts`  
**Lines**: 131-138, 210-217  
**Logic**: Same function in both `useRanking` and `calculateBulkRanking`

```typescript
const formatRank = (rankNum: number, tied: boolean): string => {
  const prefix = tied ? 'T-' : '';
  
  if (rankNum === 1) return `${prefix}1st`;
  if (rankNum === 2) return `${prefix}2nd`;
  if (rankNum === 3) return `${prefix}3rd`;
  return `${prefix}${rankNum}th`;
};
```

**Examples**: "1st", "T-2nd", "T-13th", "30th"

**No Separate Formatter**: Label formatting is inline, not extracted to separate utility

---

### 5. Value Display Formatting

**File**: `lib/metricsConfig.ts`  
**Lines**: 427-448  
**Function**: `formatMetricValue()`

| Format Type | Lines | Logic |
|-------------|-------|-------|
| `'percentage'` | 439 | `numValue.toFixed(1) + '%'` |
| `'decimal'` | 437 | `numValue.toFixed(1)` |
| `'time'` | 441-446 | `MM:SS` format |
| `'number'` (default) | 435 | `Math.round(numValue).toString()` |

**Usage**: Display only (after ranking computed)

---

### 6. Team Options / Filtering

**File**: `utils/teamHelpers.ts`  
**Lines**: 1-66  
**Purpose**: Identify special team types

| Function | Lines | Purpose |
|----------|-------|---------|
| `isAverageTeam()` | 15-17 | Checks if team is "Avg Tm/G" |
| `shouldExcludeFromRanking()` | 25-35 | Checks if team should be excluded from ranks |
| `isNonSelectableSpecialTeam()` | 38-43 | Checks if team should be hidden from selectors |

**Special Teams**:
- **"Avg Tm/G"**: Show in UI, pin to bottom, **never rank**
- **"Avg Team"**: Hide from selectors (synthetic average)
- **"League Total"**: Hide from selectors

**Filter Pattern** (line 27-33):
```typescript
const SPECIAL_TEAMS = ['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'];
```

---

## 🖥️ Desktop Components

### 1. Main Compare Screen

**File**: `app/compare/page.tsx`  
**Lines**: 1-276  
**Purpose**: Root page component with team selection state

| Lines | What |
|-------|------|
| 35 | `useNflStats()` - fetch raw CSV data |
| 38-46 | Default teams selection (Vikings, Lions) |
| 49-50 | Global `selectedTeamA`, `selectedTeamB` state |
| 87-179 | Desktop layout (≥1024px) |
| 181-247 | Mobile layout (<1024px) |

**Data Flow**: `useNflStats` → `OffensePanel` / `DefensePanel` → `DynamicComparisonRow`

---

### 2. Desktop Panels

**File**: `components/OffensePanel.tsx` / `components/DefensePanel.tsx`  
**Lines**: 1-155 (Offense), 1-157 (Defense)  
**Purpose**: Desktop panel containers

| Lines | What |
|-------|------|
| 41-45 | `useDisplayMode('per-game')` - manage mode toggle |
| 44 | `transformTeamData` - transform for display |
| 68-88 | Team selector headers |
| 90-107 | Metric rows rendering |

**No Ranking Here**: Panels delegate to `DynamicComparisonRow` for rankings

---

### 3. Desktop Comparison Row

**File**: `components/DynamicComparisonRow.tsx`  
**Lines**: 1-240  
**Purpose**: Individual metric comparison with bars + rankings

| Lines | What |
|-------|------|
| 51-54 | `useRanking()` for Team A |
| 56-59 | `useRanking()` for Team B |
| 77-86 | `useBarCalculation()` for visual bars |
| 196-231 | Render with `RankingDropdown` integration |

**Ranking Options** (lines 51-58):
```typescript
useRanking(allData, metricKey, teamAData?.team || '', { 
  higherIsBetter,
  excludeSpecialTeams: true 
});
```

**No Transform Before Ranking**: Uses `allData` directly (but `allData` is from panel, which may be transformed)

---

### 4. Desktop Ranking Dropdown

**File**: `components/RankingDropdown.tsx`  
**Lines**: 1-341  
**Purpose**: Rank-based team selector dropdown

| Lines | What |
|-------|------|
| 70-82 | `calculateBulkRanking()` for all teams |
| 85-119 | `sortedTeams` calculation |
| 87-88 | Separate average team from regular teams |
| 104-105 | **PRIMARY SORT ONLY**: `.sort((a, b) => (a.ranking?.rank \|\| 999) - (b.ranking?.rank \|\| 999))` |
| 108-118 | Append average team last (null ranking) |
| 196-202 | Tie badge rendering (amber + 🔸 emoji) |
| 308 | Tie background styling (amber) |

**⚠️ NO SECONDARY SORT**: Only sorts by rank, no alphabetical tiebreaker

**Tie Styling** (lines 196-202):
```typescript
const textColor = ranking.isTied ? 'rgb(251, 191, 36)' : 'rgb(196, 181, 253)';
{ranking.isTied && '🔸 '}({ranking.formattedRank})
```

---

### 5. Desktop Team Dropdown

**File**: `components/TeamDropdown.tsx`  
**Lines**: 1-140  
**Purpose**: Alphabetical team selector

| Lines | What |
|-------|------|
| 44-47 | Filter special teams using `isAverageTeam`, `isNonSelectableSpecialTeam` |
| 51 | **Alphabetical sort**: `.sort((a, b) => a.team.localeCompare(b.team))` |
| 56-60 | Append average team last |

**Filter Logic** (lines 44-47):
```typescript
.filter(t => 
  !isAverageTeam(t.team) &&
  !isNonSelectableSpecialTeam(t.team)
)
```

---

## 📱 Mobile Components

### 1. Mobile Layout Shell

**File**: `components/mobile/MobileCompareLayout.tsx`  
**Lines**: 1-126  
**Purpose**: Mobile wrapper with top/bottom bars

| Lines | What |
|-------|------|
| 26-31 | `useNflStats()` - same data source as desktop |
| 35-38 | Global team selection state |
| 65-89 | Render `CompactPanel` for offense/defense |

**Data Source**: Identical to desktop (`useNflStats`)

---

### 2. Mobile Panel

**File**: `components/mobile/CompactPanel.tsx`  
**Lines**: 1-165  
**Purpose**: Mobile panel container with display mode

| Lines | What |
|-------|------|
| 47 | `useDisplayMode('per-game')` - same hook as desktop |
| 71 | `transformAllData(allData)` - batch transform |
| 72-73 | `transformTeamData(teamAData/teamBData)` - individual transforms |
| 144 | Pass `transformedAllData` to `CompactComparisonRow` |

**🔴 IMPORTANT**: Transforms data **BEFORE** passing to ranking

---

### 3. Mobile Comparison Row

**File**: `components/mobile/CompactComparisonRow.tsx`  
**Lines**: 1-196  
**Purpose**: Mobile metric row with bars + rankings

| Lines | What |
|-------|------|
| 81-84 | `useRanking()` for Team A |
| 86-89 | `useRanking()` for Team B |
| 92-99 | `useBarCalculation()` for bars |
| 127-157 | Render `CompactRankingDropdown` integration |

**Ranking Options** (lines 82-83):
```typescript
useRanking(allData, metricField, teamA, {
  higherIsBetter: panelType === 'defense' ? !metricConfig.higherIsBetter : metricConfig.higherIsBetter,
  excludeSpecialTeams: true
});
```

**Same as Desktop**: Uses `allData` (transformed by parent)

---

### 4. Mobile Ranking Dropdown

**File**: `components/mobile/CompactRankingDropdown.tsx`  
**Lines**: 1-341  
**Purpose**: Mobile rank-based team selector

| Lines | What |
|-------|------|
| 138 | `calculateBulkRanking()` for all teams |
| 143-170 | `sortedTeams` calculation |
| 144-146 | Filter `isNonSelectableSpecialTeam` |
| 148-149 | Separate average team |
| 151-162 | Map teams with rankings |
| 164 | Filter teams without rankings |
| 165-169 | **🔴 SECONDARY SORT**: Alphabetical within ties |
| 173-183 | Append average team last |
| 213-218 | **Main badge**: Purple text, no emoji (recently changed) |
| 295-311 | **Dropdown badge**: Amber background for ties, rank number shown |

**⚠️ DRIFT DETECTED** (lines 165-169):
```typescript
.sort((a, b) => {
  const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
  if (rankDiff !== 0) return rankDiff;
  // Same rank → alphabetical by team name
  return a.team.team.localeCompare(b.team.team);  // ← EXTRA SORT (desktop doesn't have)
});
```

**Tie Styling** (current state per user request):
- **Main badge** (line 215): Purple `rgb(196, 181, 253)`, no emoji
- **Dropdown list** (lines 300-307): Amber `rgba(251, 191, 36, 0.2)` background

---

### 5. Mobile Team Selector

**File**: `components/mobile/CompactTeamSelector.tsx`  
**Lines**: 1-198  
**Purpose**: Mobile alphabetical team selector

| Lines | What |
|-------|------|
| 111-113 | Filter average team |
| 119-122 | Filter `isNonSelectableSpecialTeam` |
| 126 | **Alphabetical sort**: `.sort((a, b) => a.team.localeCompare(b.team))` |
| 131-139 | Append average team last |

**Same as Desktop**: Identical filter + sort logic

---

## 🔄 Data Flow Call Graphs

### Desktop Per-Game Flow

```
app/compare/page.tsx
  └─ useNflStats() → Raw CSV data
       └─ OffensePanel / DefensePanel
            └─ useDisplayMode('per-game')
                 └─ transformTeamData() → utils/teamDataTransform.ts:38-59
                      └─ Line 54: .toFixed(1) ← 🔴 ROUNDS BEFORE RANKING
                           └─ DynamicComparisonRow
                                └─ useRanking(transformedData) → lib/useRanking.ts:47-151
                                     └─ areValuesEqual() with epsilon=0.001
                                          └─ Returns { rank, formattedRank, isTied }
                                               └─ RankingDropdown
                                                    └─ calculateBulkRanking() for all teams
                                                         └─ Sort by rank (NO secondary sort)
                                                              └─ Render: Amber + 🔸 for ties
```

---

### Mobile Per-Game Flow

```
components/mobile/MobileCompareLayout.tsx
  └─ useNflStats() → Raw CSV data (SAME SOURCE)
       └─ CompactPanel
            └─ useDisplayMode('per-game')
                 └─ transformAllData() → utils/teamDataTransform.ts:64-71
                      └─ Calls transformTeamDataByMode() for each team
                           └─ Line 54: .toFixed(1) ← 🔴 ROUNDS BEFORE RANKING (SAME BUG)
                                └─ CompactComparisonRow
                                     └─ useRanking(transformedData) → lib/useRanking.ts:47-151 (SAME)
                                          └─ areValuesEqual() with epsilon=0.001 (SAME)
                                               └─ Returns { rank, formattedRank, isTied }
                                                    └─ CompactRankingDropdown
                                                         └─ calculateBulkRanking() for all teams (SAME)
                                                              └─ Sort by rank + 🔴 ALPHABETICAL (EXTRA)
                                                                   └─ Render: Purple badge (main), Amber dropdown (ties)
```

---

### Desktop Total Flow

```
Same as Desktop Per-Game, but:
  └─ useDisplayMode('total')
       └─ transformTeamData() → Line 43: return teamData (NO TRANSFORM)
            └─ Raw values passed to useRanking() ← ✅ NO ROUNDING
```

---

### Mobile Total Flow

```
Same as Mobile Per-Game, but:
  └─ useDisplayMode('total')
       └─ transformAllData() → Line 43: return teamData (NO TRANSFORM)
            └─ Raw values passed to useRanking() ← ✅ NO ROUNDING
```

---

## 📊 Summary: SOT Usage by Surface

| Stage | Desktop | Mobile | Uses SOT? |
|-------|---------|--------|-----------|
| **Data Fetch** | `useNflStats()` | `useNflStats()` | ✅ Same |
| **Per-Game Transform** | `transformTeamDataByMode()` | `transformAllTeamDataByMode()` | ✅ Same (both call same util) |
| **🔴 Rounding Issue** | Line 54: `.toFixed(1)` BEFORE rank | Line 54: `.toFixed(1)` BEFORE rank | ❌ Same bug on both |
| **Rank Computation** | `useRanking()` | `useRanking()` | ✅ Same |
| **Tie Detection** | `areValuesEqual(epsilon=0.001)` | `areValuesEqual(epsilon=0.001)` | ✅ Same |
| **Label Formatting** | Inline `formatRank()` | Inline `formatRank()` | ✅ Same |
| **Special Teams Filter** | `isNonSelectableSpecialTeam()` | `isNonSelectableSpecialTeam()` | ✅ Same |
| **Dropdown Sort** | Rank only (NO secondary) | Rank + 🔴 alphabetical | ❌ Mobile has extra sort |
| **Display Formatting** | `formatMetricValue()` | `formatMetricValue()` | ✅ Same |
| **Tie Badge Style** | Amber + 🔸 emoji | Purple (main), Amber (dropdown) | ⚠️ Different |

---

## 🚨 Violations Summary

| Issue | File:Line | Impact | Fix |
|-------|-----------|--------|-----|
| **Rounding before ranking** | `utils/teamDataTransform.ts:54` | ❌ Breaks ties in per-game mode | Move `.toFixed(1)` to display layer |
| **Mobile secondary sort** | `components/mobile/CompactRankingDropdown.tsx:165-169` | ⚠️ Cosmetic only (display order) | Remove or add to desktop |
| **Tie badge styling** | Desktop vs Mobile | ⚠️ Visual inconsistency | Define single style guide |

---

**Last Updated**: 2025-10-09  
**Status**: File map complete, ready for findings analysis

