# Mobile Components Deep Dive for iOS Conversion

**Date**: 2025-10-10  
**Purpose**: Detailed mobile components analysis for SwiftUI conversion  
**Status**: Complete  
**Focus**: React mobile components (<1024px) → SwiftUI patterns  
**Links**:
- General Audit: `docs/devnotes/2025-10-10-ios-conversion-audit.md`
- CLAUDE.md: `CLAUDE.md#ios-swift-development-guidelines`
- Mobile Plan: `Mobile_plan.md`

---

## Executive Summary

This audit provides a **surgical analysis** of the 9 mobile-specific React components, focusing on state management, interaction patterns, and dropdown behavior. These components implement a compact vertical layout inspired by theScore, styled with Pare's visual identity.

**Key Findings**:
- ✅ **Two distinct dropdowns**: Team selector (alphabetical) + Ranking dropdown (rank-sorted)
- ✅ **Mutual exclusion pattern**: Only one dropdown open at a time per panel
- ✅ **Floating UI positioning**: Professional portal-based rendering with auto-flip
- ✅ **Instant toggle**: Display mode switches immediately (no dropdown)
- ✅ **Two-line row layout**: Data line (padded) + bar line (edge-to-edge)

---

## 1. Component Hierarchy & Layout

### **Complete Component Tree**

```
MobileCompareLayout (root)
│
├─ MobileTopBar (fixed, 56px + safe area)
│  └─ "Pare NFL" branding + "2025 Season"
│
├─ Scrollable Content
│  │
│  ├─ CompactPanel (Offense)
│  │  │
│  │  ├─ CompactPanelHeader (70px)
│  │  │  ├─ Team A Logo (40px, tappable) ────┐
│  │  │  │  └─ ref={teamALogoRef}            │
│  │  │  │                                    │
│  │  │  ├─ Center Section                    │
│  │  │  │  ├─ "Offense" title (18px)         │
│  │  │  │  └─ "PER GAME" toggle (instant)    │
│  │  │  │                                    │
│  │  │  └─ Team B Logo (40px, tappable) ────┤
│  │  │     └─ ref={teamBLogoRef}            │
│  │  │                                       │
│  │  ├─ CompactTeamSelector (conditional) <─┴─ activeTeamSelector === 'A' || 'B'
│  │  │  └─ FloatingPortal                     (portal to document.body)
│  │  │     ├─ Backdrop (rgba(0,0,0,0.6))
│  │  │     └─ Dropdown (positioned by Floating UI)
│  │  │        ├─ "Select Team" header
│  │  │        └─ 32 teams (alphabetical) + Avg last
│  │  │
│  │  └─ CompactComparisonRow (×5 metrics)
│  │     │
│  │     ├─ LINE 1: Data + Ranks + Metric Name (WITH 12px padding)
│  │     │  ├─ Team A Value (15px, white)
│  │     │  ├─ CompactRankingDropdown (A) ────┐
│  │     │  │  └─ Rank badge "(15th)"         │
│  │     │  ├─ Metric Name (13px, center)      │
│  │     │  ├─ CompactRankingDropdown (B) ────┤
│  │     │  │  └─ Rank badge "(T-19th)"       │
│  │     │  └─ Team B Value (15px, white)      │
│  │     │                                     │
│  │     ├─ CompactRankingDropdown (conditional) <─┴─ activeDropdown matches metricKey + team
│  │     │  └─ FloatingPortal                     (portal to document.body)
│  │     │     ├─ Backdrop (rgba(0,0,0,0.6))
│  │     │     └─ Dropdown (positioned by Floating UI)
│  │     │        └─ 32 teams (rank-sorted) + Avg last
│  │     │
│  │     └─ LINE 2: Bars (NO padding, edge-to-edge, 6px height)
│  │        ├─ Team A Bar (green gradient, 0-100% width)
│  │        └─ Team B Bar (orange gradient, 0-100% width)
│  │
│  ├─ Purple Divider (1px)
│  │
│  └─ CompactPanel (Defense)
│     └─ (mirrors Offense structure)
│
└─ MobileBottomBar (fixed, 64px + safe area)
   └─ 3 tabs: Stats, Compare (active), Settings
```

### **Props Flow (Top → Down)**

```
MobileCompareLayout receives from ComparePage:
├─ selectedTeamA: string
├─ selectedTeamB: string
├─ onTeamAChange: (team: string) => void
├─ onTeamBChange: (team: string) => void
├─ offenseData: TeamData[]
├─ defenseData: TeamData[]
├─ selectedOffenseMetrics: string[]
├─ selectedDefenseMetrics: string[]
├─ onOffenseMetricsChange: (metrics: string[]) => void
├─ onDefenseMetricsChange: (metrics: string[]) => void
└─ isLoading: boolean

CompactPanel receives from MobileCompareLayout:
├─ type: 'offense' | 'defense'
├─ teamA: string
├─ teamB: string
├─ teamAData: TeamData | null
├─ teamBData: TeamData | null
├─ selectedMetrics: string[]
├─ allOffenseData: TeamData[]
├─ allDefenseData: TeamData[]
├─ onTeamAChange?: (team: string) => void
└─ onTeamBChange?: (team: string) => void

CompactPanelHeader receives from CompactPanel:
├─ type: 'offense' | 'defense'
├─ teamA: string
├─ teamB: string
├─ displayMode: 'per-game' | 'total'
├─ onDisplayModeChange: (mode) => void
├─ activeTeamSelector: 'A' | 'B' | null      ← State from CompactPanel
├─ onTeamAClick?: () => void                  ← Triggers team selector
├─ onTeamBClick?: () => void                  ← Triggers team selector
├─ onTeamAChange?: (team: string) => void     ← Final callback to parent
├─ onTeamBChange?: (team: string) => void     ← Final callback to parent
└─ allData: TeamData[]

CompactComparisonRow receives from CompactPanel:
├─ metricField: string
├─ teamA: string
├─ teamB: string
├─ teamAData: TeamData | null
├─ teamBData: TeamData | null
├─ allData: TeamData[]
├─ panelType: 'offense' | 'defense'
├─ displayMode: 'per-game' | 'total'
├─ activeDropdownTeam?: 'A' | 'B' | null     ← State from CompactPanel
├─ onTeamAChange?: (team: string) => void     ← Final callback to parent
├─ onTeamBChange?: (team: string) => void     ← Final callback to parent
└─ onDropdownToggle?: (team: 'A' | 'B') => void ← Toggle dropdown

CompactRankingDropdown receives from CompactComparisonRow:
├─ allData: TeamData[]
├─ metricKey: string
├─ currentTeam: string
├─ panelType: 'offense' | 'defense'
├─ onTeamChange: (teamName: string) => void
├─ isOpen: boolean                            ← Controlled by parent
├─ onToggle: () => void                       ← Request to toggle
├─ ranking: { rank, formattedRank, isTied }
└─ position: 'left' | 'right'                 ← Team A = left, Team B = right

CompactTeamSelector receives from CompactPanelHeader:
├─ allTeams: TeamData[]
├─ currentTeam: string
├─ onTeamChange: (teamName: string) => void
├─ isOpen: boolean                            ← Controlled by parent
├─ onToggle: () => void                       ← Request to close
└─ triggerElement?: HTMLElement | null        ← Logo button ref
```

