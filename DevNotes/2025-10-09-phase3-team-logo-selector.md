# Phase 3: Team Logo Dropdown Integration

**Date**: 2025-10-09  
**Status**: ✅ Complete  
**Phase**: Mobile UI Transformation - Phase 3

---

## Context

Phase 3 of mobile transformation implemented team logo dropdown functionality. Clicking team logos in the panel header now opens an alphabetical team selector, completing the full team selection flow on mobile.

**Key Requirements**:
- Tap team logo → Open team selector dropdown
- Alphabetical list of all 32 teams + "Avg" last
- Responsive height: `clamp(320px, 50vh, 420px)`
- "Select Team" header
- Purple accents, Pare styling
- NO conflicts with ranking dropdowns
- Average team support with emoji badge

---

## Implementation

### 1. CompactTeamSelector (`components/mobile/CompactTeamSelector.tsx`)

**New Component** - Alphabetical team dropdown

**Height**: `clamp(320px, 50vh, 420px)` (taller than ranking dropdown for full team list)  
**Width**: 300px

**Structure**:
- Header: "Select Team" label
- Scrollable list: 32 teams alphabetically + "Avg" last
- Each row: Logo (40px) + Team name + Selected indicator
- Average team: Purple emoji badge instead of logo
- Separator before average team

**Styling**:
- Background: `rgba(15, 23, 42, 0.98)` with `backdrop-filter: blur(10px)`
- Selected row: `rgba(139, 92, 246, 0.2)` background
- Purple border for header separator
- Framer Motion animations (scale + opacity)
- Active feedback: `active:opacity-50`

**Interaction**:
- Tap team → Select team + close dropdown
- Tap outside → Close dropdown
- Current team highlighted with purple dot

**Code Pattern** (same as `CompactRankingDropdown`):
```typescript
const sortedTeams = useMemo(() => {
  const avgTeam = allTeams.find(t => isAverageTeam(t.team));
  const regularTeams = allTeams.filter(t => !isAverageTeam(t.team));
  
  // Sort alphabetically
  const sorted = regularTeams.sort((a, b) => a.team.localeCompare(b.team));
  
  // Add average team last
  if (avgTeam) sorted.push(avgTeam);
  
  return sorted;
}, [allTeams]);
```

### 2. State Management in CompactPanel

Added separate dropdown states to prevent conflicts:

```typescript
// Ranking dropdown state management
const [activeDropdown, setActiveDropdown] = useState<{
  metricKey: string;
  team: 'A' | 'B';
} | null>(null);

// Team selector dropdown state management
const [activeTeamSelector, setActiveTeamSelector] = useState<'A' | 'B' | null>(null);
```

**Mutual Exclusion**:
- Opening team selector → Closes ranking dropdown
- Opening ranking dropdown → Closes team selector
- Only one dropdown open at a time per panel

**Logo Click Handler**:
```typescript
const handleLogoClick = (team: 'A' | 'B') => {
  setActiveDropdown(null); // Close ranking dropdown
  if (activeTeamSelector === team) {
    setActiveTeamSelector(null);
  } else {
    setActiveTeamSelector(team);
  }
};
```

### 3. Integration with CompactPanelHeader

Wrapped header in `relative` container for absolute dropdown positioning:

```typescript
<div className="relative">
  <CompactPanelHeader
    type={type}
    teamA={teamA}
    teamB={teamB}
    displayMode={mode}
    onDisplayModeChange={setMode}
    onTeamAClick={() => handleLogoClick('A')}
    onTeamBClick={() => handleLogoClick('B')}
  />
  
  {/* Team A Selector Dropdown */}
  {activeTeamSelector === 'A' && (
    <div className="absolute left-3 top-full z-50">
      <CompactTeamSelector
        allTeams={allData}
        currentTeam={teamA}
        onTeamChange={handleTeamAChange}
        isOpen={true}
        onToggle={() => setActiveTeamSelector(null)}
      />
    </div>
  )}
  
  {/* Team B Selector Dropdown */}
  {activeTeamSelector === 'B' && (
    <div className="absolute right-3 top-full z-50">
      <CompactTeamSelector
        allTeams={allData}
        currentTeam={teamB}
        onTeamChange={handleTeamBChange}
        isOpen={true}
        onToggle={() => setActiveTeamSelector(null)}
      />
    </div>
  )}
</div>
```

