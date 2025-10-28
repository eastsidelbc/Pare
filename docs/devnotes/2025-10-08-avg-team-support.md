# 2025-10-08 — Special "Avg Tm/G" Team Support (Multi-Phase)

- Link to rules: See `CLAUDE.md` (source of truth); not duplicated here.

## Context
Implementing support for the special "Avg Tm/G" CSV row (league average per-game stats) to appear in both TeamDropdown and RankingDropdown with special visual treatment.

**Goal**: 
- Show "Avg Tm/G" last in both dropdowns (after all 32 real teams)
- Display with "📊 Avg" badge in RankingDropdown
- Display with "📊" emoji + "Avg (per game)" label in TeamDropdown
- Never assign a rank to average (no 33rd team)
- Allow selection for benchmarking (e.g., compare Cowboys vs League Avg)

**Strategy**: Multi-phase implementation for incremental testing and approval.

---

## Phase 1: Foundation - Utility Functions ✅ COMPLETE

### Decisions
- Created centralized utility module `utils/teamHelpers.ts` for all special team detection logic
- Separate concerns: `isAverageTeam` (selectable average) vs `isNonSelectableSpecialTeam` (League Total, Avg Team)
- `shouldExcludeFromRanking` consolidates all special teams that shouldn't get ranks
- Helper functions for display labels and emojis

### Implementation Notes

#### Files Created

**`utils/teamHelpers.ts`** (NEW)
- `isAverageTeam(teamName)` - Detects "Avg Tm/G" variants
- `isNonSelectableSpecialTeam(teamName)` - Detects "League Total", "Avg Team" (not average)
- `shouldExcludeFromRanking(teamName)` - All special teams to exclude from ranking
- `getTeamDisplayLabel(teamName)` - Returns "Avg (per game)" for average, original name otherwise
- `getTeamEmoji(teamName)` - Returns "📊" for average, null otherwise

**`utils/__tests__/teamHelpers.test.ts`** (NEW)
- Console-friendly test cases for all utility functions
- Can be imported and run in browser console for verification

#### CSV Verification
Confirmed both CSV files contain the "Avg Tm/G" row:
- `data/pfr/offense-2025.csv:37` - Contains "Avg Tm/G" with per-game averages
- `data/pfr/defense-2025.csv:37` - Contains "Avg Tm/G" with per-game averages

Example row:
```csv
,Avg Tm/G,,23.5,329.2,61.2,5.4,1.2,0.5,19.7,21.6,32.7,214.4,1.6,0.7,6.1,11.0,26.2,114.8,0.9,4.4,6.5,7.3,58.5,2.2,40.1,10.6,
```

### Testing Phase 1

#### Manual Browser Console Test
```javascript
// In browser console after dev server running:
import { isAverageTeam, getTeamDisplayLabel, getTeamEmoji } from '@/utils/teamHelpers';

// Test detection
console.log(isAverageTeam('Avg Tm/G')); // Should log: true
console.log(isAverageTeam('Buffalo Bills')); // Should log: false

// Test display
console.log(getTeamDisplayLabel('Avg Tm/G')); // Should log: "Avg (per game)"
console.log(getTeamEmoji('Avg Tm/G')); // Should log: "📊"
```

#### Verification Checklist
- [x] `utils/teamHelpers.ts` created with 5 utility functions
- [x] Test file created for manual verification
- [x] CSV data confirmed to contain "Avg Tm/G" on line 37
- [x] Functions handle undefined/null gracefully
- [x] TypeScript types are correct (string | undefined parameters)

### Performance Impact
**None** - Pure utility functions, no state, no heavy computation.

### Follow-ups
**Phase 2**: Update TeamDropdown to use these utilities and show average last
**Phase 3**: Update RankingDropdown to show average last with special badge
**Phase 4**: Update DynamicComparisonRow to handle average selection

---

## Phase 2: TeamDropdown Integration ✅ COMPLETE

**Goal**: Show "📊 Avg (per game)" as last option in team selection dropdown