---

## 2. State Management (CRITICAL)

### **MobileCompareLayout**

**State**: None (stateless layout wrapper)

**Purpose**: Orchestrates layout and passes props to panels

**Code**:
```typescript
// NO LOCAL STATE
// Pure layout component that receives all state from ComparePage
```

---

### **MobileTopBar**

**State**: None (pure presentational)

**Purpose**: Display branding only

**Code**:
```typescript
// NO STATE
// Fixed header with "Pare NFL" branding + "2025 Season"
```

---

### **MobileBottomBar**

**State**: None (placeholder tabs)

**Purpose**: 3-tab navigation (not functional yet)

**Code**:
```typescript
// NO STATE
// Fixed footer with 3 tabs: Stats, Compare (active), Settings
```

---

### **CompactPanel** ⭐ (STATE MANAGER)

**State**:
```typescript
// Display mode (independent per panel)
const { mode, setMode, transformTeamData, transformAllData } = useDisplayMode('per-game');

// Ranking dropdown state (metricKey + team)
const [activeDropdown, setActiveDropdown] = useState<{
  metricKey: string;
  team: 'A' | 'B';
} | null>(null);

// Team selector dropdown state (which logo was tapped)
const [activeTeamSelector, setActiveTeamSelector] = useState<'A' | 'B' | null>(null);
```

**Purpose**: 
- Manages display mode toggle (per-game ↔ total)
- Controls which dropdown is open (ranking vs team selector)
- Enforces mutual exclusion (only one dropdown at a time)

**Key Logic**:
```typescript
// Handle rank click → open ranking dropdown
const handleRankClick = (metricKey: string, team: 'A' | 'B') => {
  setActiveTeamSelector(null); // Close team selector
  const current = activeDropdown;
  if (current?.metricKey === metricKey && current?.team === team) {
    setActiveDropdown(null); // Toggle off if same
  } else {
    setActiveDropdown({ metricKey, team }); // Open new dropdown
  }
};

// Handle logo click → open team selector
const handleLogoClick = (team: 'A' | 'B') => {
  setActiveDropdown(null); // Close ranking dropdown
  if (activeTeamSelector === team) {
    setActiveTeamSelector(null); // Toggle off if same
  } else {
    setActiveTeamSelector(team); // Open team selector
  }
};

// Handle team change → close all dropdowns
const handleTeamAChange = (teamName: string) => {
  if (onTeamAChange) onTeamAChange(teamName);
  setActiveDropdown(null);
  setActiveTeamSelector(null);
};
```

**Mutual Exclusion Pattern**:
- Opening ranking dropdown closes team selector
- Opening team selector closes ranking dropdown
- Selecting a team closes both dropdowns

---

### **CompactPanelHeader**

**State**:
```typescript
// Refs for logo buttons (for Floating UI positioning)
const teamALogoRef = useRef<HTMLButtonElement>(null);
const teamBLogoRef = useRef<HTMLButtonElement>(null);
```

**Purpose**:
- Renders team logos as tappable buttons
- Instant display mode toggle (no dropdown)
- Conditionally renders CompactTeamSelector when active

**Key Logic**:
```typescript
// Instant toggle (no dropdown, no animation delay)
const handleToggleMode = () => {
  const newMode = displayMode === 'per-game' ? 'total' : 'per-game';
  onDisplayModeChange(newMode);
};
```

**NO local state for dropdown visibility** - controlled by parent (CompactPanel)

---

### **CompactComparisonRow**

**State**: None (completely stateless)

**Purpose**:
- Renders metric value, rank badges, bars
- Delegates dropdown control to parent (CompactPanel)

**Code**:
```typescript
// NO LOCAL STATE
// Receives activeDropdownTeam from parent
// Calls onDropdownToggle to request state change
```

---

### **CompactRankingDropdown** ⭐

**State**:
```typescript
// Floating UI positioning
const { refs, floatingStyles, context, x, y, strategy } = useFloating({
  strategy: 'fixed',
  open: isOpen,      // Controlled by parent
  onOpenChange: onToggle,
  placement: position === 'left' ? 'right-start' : 'left-start',
  middleware: [offset(8), flip(), shift(), size(), inline()],
  whileElementsMounted: autoUpdate
});

// Body scroll lock (when open)
useEffect(() => {
  if (!isOpen) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prev; };
}, [isOpen]);
```

**Purpose**:
- Displays rank badge (trigger button)
- Shows rank-sorted team list (1st-32nd + Avg)
- Uses Floating UI for professional positioning

**Key Features**:
- **Controlled component**: isOpen + onToggle from parent
- **Portal rendering**: Escapes clipping containers
- **Auto-positioning**: Left dropdowns appear RIGHT, right dropdowns appear LEFT
- **Dynamic sizing**: `size()` middleware adjusts to available space
- **Body scroll lock**: Prevents background scrolling when open