---

## Technical Details

### Dropdown Positioning

- **Team A**: `absolute left-3 top-full` (anchored below left logo)
- **Team B**: `absolute right-3 top-full` (anchored below right logo)
- **z-index**: `z-50` (above comparison rows, same as ranking dropdown)

### Data Flow

1. **Logo Click** → `handleLogoClick(team)` → sets `activeTeamSelector`
2. **Team Selected** → `handleTeamAChange(teamName)` → calls `onTeamAChange` prop
3. **Closes Dropdown** → `setActiveTeamSelector(null)` → removes dropdown
4. **Global State Updates** → Parent `MobileCompareLayout` receives team change
5. **All Panels Re-render** → Both Offense and Defense panels update with new team

### Performance

- `useMemo` for sorted teams (alphabetical sort only runs when `allTeams` changes)
- Conditional rendering (dropdown only mounted when open)
- Framer Motion for smooth animations
- No heavy backdrop blur

### Accessibility

- Semantic HTML (`<button>` for team rows)
- Clear visual feedback (opacity change on tap)
- Selected team indicator (purple dot)
- Header label "Select Team"

---

## Files Changed

### New Files Created
- `components/mobile/CompactTeamSelector.tsx` (172 lines)

### Modified Files
- `components/mobile/CompactPanel.tsx` (+35 lines)
  - Added `CompactTeamSelector` import
  - Added `activeTeamSelector` state
  - Added `handleLogoClick` handler
  - Wrapped header in relative container
  - Added two team selector dropdown instances

---

## Testing Checklist

✅ Team A logo opens dropdown (left-aligned)  
✅ Team B logo opens dropdown (right-aligned)  
✅ Dropdown shows all 32 teams alphabetically  
✅ Average team appears last with separator  
✅ Average team shows purple emoji badge (📊)  
✅ Current team highlighted with purple dot  
✅ Tap team → Updates global state → Closes dropdown  
✅ Tap outside → Closes dropdown  
✅ Opening team selector closes ranking dropdown  
✅ Opening ranking dropdown closes team selector  
✅ Works for both Offense and Defense panels  
✅ No lint errors  

---

## User Flow

**Complete team selection flow:**

```
1. User taps team logo in panel header
   ↓
2. Team selector dropdown opens (alphabetical list)
   ↓
3. User scrolls and taps desired team
   ↓
4. Global state updates (all panels affected)
   ↓
5. Dropdown closes automatically
   ↓
6. All comparison rows update with new team data
```

**Alternative: Ranking-based selection:**

```
1. User taps rank text (30th) in comparison row
   ↓
2. Ranking dropdown opens (rank-sorted list)
   ↓
3. User taps desired team
   ↓
4. Same update flow as above
```

---

## Next Steps

**Phase 4**: Remaining mobile polish
- Add metrics selection for mobile (if needed)
- Optimize scrolling performance
- Test on real iOS/Android devices
- Fine-tune animations and transitions

---

## Cross-References

- **Parent Doc**: `docs/devnotes/2025-10-09-phase2-panel-rows.md` (Phase 2)
- **Rules**: `CLAUDE.md` § Mobile Development Roadmap
- **Related Components**:
  - `CompactRankingDropdown` (similar dropdown pattern)
  - `CompactPanelHeader` (logo buttons)
  - `TeamDropdown` (desktop version)

---

**Graduation**: Team selector dropdown pattern is stable and follows established Pare mobile conventions. Could be promoted to `CLAUDE.md` Mobile Component Patterns section if used across other mobile views.