**Changes**:
- ✅ Updated `components/TeamDropdown.tsx` sorting logic (lines 39-59)
- ✅ Separated average team from regular teams using `isAverageTeam()` utility
- ✅ Appended average team after alphabetically sorted teams
- ✅ Rendered "📊" emoji + "Avg (per game)" label (lines 145-147, 176-183)
- ✅ Added visual separator with border-top (line 157)
- ✅ Updated footer text to indicate "Alphabetical (Avg last)" (line 204)
- ✅ Added aria-label for accessibility

**Verification**:
- Open TeamDropdown → Scroll to bottom → "📊 Avg (per game)" appears after all teams
- Visual separator (border) distinguishes average from regular teams
- Clicking average team selects it correctly

---

## Phase 3: RankingDropdown Integration ✅ COMPLETE

**Goal**: Show "📊 Avg" badge (no rank number) as last option in ranking dropdown

**Changes**:
- ✅ Updated `components/RankingDropdown.tsx` sorting logic (lines 84-121)
- ✅ Separated average team and appended after ranked teams (1-32)
- ✅ Set `ranking: null` for average team (line 114)
- ✅ Rendered "📊 Avg" badge instead of rank number (lines 266-268, 287-293)
- ✅ Added visual separator with border-top (line 278)
- ✅ Added conditional rendering for emoji + "Avg" text

**Verification**:
- Click rank badge → Ranking dropdown opens
- Scroll to bottom → "📊 Avg" appears after rank 32
- No numeric rank shown for average
- Visual separator distinguishes average from ranked teams
- **When average selected**: Rank badge shows "📊 Avg" (clickable to switch back)

---

## Phase 4: Comparison View Integration ✅ COMPLETE

**Goal**: When average team selected, show "📊 Avg" instead of rank pill

**Changes**:
- ✅ Updated `components/DynamicComparisonRow.tsx` imports (line 16)
- ✅ Added conditional rendering for Team A (lines 137-141)
- ✅ Added conditional rendering for Team B (lines 169-173)
- ✅ Check if `isAverageTeam()` before showing RankingDropdown
- ✅ Show "📊 Avg" badge when average team is selected
- ✅ Stat bars render normally (no special handling needed)

**Verification**:
- Select "Avg (per game)" as Team A or Team B
- Comparison row shows "📊 Avg" badge instead of rank pill
- Stat values display correctly (e.g., "Cowboys 151 pts vs Avg 114.6 pts")
- Bars render proportionally based on values

---

---

## Post-Implementation Fixes ✅

### Fix #1: "Avg" Badge Not Showing in RankingDropdown Button
**Problem**: After selecting "Avg" from RankingDropdown, the rank badge showed "N/A" instead of "📊 Avg"

**Root Cause**: Current team ranking lookup returned `undefined` for average team (excluded from rankings), causing button to display "N/A"

**Solution** (`components/RankingDropdown.tsx` lines 125, 221-228):
- Added `isCurrentTeamAverage` detection in RankingDropdown
- Conditional rendering in closed state button
- Shows "📊 Avg" when average is selected (not "N/A")
- Badge remains clickable to switch back to ranked teams

### Fix #2: "Avg" Badge Not Clickable in Comparison View
**Problem**: When average team selected, comparison row showed static "📊 Avg" text (not clickable)

**Root Cause**: DynamicComparisonRow had conditional check that replaced RankingDropdown with static div when average selected

**Solution** (`components/DynamicComparisonRow.tsx` lines 136-151, 163-178):
- Removed `isAverageTeam` conditional checks in DynamicComparisonRow
- Always render RankingDropdown component (when callback exists)
- RankingDropdown itself now handles showing "📊 Avg" button correctly
- Removed unused imports (`isAverageTeam`, `getTeamEmoji`)

**Verification**:
- Select "Avg" from any dropdown → Badge shows "📊 Avg" (clickable)
- Click "📊 Avg" badge in comparison row → Dropdown opens
- Can switch between average and any ranked team seamlessly
- Badge is interactive in all states (ranked team or average)

---

## Related Documentation
- Original findings report: See comprehensive analysis in previous chat messages
- CLAUDE.md: Hook-based architecture, component responsibilities
- Original prompt: `c:\Users\Jeremy\Desktop\prompt.txt`

## Graduated to CLAUDE
Not yet - will update after all phases complete and tested.