**Computed State**:
```typescript
// Calculate rankings for all teams
const allTeamRankings = useMemo(() => {
  const higherIsBetter = panelType === 'defense' ? !metric.higherIsBetter : metric.higherIsBetter;
  return calculateBulkRanking(allData, metricKey, teamNames, { higherIsBetter, excludeSpecialTeams: true });
}, [allData, metricKey, panelType, metric?.higherIsBetter]);

// Sort teams by rank, append average last
const sortedTeams: TeamWithRanking[] = useMemo(() => {
  const avgTeam = allData.find(t => isAverageTeam(t.team));
  const regularTeams = allData.filter(t => !isAverageTeam(t.team));
  
  const sorted = regularTeams
    .map(team => ({ team, ranking: allTeamRankings[team.team], ... }))
    .filter(item => item.ranking)
    .sort((a, b) => a.ranking.rank - b.ranking.rank);
  
  if (avgTeam) sorted.push({ team: avgTeam, ranking: null, ... });
  return sorted;
}, [allData, allTeamRankings, metricKey]);
```

---

### **CompactTeamSelector** ⭐

**State**:
```typescript
// Floating UI positioning (similar to ranking dropdown)
const { refs, floatingStyles, context, x, y, strategy } = useFloating({
  strategy: 'fixed',
  open: isOpen,      // Controlled by parent
  onOpenChange: onToggle,
  placement: 'bottom',
  elements: {
    reference: triggerElement  // Logo button ref from parent
  },
  middleware: [offset(8), flip(), shift(), size(), inline()],
  whileElementsMounted: autoUpdate
});

// Body scroll lock (when open)
useEffect(() => {
  if (!isOpen) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prev; };
}, [isOpen]);
```

**Purpose**:
- Shows alphabetical team list (A-Z)
- Triggered by logo tap in header
- Uses Floating UI for positioning

**Key Features**:
- **Controlled component**: isOpen + onToggle from parent
- **Portal rendering**: Escapes clipping containers
- **External trigger**: Uses triggerElement ref (not internal)
- **Alphabetical sorting**: A-Z teams, average last
- **Body scroll lock**: Prevents background scrolling

**Computed State**:
```typescript
// Sort teams alphabetically, append average last
const sortedTeams = useMemo(() => {
  const avgTeam = allTeams.find(t => isAverageTeam(t.team));
  const regularTeams = allTeams.filter(t => !isAverageTeam(t.team));
  
  const sorted = regularTeams.sort((a, b) => a.team.localeCompare(b.team));
  
  if (avgTeam) sorted.push(avgTeam);
  return sorted;
}, [allTeams]);
```

---

## 3. User Interaction Flows

### **Flow A: Change Team via Logo Tap**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER ACTION: Taps Team A logo in panel header           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CompactPanelHeader: onClick={onTeamAClick}               │
│    → Calls parent's handleLogoClick('A')                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CompactPanel: handleLogoClick('A')                       │
│    → setActiveDropdown(null)    // Close ranking dropdown   │
│    → setActiveTeamSelector('A') // Open team selector       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. React Re-renders CompactPanelHeader                      │
│    → activeTeamSelector === 'A' is now true                 │
│    → Conditionally renders CompactTeamSelector              │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. CompactTeamSelector renders via FloatingPortal          │
│    ┌───────────────────────────────────────────────┐       │
│    │ • Backdrop (rgba(0,0,0,0.6))                  │       │
│    │ • Dropdown positioned by Floating UI          │       │
│    │   - Attached to teamALogoRef                  │       │
│    │   - Placement: 'bottom'                       │       │
│    │   - Auto-flip if no space below               │       │
│    │                                                │       │
│    │ • "Select Team" header                        │       │
│    │ • 32 teams (alphabetical) + Avg last          │       │
│    │   - Arizona Cardinals                         │       │
│    │   - Atlanta Falcons                           │       │
│    │   - ...                                       │       │
│    │   - Washington Commanders                     │       │
│    │   ───────────────────────────────             │       │
│    │   - 📊 Avg (per game)                         │       │
│    └───────────────────────────────────────────────┘       │
│                                                             │
│ • Body scroll locked (overflow: hidden)                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. USER ACTION: Taps "Baltimore Ravens"                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. CompactTeamSelector: handleTeamSelect("Baltimore...")    │
│    → onTeamChange("Baltimore Ravens")                       │
│    → onToggle() // Request close                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. CompactPanel: handleTeamAChange("Baltimore Ravens")      │
│    → onTeamAChange("Baltimore Ravens") // Propagate up      │
│    → setActiveDropdown(null)                                │
│    → setActiveTeamSelector(null) // Close dropdown          │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. ComparePage: handleTeamAChange("Baltimore Ravens")       │
│    → setSelectedTeamA("Baltimore Ravens")                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. React Re-renders Entire Tree                            │
│     • MobileCompareLayout (new teamA prop)                  │
│     • Both CompactPanels (new teamA prop)                   │
│     • All CompactComparisonRows (new teamAData)             │
│     • Team logos update                                     │
│     • Values update                                         │
│     • Rankings recalculate                                  │
│     • Bars animate to new widths (300ms)                    │
└─────────────────────────────────────────────────────────────┘
```

**Visual Result**:
- Dropdown closes with fade-out animation (150ms)
- Team A logo changes to Baltimore Ravens
- All rows update values for new team
- All rankings update (may change from 15th → 3rd)
- All bars animate to new widths (green bar may grow)
- Body scroll unlocked

---

### **Flow B: Change Team via Ranking Badge Tap**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER ACTION: Taps "(15th)" rank badge in Points row     │
│    (Team A side, left of metric name)                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CompactRankingDropdown: onClick={onToggle}               │
│    → Calls parent's onDropdownToggle('A')                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CompactComparisonRow: onDropdownToggle('A')              │
│    → Propagates to parent                                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CompactPanel: receives toggle request                    │
│    • Check if already open for this metric + team           │
│    • If same: setActiveDropdown(null)                       │
│    • If different:                                           │
│      → setActiveTeamSelector(null) // Close team selector   │
│      → setActiveDropdown({                                   │
│          metricKey: 'points',                                │
│          team: 'A'                                           │
│        })                                                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. React Re-renders CompactComparisonRow (Points)           │
│    → activeDropdownTeam === 'A' is now true                 │
│    → Passes isOpen=true to CompactRankingDropdown           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. CompactRankingDropdown renders via FloatingPortal       │
│    ┌───────────────────────────────────────────────┐       │
│    │ • Backdrop (rgba(0,0,0,0.6))                  │       │
│    │ • Dropdown positioned by Floating UI          │       │
│    │   - Attached to rank badge button             │       │
│    │   - Placement: 'right-start' (Team A left)    │       │
│    │   - Auto-flip if off-screen                   │       │
│    │   - Auto-shift to stay within viewport        │       │
│    │                                                │       │
│    │ • Teams sorted by Points (high to low)        │       │
│    │   ┌─────┬────────┬────────────────┬──────┐   │       │
│    │   │ 1   │ [LOGO] │ Baltimore...   │ 30.6 │   │       │
│    │   │ 2   │ [LOGO] │ Buffalo Bills  │ 30.1 │   │       │
│    │   │ 3   │ [LOGO] │ Detroit Lions  │ 29.8 │   │       │
│    │   │ ... │        │                │      │   │       │
│    │   │T-15 │ [LOGO] │ Minnesota...   │ 24.2 │ ← Selected │
│    │   │ ... │        │                │      │   │       │
│    │   │ 32  │ [LOGO] │ Carolina...    │ 18.4 │   │       │
│    │   ├─────┴────────┴────────────────┴──────┤   │       │
│    │   │ 📊  │ [ICON] │ Avg (per game) │ 23.6 │   │       │
│    │   └─────┴────────┴────────────────┴──────┘   │       │
│    │                                                │       │
│    │ • Tied teams have amber background            │       │
│    │ • Selected team has purple highlight          │       │
│    │ • Average team has purple separator           │       │
│    └───────────────────────────────────────────────┘       │
│                                                             │
│ • Body scroll locked (overflow: hidden)                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. USER ACTION: Taps "Baltimore Ravens" (1st ranked)       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. CompactRankingDropdown: handleTeamSelect("Baltimore...") │
│    → onTeamChange("Baltimore Ravens")                       │
│    → onToggle() // Request close                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. CompactPanel: handleTeamAChange("Baltimore Ravens")      │
│    → onTeamAChange("Baltimore Ravens") // Propagate up      │
│    → setActiveDropdown(null) // Close dropdown              │
│    → setActiveTeamSelector(null)                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. ComparePage → setSelectedTeamA("Baltimore Ravens")      │
│     → Full tree re-render (same as Flow A step 10)          │
└─────────────────────────────────────────────────────────────┘
```

**Visual Result**:
- Dropdown closes with fade-out animation (150ms)
- Team A logo changes to Baltimore Ravens
- Points row shows: **30.6** (was 24.2) on left side
- Rank badge changes: **(1st)** (was T-15th)
- Points bar grows significantly (green bar extends right)
- All other metrics update for Baltimore Ravens
- Body scroll unlocked

**Key Difference from Flow A**:
- Dropdown shows **rank-sorted** teams (not alphabetical)
- Positioned **right of badge** (not below logo)
- Only shows teams for **this specific metric** (Points)

---

### **Flow C: Toggle Display Mode**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER ACTION: Taps "PER GAME" button in panel header     │
│    (Center of header, below "Offense" title)                │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CompactPanelHeader: onClick={handleToggleMode}           │
│    const newMode = displayMode === 'per-game'               │
│      ? 'total'                                               │
│      : 'per-game';                                           │
│    → onDisplayModeChange(newMode)                           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CompactPanel: receives onDisplayModeChange('total')      │
│    → setMode('total') // useDisplayMode hook                │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. useDisplayMode: mode changes 'per-game' → 'total'        │
│    → transformAllData() recalculates                         │
│    → transformTeamData() recalculates                        │
│                                                              │
│    PER GAME MODE:                                            │
│    - Points: 30.6 (total 275.4 ÷ 9 games)                   │
│    - Yards: 431.2 (total 3880.8 ÷ 9 games)                  │
│                                                              │
│    TOTAL MODE:                                               │
│    - Points: 275.4 (full season total)                      │
│    - Yards: 3880.8 (full season total)                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. React Re-renders CompactPanel + All Rows                 │
│    • CompactPanelHeader updates button text:                │
│      "PER GAME" → "TOTAL"                                    │
│    • CompactComparisonRow (×5) re-render with new data      │
│    • useRanking() recalculates ranks for TOTAL values       │
│    • useBarCalculation() recalculates bar widths            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Visual Changes (300ms animation)                         │
│                                                              │
│  BEFORE (PER GAME):                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 30.6   (1st)       POINTS      (15th)   24.2        │   │
│  │ ████████████████████████████████░░░░░░░░░░░░░░░░░  │   │
│  │ Green────────────────────────────→ Orange─────→     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  AFTER (TOTAL):                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 275.4  (2nd)       POINTS      (12th)   217.8       │   │
│  │ ████████████████████████████████░░░░░░░░░░░░░░░░░  │   │
│  │ Green────────────────────────────→ Orange─────→     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  • Values change: 30.6 → 275.4 (×9 games)                   │
│  • Ranks may change: (1st) → (2nd)                          │
│  • Bar widths animate smoothly (300ms)                      │
└─────────────────────────────────────────────────────────────┘
```

**Key Characteristics**:
- ⚡ **Instant**: No dropdown, no menu, no delay
- 🎨 **Visual Feedback**: Button text changes immediately
- 📊 **Data Transform**: Values multiply by games played
- 🏆 **Rankings Recalculate**: Different ranks in total vs per-game
- 🎞️ **Smooth Animation**: Bars transition over 300ms

**Why Instant Toggle?**
- Only 2 states (per-game vs total) = simple toggle
- Mobile UX best practice: minimize taps
- Desktop uses dropdown (more space, more options)
- Mobile: Tap = instant switch

---

## 4. Dropdown Management (VERY IMPORTANT)

### **YES, There Are TWO Different Dropdowns**

| Feature | Team Selector | Ranking Dropdown |
|---------|---------------|------------------|
| **Trigger** | Team logo (40px button) | Rank badge "(15th)" (11px text button) |
| **Location** | CompactPanelHeader | CompactComparisonRow |
| **Positioning** | Bottom of logo | Right/left of badge |
| **Content** | 32 teams (alphabetical) + Avg | 32 teams (rank-sorted) + Avg |
| **Sorting** | A-Z by team name | 1-32 by rank for specific metric |
| **Opens When** | Logo tap | Rank badge tap |
| **Closes When** | Team select, backdrop tap, Escape | Team select, backdrop tap, Escape |
| **Purpose** | General team selection | Metric-specific ranked selection |
| **State Location** | CompactPanel.activeTeamSelector | CompactPanel.activeDropdown |
| **React Portal** | Yes (FloatingPortal) | Yes (FloatingPortal) |

---

### **Team Selector (Alphabetical)**

**Component**: `CompactTeamSelector`

**Trigger Element**:
```typescript
// In CompactPanelHeader
<button 
  ref={teamALogoRef}
  onClick={onTeamAClick}
  className="transition-opacity active:opacity-50"
>
  <TeamLogo teamName={teamA} size="40" />
</button>
```

**Positioning Strategy**:
```typescript
const { refs, floatingStyles, context, x, y } = useFloating({
  strategy: 'fixed',     // Viewport positioning
  placement: 'bottom',   // Below logo
  elements: {
    reference: triggerElement  // Logo button ref
  },
  middleware: [
    offset(8),           // 8px gap
    flip(),              // Flip to top if no space
    shift(),             // Stay in viewport
    size(),              // Adjust height dynamically
    inline()             // Better inline positioning
  ],
  whileElementsMounted: autoUpdate
});
```

**Content Structure**:
```typescript
sortedTeams = [
  { team: "Arizona Cardinals", ... },
  { team: "Atlanta Falcons", ... },
  ...
  { team: "Washington Commanders", ... },
  // ─────────────────────────────────
  { team: "Avg Tm/G", isAverage: true }
]
```

**Selection Behavior**:
```typescript
const handleTeamSelect = (teamName: string) => {
  onTeamChange(teamName);  // Propagate to parent
  onToggle();               // Request close
};
```

**Close Behavior**:
- ✅ Team selection
- ✅ Backdrop tap
- ✅ Escape key
- ✅ Opening other dropdown (mutual exclusion)

**Visual Example**:
```
┌─────────────────────────────────────┐
│  Select Team                        │
├─────────────────────────────────────┤
│  [🏈]  Arizona Cardinals            │
│  [🏈]  Atlanta Falcons              │
│  [🏈]  Baltimore Ravens             │
│  [🏈]  Buffalo Bills                │ ← Scroll
│  ...                                │
│  [🏈]  Washington Commanders        │
├─────────────────────────────────────┤
│  [📊]  Avg (per game)               │
└─────────────────────────────────────┘
```

---

### **Ranking Dropdown (Rank-Sorted)**

**Component**: `CompactRankingDropdown`

**Trigger Element**:
```typescript
// In CompactComparisonRow
<button
  ref={refs.setReference}  // Floating UI ref
  onClick={onToggle}
  className="transition-opacity active:opacity-50"
>
  <span className="text-[11px] font-medium text-purple-400">
    ({ranking?.formattedRank || 'N/A'})
  </span>
</button>
```

**Positioning Strategy**:
```typescript
const { refs, floatingStyles, context, x, y } = useFloating({
  strategy: 'fixed',
  placement: position === 'left' ? 'right-start' : 'left-start',
  //         Team A (left) → dropdown RIGHT
  //         Team B (right) → dropdown LEFT
  middleware: [
    offset(8),
    flip({
      fallbackPlacements: ['bottom-start', 'top-start', 'right-start', 'left-start']
    }),
    shift({ padding: 12 }),
    size({
      apply({ availableHeight, elements }) {
        const maxH = Math.min(420, Math.max(280, availableHeight - 16));
        Object.assign(elements.floating.style, {
          maxHeight: `${maxH}px`,
          width: 'min(280px, calc(100vw - 24px))'
        });
      }
    }),
    inline()
  ],
  whileElementsMounted: autoUpdate
});
```

**Content Structure** (for Points metric):
```typescript
// Compute rankings for all teams on this metric
const allTeamRankings = calculateBulkRanking(allData, metricKey, ...);

// Sort by rank (1st, 2nd, 3rd, ..., 32nd)
sortedTeams = [
  { team: "Baltimore Ravens", ranking: { rank: 1, formattedRank: "1st" }, value: 30.6 },
  { team: "Buffalo Bills", ranking: { rank: 2, formattedRank: "2nd" }, value: 30.1 },
  { team: "Detroit Lions", ranking: { rank: 3, formattedRank: "3rd" }, value: 29.8 },
  ...
  { team: "Minnesota Vikings", ranking: { rank: 15, formattedRank: "T-15th", isTied: true }, value: 24.2 },
  ...
  { team: "Carolina Panthers", ranking: { rank: 32, formattedRank: "32nd" }, value: 18.4 },
  // ─────────────────────────────────
  { team: "Avg Tm/G", ranking: null, value: 23.6, isAverage: true }
]
```

**Selection Behavior**: Same as team selector

**Close Behavior**: Same as team selector

**Visual Example**:
```
┌─────────────────────────────────────┐
│  Points Rankings                    │
├─────────────────────────────────────┤
│  1   [🏈] Baltimore...       30.6   │
│  2   [🏈] Buffalo Bills      30.1   │
│  3   [🏈] Detroit Lions      29.8   │
│  4   [🏈] Kansas City...     28.9   │
│  ... ← Scroll                       │
│ T-15 [🏈] Minnesota...       24.2  ●│ ← Selected (purple highlight)
│  ... ← Scroll                       │
│  32  [🏈] Carolina...        18.4   │
├─────────────────────────────────────┤
│  📊  [📊] Avg (per game)     23.6   │
└─────────────────────────────────────┘

Tied teams have amber background:
┌─────────────────────────────────────┐
│ T-15 [🏈] Minnesota...       24.2   │ ← Amber bg
│ T-15 [🏈] Cleveland...       24.2   │ ← Amber bg
│  17  [🏈] Tampa Bay...       23.8   │
└─────────────────────────────────────┘
```

---

### **Mutual Exclusion Enforcement**

**Rule**: Only ONE dropdown can be open at a time per panel.

**Implementation** (in CompactPanel):
```typescript
// State
const [activeDropdown, setActiveDropdown] = useState<{
  metricKey: string;
  team: 'A' | 'B';
} | null>(null);

const [activeTeamSelector, setActiveTeamSelector] = useState<'A' | 'B' | null>(null);

// Opening ranking dropdown → closes team selector
const handleRankClick = (metricKey: string, team: 'A' | 'B') => {
  setActiveTeamSelector(null); // ← Close team selector
  setActiveDropdown({ metricKey, team });
};

// Opening team selector → closes ranking dropdown
const handleLogoClick = (team: 'A' | 'B') => {
  setActiveDropdown(null); // ← Close ranking dropdown
  setActiveTeamSelector(team);
};

// Team selection → closes BOTH
const handleTeamAChange = (teamName: string) => {
  onTeamAChange(teamName);
  setActiveDropdown(null);    // ← Close both
  setActiveTeamSelector(null); // ← Close both
};
```

**Why Mutual Exclusion?**
- Prevents UI clutter (multiple overlays)
- Clearer user intent (one action at a time)
- Simpler state management
- Better mobile UX (focus on single task)

---

## 5. Compact Comparison Row Structure

### **Exact Layout** (52px total height)

```
┌────────────────────────────────────────────────────────────────┐
│  LINE 1: Data + Ranks + Metric (WITH 12px horizontal padding) │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │  30.6  (1st) ◀───────── POINTS ──────────▶ (15th) 24.2  │ │
│  │  ▲      ▲                  ▲                ▲      ▲    │ │
│  │  │      │                  │                │      │    │ │
│  │  │   Ranking            Metric           Ranking   │    │ │
│  │  │   Badge              Name             Badge     │    │ │
│  │  │   (tap to            (13px,           (tap to   │    │ │
│  │  │   open               center)          open      │    │ │
│  │  │   dropdown)                           dropdown) │    │ │
│  │  │                                                  │    │ │
│  │  Team A Value (15px, white)         Team B Value   │    │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ▲ 12px padding left                    12px padding right ▲ │
│                                                              │
│  LINE 2: Bars (NO padding, edge-to-edge, 6px height)        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  ████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  Green (Team A, 55%)──────────▲  Orange (Team B, 45%)────▶ │
│  └──────────────────────────────────────────────────────────┘ │
│  ▲ NO padding                                   NO padding ▲ │
└────────────────────────────────────────────────────────────────┘
   ▲ Total height: ~52px (40px line 1 + 6px bars + 6px spacing)
```

### **Line 1: Data + Ranks + Metric (40px height)**

**Layout**: Flexbox with 3 sections (left, center, right)

```typescript
<div className="px-3 py-2 flex items-center justify-between">
  
  {/* LEFT: Team A Value + Rank Badge */}
  <div className="flex items-baseline gap-1">
    <span className="text-[15px] font-semibold text-white">
      {formattedA}  {/* "30.6" */}
    </span>
    <CompactRankingDropdown
      ranking={{ rank: 1, formattedRank: "1st", isTied: false }}
      position="left"
      isOpen={activeDropdownTeam === 'A'}
      onToggle={() => onDropdownToggle?.('A')}
      // ... other props
    />
  </div>
  
  {/* CENTER: Metric Name */}
  <div className="flex-1 text-center px-2">
    <span className="text-[13px] font-medium text-slate-300 uppercase tracking-wide">
      {metricConfig.name}  {/* "POINTS" */}
    </span>
  </div>
  
  {/* RIGHT: Rank Badge + Team B Value */}
  <div className="flex items-baseline gap-1">
    <CompactRankingDropdown
      ranking={{ rank: 15, formattedRank: "T-15th", isTied: true }}
      position="right"
      isOpen={activeDropdownTeam === 'B'}
      onToggle={() => onDropdownToggle?.('B')}
      // ... other props
    />
    <span className="text-[15px] font-semibold text-white">
      {formattedB}  {/* "24.2" */}
    </span>
  </div>
  
</div>
```

### **Line 2: Bars (6px height, edge-to-edge)**

**Layout**: Flexbox with 2 bars, NO padding, NO border-radius

```typescript
<div className="h-[6px] flex">
  
  {/* Team A Bar - GREEN */}
  <div 
    className="h-full transition-all duration-300 ease-out"
    style={{ 
      width: `${teamAPercentage}%`,  // 55%
      background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
      boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
    }}
  />
  
  {/* Team B Bar - ORANGE */}
  <div 
    className="h-full transition-all duration-300 ease-out"
    style={{ 
      width: `${teamBPercentage}%`,  // 45%
      background: 'linear-gradient(90deg, #F97316 0%, #EA580C 100%)',
      boxShadow: '0 0 10px rgba(249, 115, 22, 0.3)'
    }}
  />
  
</div>
```

**Key Design Decisions**:
- **Line 1 has padding** (12px left/right) → content doesn't touch edges
- **Line 2 has NO padding** → bars touch panel edges for dramatic effect
- **Bars are thin** (6px vs 20px desktop) → compact mobile design
- **No gap between bars** → bars touch in the middle
- **Gradients + glow** → premium theScore-style visual

---

## 6. Floating UI Integration

### **Why Floating UI?**

**Problem Solved**:
- ❌ **Before**: Dropdowns clipped by panel overflow
- ❌ **Before**: Right-side dropdowns went off-screen
- ❌ **Before**: Bottom dropdowns cut off by viewport edge
- ✅ **After**: Professional positioning with auto-flip/shift

**Library**: `@floating-ui/react` (~10KB gzipped)

### **Key Features Used**

1. **Portal Rendering** (`FloatingPortal`)
   - Renders dropdown at `document.body` level
   - Escapes clipping containers (overflow: hidden)
   - Independent z-index stacking

2. **Fixed Positioning** (`strategy: 'fixed'`)
   - Viewport-relative coordinates
   - Works with scrolling
   - Mobile-friendly

3. **Auto-Flip** (`flip()` middleware)
   - Bottom → Top if no space below
   - Right → Left if off-screen right
   - Fallback placements

4. **Auto-Shift** (`shift()` middleware)
   - Keeps dropdown in viewport
   - 12px padding from edges
   - Smooth boundary detection

5. **Dynamic Sizing** (`size()` middleware)
   - Adjusts height to available space
   - `clamp(280px, 40vh, 420px)`
   - Width: `min(280px, calc(100vw - 24px))`

6. **Auto-Update** (`autoUpdate()`)
   - Repositions on scroll/resize
   - Handles device rotation
   - Cleans up automatically

### **Implementation Pattern**

```typescript
const { refs, floatingStyles, context, x, y, strategy } = useFloating({
  strategy: 'fixed',
  open: isOpen,
  onOpenChange: onToggle,
  placement: position === 'left' ? 'right-start' : 'left-start',
  middleware: [
    offset(8),      // Gap from trigger
    flip({          // Auto-flip if off-screen
      fallbackPlacements: ['bottom-start', 'top-start', 'right-start', 'left-start'],
      padding: 12
    }),
    shift({         // Stay in viewport
      padding: 12
    }),
    size({          // Dynamic sizing
      apply({ availableHeight, elements }) {
        const maxH = Math.min(420, Math.max(280, availableHeight - 16));
        Object.assign(elements.floating.style, {
          maxHeight: `${maxH}px`,
          width: 'min(280px, calc(100vw - 24px))'
        });
      }
    }),
    inline()        // Better inline positioning
  ],
  whileElementsMounted: autoUpdate
});

// Render with portal
<FloatingPortal>
  <div
    ref={refs.setFloating}
    style={{
      position: strategy,  // 'fixed'
      top: y ?? 0,
      left: x ?? 0,
      opacity: (x != null && y != null) ? 1 : 0
    }}
  >
    {/* Dropdown content */}
  </div>
</FloatingPortal>
```

### **SwiftUI Equivalent**

```swift
// Use native .popover or custom overlay
@State private var showTeamSelector = false
@State private var logoFrame: CGRect = .zero

Button(action: { showTeamSelector.toggle() }) {
  TeamLogoView(team: teamA)
}
.background(GeometryReader { proxy in
  Color.clear.preference(key: FramePreferenceKey.self, value: proxy.frame(in: .global))
})
.onPreferenceChange(FramePreferenceKey.self) { frame in
  logoFrame = frame
}
.overlay(
  Group {
    if showTeamSelector {
      TeamSelectorOverlay(
        selectedTeam: $teamA,
        isPresented: $showTeamSelector
      )
      .position(x: logoFrame.midX, y: logoFrame.maxY + 8)
    }
  }
)
```

**Or use native `.popover` modifier**:
```swift
Button(action: {}) {
  TeamLogoView(team: teamA)
}
.popover(isPresented: $showTeamSelector) {
  TeamSelectorView(selectedTeam: $teamA)
    .presentationCompactAdaptation(.popover)
}
```

---

## 7. SwiftUI Component Mappings

### **Layout Components**

| React Component | SwiftUI Equivalent | Notes |
|-----------------|-------------------|-------|
| `MobileCompareLayout` | `CompareView` (main container) | `VStack` with `ScrollView` |
| `MobileTopBar` | `NavigationBar` or custom `HStack` | Fixed top with safe area |
| `MobileBottomBar` | `TabView` | Native iOS tabs |
| `CompactPanel` | `VStack` with `ForEach` | Panel with rows |

### **Interactive Components**

| React Component | SwiftUI Equivalent | Notes |
|-----------------|-------------------|-------|
| `CompactPanelHeader` | Custom `HStack` | Logo buttons + toggle |
| `CompactComparisonRow` | Custom `VStack` | Two-line layout |
| `CompactRankingDropdown` | `.popover` or custom overlay | Rank-sorted list |
| `CompactTeamSelector` | `.sheet` or custom overlay | Alphabetical list |

### **State Management**

| React Pattern | SwiftUI Equivalent |
|---------------|-------------------|
| `useState` | `@State` |
| `props` | `@Binding` or direct pass |
| `useEffect` | `.onAppear`, `.onChange` |
| `useMemo` | Computed properties |
| `useCallback` | Functions (auto-optimized) |
| `useRef` | `@State` for values, no ref needed for UI |

### **Dropdown State in SwiftUI**

```swift
class CompactPanelViewModel: ObservableObject {
  @Published var displayMode: DisplayMode = .perGame
  
  // Dropdown state
  @Published var activeDropdown: ActiveDropdown? = nil
  @Published var activeTeamSelector: TeamSide? = nil
  
  enum ActiveDropdown: Equatable {
    case ranking(metricKey: String, team: TeamSide)
  }
  
  enum TeamSide {
    case teamA, teamB
  }
  
  // Mutual exclusion
  func openRankingDropdown(metricKey: String, team: TeamSide) {
    activeTeamSelector = nil
    activeDropdown = .ranking(metricKey: metricKey, team: team)
  }
  
  func openTeamSelector(_ team: TeamSide) {
    activeDropdown = nil
    activeTeamSelector = team
  }
  
  func closeAllDropdowns() {
    activeDropdown = nil
    activeTeamSelector = nil
  }
  
  func selectTeam(_ teamName: String, for side: TeamSide) {
    // Propagate to parent
    // Close all dropdowns
    closeAllDropdowns()
  }
}
```

### **Two-Line Row in SwiftUI**

```swift
struct CompactComparisonRowView: View {
  let metric: MetricDefinition
  let teamAValue: Double
  let teamBValue: Double
  let teamARank: Int
  let teamBRank: Int
  
  @Binding var activeDropdown: CompactPanelViewModel.ActiveDropdown?
  
  var body: some View {
    VStack(spacing: 0) {
      // LINE 1: Data + Ranks + Metric
      HStack {
        // Team A
        HStack(spacing: 4) {
          Text("\(teamAValue, specifier: "%.1f")")
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(.white)
          
          Button(action: {
            activeDropdown = .ranking(metricKey: metric.field, team: .teamA)
          }) {
            Text("(\(formatRank(teamARank)))")
              .font(.system(size: 11, weight: .medium))
              .foregroundColor(.purple.opacity(0.8))
          }
        }
        
        Spacer()
        
        // Metric Name
        Text(metric.name.uppercased())
          .font(.system(size: 13, weight: .medium))
          .foregroundColor(.gray)
        
        Spacer()
        
        // Team B
        HStack(spacing: 4) {
          Button(action: {
            activeDropdown = .ranking(metricKey: metric.field, team: .teamB)
          }) {
            Text("(\(formatRank(teamBRank)))")
              .font(.system(size: 11, weight: .medium))
              .foregroundColor(.purple.opacity(0.8))
          }
          
          Text("\(teamBValue, specifier: "%.1f")")
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(.white)
        }
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 8)
      
      // LINE 2: Bars (edge-to-edge)
      GeometryReader { geometry in
        HStack(spacing: 0) {
          Rectangle()
            .fill(
              LinearGradient(
                colors: [Color(hex: "#10B981"), Color(hex: "#059669")],
                startPoint: .leading,
                endPoint: .trailing
              )
            )
            .frame(width: geometry.size.width * teamAPercentage)
            .shadow(color: Color(hex: "#10B981").opacity(0.3), radius: 10)
          
          Rectangle()
            .fill(
              LinearGradient(
                colors: [Color(hex: "#F97316"), Color(hex: "#EA580C")],
                startPoint: .leading,
                endPoint: .trailing
              )
            )
            .frame(width: geometry.size.width * teamBPercentage)
            .shadow(color: Color(hex: "#F97316").opacity(0.3), radius: 10)
        }
      }
      .frame(height: 6)
    }
  }
}
```

---

## 8. Performance Considerations

### **React Optimizations**

1. **Conditional Rendering**: Dropdowns only render when open
2. **Memoization**: `useMemo` for sorted lists, rankings
3. **Callbacks**: `useCallback` for handlers
4. **Portal Rendering**: Dropdowns render outside component tree
5. **Body Scroll Lock**: Prevents expensive scroll repaints

### **SwiftUI Optimizations**

1. **Lazy Loading**: Use `LazyVStack` for long lists
2. **State Minimization**: Only observe needed state
3. **Computed Properties**: For derived values (no re-render)
4. **Conditional Views**: Use `if` statements, not opacity
5. **Animations**: Use `.animation` modifier sparingly

---

## 9. Key Takeaways for iOS

### **State Architecture**
- ✅ **Single source of truth**: CompactPanel manages dropdown state
- ✅ **Controlled components**: isOpen + onToggle pattern
- ✅ **Mutual exclusion**: Only one dropdown open at a time
- ✅ **Propagation**: Callbacks flow up, props flow down

### **Interaction Patterns**
- ✅ **Logo tap → Team selector** (alphabetical)
- ✅ **Rank tap → Ranking dropdown** (rank-sorted)
- ✅ **Display toggle → Instant** (no dropdown)
- ✅ **Selection → Close all** (clean state)

### **Visual Design**
- ✅ **Two-line rows**: Data (padded) + Bars (edge-to-edge)
- ✅ **Thin bars**: 6px height (compact)
- ✅ **Gradients + glow**: Premium visual
- ✅ **Purple accents**: Pare brand color

### **Technical Requirements**
- ✅ **Portal-like rendering**: Use `.overlay` or `.popover`
- ✅ **Auto-positioning**: Native SwiftUI handles this
- ✅ **Backdrop dimming**: Custom overlay with tap gesture
- ✅ **Safe areas**: Use `safeAreaInsets`

---

## 10. iOS Conversion Checklist

### **Phase 2: Core UX Mechanics (Mobile Focus)**

- [ ] Create `CompactPanelView.swift` with dropdown state
- [ ] Create `CompactPanelHeaderView.swift` with instant toggle
- [ ] Create `CompactComparisonRowView.swift` with two-line layout
- [ ] Create `RankingDropdownView.swift` (popover or custom)
- [ ] Create `TeamSelectorView.swift` (sheet or custom)
- [ ] Implement mutual exclusion pattern
- [ ] Add tap gestures for logo + rank badge
- [ ] Add 300ms bar animations
- [ ] Test on iPhone 12, 13, 14, 15
- [ ] Verify safe area handling (notch, home indicator)

---

## Graduation to CLAUDE.md

No new rules or changes. This audit documents existing mobile architecture. All patterns already exist in the codebase.

**Links**:
- Existing rules: `CLAUDE.md#ios-swift-development-guidelines`
- General audit: `docs/devnotes/2025-10-10-ios-conversion-audit.md`

---

## Next Steps

1. ✅ Complete mobile components audit
2. ✅ Update CHANGELOG.md
3. ➡️ Begin Phase 1: iOS Project Bootstrap
4. ➡️ Create SwiftUI versions of mobile components

---

**Ready to convert to native iOS!** 🚀🍎

