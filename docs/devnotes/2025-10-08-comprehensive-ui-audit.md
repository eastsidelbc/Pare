# Comprehensive UI Audit - Pare NFL Comparison Platform
**Date:** October 8, 2025  
**Scope:** Complete UI architecture, component hierarchy, data flow, and interactive behavior

---

## Table of Contents
1. [Component Architecture](#1-component-architecture)
2. [Business Logic Hooks](#2-business-logic-hooks)
3. [Configuration & Constants](#3-configuration--constants)
4. [Styling System](#4-styling-system)
5. [Layout & Root](#5-layout--root)
6. [Global State Flow](#6-global-state-flow)
7. [Interactive Elements](#7-interactive-elements)
8. [Edge Cases & Special States](#8-edge-cases--special-states)
9. [Responsive Behavior](#9-responsive-behavior)
10. [Component Relationship Diagram](#10-component-relationship-diagram)

---

## 1. Component Architecture

### 1.1 Page-Level Components

#### `app/compare/page.tsx` (Main Comparison Interface)
**Purpose:** Root comparison page that orchestrates global team selection state

**Key Responsibilities:**
- Manages global team selection state (Team A, Team B)
- Fetches offense/defense data via `useNflStats` hook
- Controls selected metrics for both offense/defense panels
- Renders two-column layout (Offense | Defense)
- Handles theme customization (background gradients)

**State Management:**
```typescript
// Global team selection (controlled at page level)
const [selectedTeamA, setSelectedTeamA] = useState<string>('');
const [selectedTeamB, setSelectedTeamB] = useState<string>('');

// Metrics selection (per panel)
const [selectedOffenseMetrics, setSelectedOffenseMetrics] = useState<string[]>(DEFAULT_OFFENSE_METRICS);
const [selectedDefenseMetrics, setSelectedDefenseMetrics] = useState<string[]>(DEFAULT_DEFENSE_METRICS);

// Data fetching
const { offenseData, defenseData, isLoadingOffense, isLoadingDefense } = useNflStats();
```

**Callback Flow:**
```typescript
// Team selection callbacks passed down to panels
const handleTeamAChange = (teamName: string) => {
  setSelectedTeamA(teamName);
  // Re-renders OffensePanel AND DefensePanel with new team
};

const handleTeamBChange = (teamName: string) => {
  setSelectedTeamB(teamName);
  // Re-renders OffensePanel AND DefensePanel with new team
};
```

**Layout Structure:**
```
ComparePage
├─ Background Gradient (fixed, multi-layer steel-blue)
├─ OfflineStatusBanner (conditional)
└─ Main Container (max-w-6xl, centered)
   ├─ OffensePanel (left column)
   ├─ DefensePanel (right column)
   ├─ Footer ("Stay Locked")
   └─ FloatingMetricsButton (bottom-right, fixed)
```

---

### 1.2 Panel Components

#### `components/OffensePanel.tsx`
**Purpose:** Self-contained offense comparison panel

**Props Interface:**
```typescript
interface OffensePanelProps {
  offenseData: TeamData[];        // All offense stats
  defenseData: TeamData[];        // For ranking calculations
  selectedTeamA: string;          // Controlled from parent
  selectedTeamB: string;          // Controlled from parent
  selectedMetrics: string[];      // Controlled from parent
  isLoading?: boolean;
  onTeamAChange?: (teamName: string) => void;  // Callback to parent
  onTeamBChange?: (teamName: string) => void;  // Callback to parent
}
```

**Internal State:**
```typescript
// Local display mode (per-game vs total) - NOT shared with parent
const { mode: displayMode, setMode: setDisplayMode, transformTeamData } = useDisplayMode('per-game');
```

**Structure:**
```
OffensePanel
├─ Header (flex row)
│  ├─ TeamDropdown (Team A) - clickable logo
│  ├─ Center Section
│  │  ├─ "Offense" Title (purple)
│  │  └─ Display Mode Dropdown (PER GAME / TOTAL)
│  └─ TeamDropdown (Team B) - clickable logo
└─ Comparison Metrics (space-y-4)
   ├─ DynamicComparisonRow (metric 1)
   ├─ DynamicComparisonRow (metric 2)
   ├─ DynamicComparisonRow (metric 3)
   └─ ... (up to 99 metrics)
```

**Display Mode Logic:**
- **Per-Game Mode:** Divides all stats by games played (`g`)
- **Total Mode:** Shows raw cumulative stats
- **Transformation:** Applied via `transformTeamData()` before passing to rows

#### `components/DefensePanel.tsx`
**Purpose:** Identical to OffensePanel but for defense stats

**Key Difference:** Uses `defenseData` as primary data source, `offenseData` for cross-panel ranking calculations

---

### 1.3 Row Components

#### `components/DynamicComparisonRow.tsx`
**Purpose:** Displays a single metric comparison between two teams

**Props Interface:**
```typescript
interface DynamicComparisonRowProps {
  metricKey: string;              // e.g., 'points', 'pass_yds'
  teamAData: TeamData;            // Pre-transformed by panel
  teamBData: TeamData;            // Pre-transformed by panel
  type: 'offense' | 'defense';    // Determines ranking direction
  allOffenseData: TeamData[];     // For ranking calculations
  allDefenseData: TeamData[];     // For ranking calculations
  panelType: 'offense' | 'defense';
  onTeamAChange?: (teamName: string) => void;  // For RankingDropdown
  onTeamBChange?: (teamName: string) => void;  // For RankingDropdown
}
```

**Structure:**
```
DynamicComparisonRow
├─ Container (py-4, mb-3, rounded-xl, border)
├─ Stats Line (flex row, mb-4)
│  ├─ Team A Section (left)
│  │  ├─ Value (29.2)
│  │  └─ RankingDropdown ([5th ▼] or [📊 Avg])
│  ├─ Metric Name (center) - "Points"
│  └─ Team B Section (right)
│     ├─ RankingDropdown ([Avg ▼] or [12th ▼])
│     └─ Value (23.5)
└─ Visual Bars (inward-facing)
   ├─ Team A Bar (green, grows right →)
   └─ Team B Bar (orange, grows left ←)
```

**Ranking Calculation:**
```typescript
// Real-time client-side ranking
const teamARanking = useRanking(allData, metricKey, teamAData.team, {
  higherIsBetter: metricDef?.higherIsBetter || true,
  excludeSpecialTeams: true  // "Avg Tm/G" excluded from ranks
});
```

**Bar Calculation Logic:**
```typescript
// Rank-based amplification (like theScore app)
const { teamAPercentage, teamBPercentage, amplificationFactor } = useBarCalculation({
  teamAValue: formattedTeamAValue,
  teamBValue: formattedTeamBValue,
  teamARanking,
  teamBRanking,
  panelType,
  metricName: metricDef?.name
});

// Example: Chiefs (29.2 pts, 1st) vs Panthers (15.3 pts, 32nd)
// Without amplification: 65% vs 35%
// With amplification (2.5x factor): 85% vs 15% - more dramatic!
```

---

### 1.4 Dropdown Components

#### `components/TeamDropdown.tsx`
**Purpose:** Interactive team logo that opens dropdown for switching teams

**Features:**
- **Alphabetical Sorting:** 32 teams sorted A-Z
- **Average Team Support:** "📊 Avg (per game)" appears LAST
- **Visual Separator:** Border above average team row
- **Hover States:** Logo scales up on hover
- **Animations:** Framer Motion for smooth dropdown

**Structure:**
```
TeamDropdown (motion.div)
├─ Button (team logo)
│  └─ TeamLogo component (60px, clickable)
└─ Dropdown Menu (AnimatePresence)
   ├─ Search Bar (filter teams)
   ├─ Team List (max-h-[70vh], scrollable)
   │  ├─ Arizona Cardinals
   │  ├─ Atlanta Falcons
   │  ├─ ...
   │  ├─ Washington Commanders
   │  ├─ ──────────────────── (separator)
   │  └─ 📊 Avg (per game)
   └─ Footer ("Alphabetical, Avg last")
```

#### `components/RankingDropdown.tsx`
**Purpose:** Interactive rank badge that opens dropdown for switching by ranking

**Features:**
- **Rank-Based Sorting:** Teams sorted 1st → 32nd (or 32nd → 1st for defense)
- **Average Team Support:** "📊 Avg" badge appears LAST (no rank number)
- **Clickable Badge:** Even when "Avg" is selected, badge remains clickable
- **Dynamic Colors:** Green for top 10, yellow for middle, red for bottom 10

**Structure:**
```
RankingDropdown (motion.div)
├─ Button (rank badge)
│  ├─ If Regular Team: "5th ▼" (with color)
│  └─ If Average Team: "📊 Avg ▼" (no rank number)
└─ Dropdown Menu (AnimatePresence)
   ├─ Ranked Team List (32 teams, sorted by rank)
   │  ├─ 1st - Kansas City Chiefs (29.2)
   │  ├─ 2nd - Buffalo Bills (28.7)
   │  ├─ ...
   │  ├─ 32nd - Carolina Panthers (15.3)
   │  ├─ ──────────────────── (separator)
   │  └─ 📊 Avg - Avg Tm/G (23.7) [no rank]
   └─ Footer ("Ranked by [metric]")
```

**Key Behavior:**
```typescript
// When average team selected, button shows "📊 Avg" (clickable!)
const isCurrentTeamAverage = isAverageTeam(currentTeam);

// Button rendering (Line 207-228)
{isCurrentTeamAverage ? (
  <span className="text-slate-300">📊 Avg</span>
) : rankingResult ? (
  <span className={rankColorClass}>{rankingResult.formattedRank}</span>
) : (
  <span className="text-slate-400">N/A</span>
)}
```

---

### 1.5 Selection Components

#### `components/TeamSelectionPanel.tsx`
**Purpose:** Global team selector (currently unused - replaced by in-panel dropdowns)

**Status:** DEPRECATED - Team selection now happens via TeamDropdown in each panel

#### `components/TeamSelector.tsx`
**Purpose:** Reusable `<select>` dropdown for team selection

**Usage:** Used by TeamSelectionPanel (deprecated), NOT used by main comparison UI

---

### 1.6 Metrics Components

#### `components/MetricsSelector.tsx`
**Purpose:** Comprehensive metrics customization interface

**Features:**
- **Category Grouping:** Metrics grouped by category (Scoring, Passing, Rushing, Efficiency)
- **Visual Selection:** Click to toggle, checkmark when selected
- **Unlimited Metrics:** No hard limit (default max: 99)
- **Bulk Actions:** "Add All" / "Clear All" / "Reset Defaults"
- **Real-Time Update:** Changes instantly reflected in panels

**Structure:**
```
MetricsSelector
├─ Header
│  ├─ Title ("🏈 Offense Metrics" or "🛡️ Defense Metrics")
│  └─ Actions (Add All, Clear All, Reset Defaults)
├─ Selected Metrics Badge Row
│  ├─ [1. Points ×]
│  ├─ [2. Total Yards ×]
│  └─ ... (numbered in selection order)
└─ Category Grid (5 columns on desktop)
   ├─ 🏆 Scoring
   │  ├─ [✓ Points] (selected, green)
   │  └─ ... 
   ├─ 🎯 Passing
   │  ├─ [Completions] (unselected, gray)
   │  └─ ...
   └─ ... (other categories)
```

**State Flow:**
```typescript
// Controlled by parent (ComparePage)
<MetricsSelector
  type="offense"
  selectedMetrics={selectedOffenseMetrics}  // From parent state
  onMetricsChange={setSelectedOffenseMetrics}  // Updates parent
/>

// When user toggles metric:
// 1. MetricsSelector calls onMetricsChange([...new selection])
// 2. ComparePage updates selectedOffenseMetrics state
// 3. OffensePanel re-renders with new metrics
// 4. DynamicComparisonRow components created/destroyed based on selection
```

#### `components/FloatingMetricsButton.tsx`
**Purpose:** Fixed bottom-right button that opens metrics selector drawer

**Features:**
- **Fixed Position:** Always visible at bottom-right
- **Badge Count:** Shows "5" badge for number of selected metrics
- **Drawer UI:** Opens full-screen overlay with metrics selector
- **Persistent:** Floats above all content

---

## 2. Business Logic Hooks

### 2.1 Data Fetching: `lib/useNflStats.ts`

**Purpose:** Fetches and manages NFL team statistics from API endpoints

**Return Interface:**
```typescript
{
  // Data
  offenseData: TeamData[];           // All offense stats (33 rows: 32 teams + Avg)
  defenseData: TeamData[];           // All defense stats (33 rows: 32 teams + Avg)
  
  // Loading states
  isLoadingOffense: boolean;
  isLoadingDefense: boolean;
  isLoading: boolean;                // Combined loading state
  
  // Error states
  offenseError: string | null;
  defenseError: string | null;
  
  // Data freshness (from Service Worker cache)
  offenseDataFreshness: 'fresh' | 'stale' | 'unavailable' | 'loading';
  defenseDataFreshness: 'fresh' | 'stale' | 'unavailable' | 'loading';
  
  // Metadata
  lastUpdated: string | null;
  
  // Utility functions
  getTeamOffenseData: (teamName: string) => TeamData | null;
  getTeamDefenseData: (teamName: string) => TeamData | null;
  refreshData: () => Promise<void>;
}
```

**Data Flow:**
```
1. API Request: /api/nfl-2025/offense
   ↓
2. Service Worker Intercept (cache strategy)
   ↓
3. API Route: app/api/nfl-2025/offense/route.ts
   ├─ Reads: data/pfr/offense-2025.csv
   ├─ Parses: CSV → JSON (lib/pfrCsv.ts)
   └─ Returns: NflApiResponse
   ↓
4. useNflStats Hook: Transforms to TeamData[]
   ├─ Maps CSV columns → dynamic properties
   ├─ Handles per-game calculations (if needed)
   └─ Returns 33 rows (32 teams + "Avg Tm/G")
   ↓
5. ComparePage: Stores in state
   ↓
6. Panels: Receive offenseData/defenseData props
```

**TeamData Structure (Dynamic!):**
```typescript
interface TeamData {
  team: string;  // "Kansas City Chiefs", "Avg Tm/G", etc.
  
  // All other properties are DYNAMIC based on CSV columns
  // Examples:
  g: number;                      // Games played
  points: number;                 // Points scored/allowed
  total_yards: number;            // Total yards
  pass_yds: number;               // Passing yards
  rush_yds: number;               // Rushing yards
  turnovers: number;              // Turnovers
  third_down_pct: number;         // 3rd down %
  // ... 40+ more metrics from PFR
}
```

---

### 2.2 Ranking: `lib/useRanking.ts`

**Purpose:** Client-side real-time ranking calculations for any metric

**Key Functions:**

#### `useRanking()` - Hook for single team rank
```typescript
const teamARanking = useRanking(
  allOffenseData,        // All 33 rows (32 teams + Avg)
  'points',              // Metric key
  'Kansas City Chiefs',  // Target team
  {
    higherIsBetter: true,          // True for offense, context-dependent
    excludeSpecialTeams: true      // Excludes "Avg Tm/G" from ranking
  }
);

// Returns:
{
  rank: 1,                    // 1-32 (Avg team excluded)
  formattedRank: "1st",       // "1st", "T-5th", "32nd"
  isTied: false,              // True if multiple teams have same value
  totalTeams: 32,             // Always 32 (special teams excluded)
  teamsWithSameValue: 1       // Number of teams with same value
}
```

**Ranking Algorithm:**
```typescript
// For offense (higherIsBetter: true)
// Kansas City: 29.2 points → Rank 1st (highest)
// Carolina: 15.3 points → Rank 32nd (lowest)

// For defense (higherIsBetter: false)
// Baltimore: 16.2 points → Rank 1st (lowest = best defense)
// Carolina: 32.9 points → Rank 32nd (highest = worst defense)
```

**Tie Handling:**
```typescript
// If two teams have 24.5 points:
// Both get: { rank: 5, formattedRank: "T-5th", isTied: true, teamsWithSameValue: 2 }
```

**Special Team Exclusion:**
```typescript
// "Avg Tm/G" is ALWAYS excluded from ranking
// Returns null for average team:
const avgRanking = useRanking(allData, 'points', 'Avg Tm/G', ...);
// avgRanking === null (can't rank average)
```

---

### 2.3 Display Mode: `lib/useDisplayMode.ts`

**Purpose:** Manages per-game vs total stats toggle

**Return Interface:**
```typescript
{
  // Current mode
  mode: 'per-game' | 'total';
  
  // Setters
  setMode: (mode: DisplayMode) => void;
  toggleMode: () => void;
  
  // Transformation functions
  transformTeamData: (teamData: TeamData | null) => TeamData | null;
  transformAllData: (allData: TeamData[]) => TeamData[];
  
  // Utilities
  isPerGameMode: boolean;
  isTotalMode: boolean;
  modeLabel: string;  // "PER GAME" or "TOTAL"
}
```

**Transformation Logic:**
```typescript
// Per-Game Mode (default):
// - Divides ALL numeric metrics by games played (g)
// - Example: 293 total points / 10 games = 29.3 points per game

// Total Mode:
// - Returns raw stats as-is from CSV
// - Example: 293 total points (no division)

// Important: "Avg Tm/G" row is ALREADY per-game, so no transformation needed!
```

**Usage in Panels:**
```typescript
// OffensePanel.tsx
const { mode: displayMode, setMode, transformTeamData } = useDisplayMode('per-game');

// Transform data before passing to rows
const teamAData = transformTeamData(
  offenseData.find(team => team.team === selectedTeamA) || null
);

// User changes mode via dropdown → triggers re-transform → rows re-render
```

---

### 2.4 Theme: `lib/useTheme.ts`

**Purpose:** Centralized theme management (colors, styling, animations)

**Color Schemes:**
```typescript
type ColorScheme = 'default' | 'dark' | 'light' | 'neon' | 'retro' | 'custom';

// Default scheme:
{
  teamA: { text: 'text-green-400', bar: 'bg-green-500' },
  teamB: { text: 'text-orange-400', bar: 'bg-orange-500' }
}
```

**Usage:**
```typescript
const { getTeamAColor, getTeamBColor, getPanelClasses } = useTheme();

// In DynamicComparisonRow:
<div className={`${getTeamAColor()} font-semibold`}>
  {teamAValue}
</div>
```

---

### 2.5 Bar Calculation: `lib/useBarCalculation.ts`

**Purpose:** Memoized bar width calculation with rank-based amplification

**Algorithm:**
```typescript
// Step 1: Calculate base ratios
const baseRatioA = teamAValue / (teamAValue + teamBValue);
const baseRatioB = teamBValue / (teamAValue + teamBValue);

// Example: 29.2 vs 23.5 points
// baseRatioA = 29.2 / 52.7 = 0.554 (55.4%)
// baseRatioB = 23.5 / 52.7 = 0.446 (44.6%)

// Step 2: Determine amplification factor based on rank gap
const rankGap = Math.abs(teamARank - teamBRank);

if (rankGap >= 20) amplificationFactor = 2.5;       // EXTREME
else if (rankGap >= 15) amplificationFactor = 2.2;  // HUGE
else if (rankGap >= 10) amplificationFactor = 1.8;  // BIG
else if (rankGap >= 5) amplificationFactor = 1.5;   // MODERATE
else amplificationFactor = 1.2;                     // SUBTLE

// Example: Rank 1st vs Rank 32nd → rankGap = 31 → 2.5x amplification

// Step 3: Apply exponential amplification (like theScore!)
const amplifiedRatioA = Math.pow(baseRatioA, amplificationFactor);
const amplifiedRatioB = Math.pow(baseRatioB, amplificationFactor);

// Example with 2.5x amplification:
// amplifiedRatioA = 0.554^2.5 = 0.318
// amplifiedRatioB = 0.446^2.5 = 0.198

// Step 4: Normalize back to 100%
const total = amplifiedRatioA + amplifiedRatioB;
teamAPercentage = (amplifiedRatioA / total) * 98;  // 98% (2% gap)
teamBPercentage = (amplifiedRatioB / total) * 98;

// Result: 61% vs 39% (much more dramatic than 55% vs 45%)
```

**Defense Panel Logic:**
```typescript
// For defense stats, FLIP values so lower = better gets larger bar
if (panelType === 'defense') {
  [teamANum, teamBNum] = [teamBNum, teamANum];
}

// Example: Baltimore (16.2 pts allowed) vs Carolina (32.9 pts allowed)
// Before flip: 16.2 vs 32.9 → 33% vs 67% (wrong!)
// After flip: 32.9 vs 16.2 → 67% vs 33% (correct!)
```

---

## 3. Configuration & Constants

### 3.1 Metrics Config: `lib/metricsConfig.ts`

**Purpose:** Central registry for all NFL metrics

**Key Exports:**

#### `AVAILABLE_METRICS` - Complete metric registry
```typescript
{
  'points': {
    name: 'Points',
    field: 'points',
    category: 'scoring',
    higherIsBetter: true,  // Context-dependent
    format: 'decimal',
    description: 'Points scored (offense) or allowed (defense) per game',
    availableInOffense: true,
    availableInDefense: true,
  },
  'pass_yds': {
    name: 'Passing Yards',
    field: 'pass_yds',
    category: 'passing',
    higherIsBetter: true,
    format: 'decimal',
    description: 'Passing yards per game',
    availableInOffense: true,
    availableInDefense: true,
  },
  // ... 40+ more metrics
}
```

#### `DEFAULT_OFFENSE_METRICS` / `DEFAULT_DEFENSE_METRICS`
```typescript
export const DEFAULT_OFFENSE_METRICS = [
  'points',
  'total_yards',
  'pass_yds',
  'rush_yds',
  'score_pct'
];

export const DEFAULT_DEFENSE_METRICS = [
  'points',
  'total_yards',
  'pass_yds',
  'rush_yds',
  'score_pct'
];
```

#### `getMetricsByCategory()` - Group metrics for UI
```typescript
getMetricsByCategory('offense')
// Returns:
{
  'scoring': { points: {...}, ... },
  'passing': { pass_yds: {...}, pass_td: {...}, ... },
  'rushing': { rush_yds: {...}, rush_td: {...}, ... },
  'efficiency': { third_down_pct: {...}, ... },
  // ...
}
```

---

### 3.2 App Constants: `config/constants.ts`

**Purpose:** Magic numbers, API endpoints, special team identifiers

```typescript
export const APP_CONSTANTS = {
  CACHE: {
    PRODUCTION_MAX_AGE: 6 * 60 * 60 * 1000,  // 6 hours
    DEBUG_MAX_AGE: 10 * 1000,                // 10 seconds
    STALE_THRESHOLD: 24 * 60 * 60 * 1000,    // 24 hours
  },
  
  API: {
    BASE_URL: '/api/nfl-2025',
    ENDPOINTS: {
      OFFENSE: '/api/nfl-2025/offense',
      DEFENSE: '/api/nfl-2025/defense',
    },
  },
  
  SPECIAL_TEAMS: ['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'] as const,
};
```

---

## 4. Styling System

### 4.1 Global CSS: `app/globals.css`

**Key Features:**
- **Mobile-First:** Touch optimization, safe area insets
- **PWA Optimizations:** Standalone mode styling
- **Accessibility:** Focus indicators, reduced motion support
- **Custom Animations:** fadeIn, tab-glow

**Important Classes:**
```css
.touch-optimized {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.min-h-screen-dynamic {
  min-height: 100dvh;  /* Dynamic viewport height (mobile-safe) */
}

.safe-area-padding {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

### 4.2 Tailwind Config: `tailwind.config.js`

**Custom Extensions:**
```javascript
theme: {
  extend: {
    // Safe area spacing for notch/dynamic island
    spacing: {
      'safe-top': 'env(safe-area-inset-top)',
      'safe-bottom': 'env(safe-area-inset-bottom)',
    },
    
    // Dynamic viewport heights (mobile-safe)
    height: {
      'screen-dynamic': '100dvh',  // Best for mobile
      'screen-small': '100svh',     // Small viewport
      'screen-large': '100lvh',     // Large viewport
    },
    
    // Premium shadows
    boxShadow: {
      'premium': '0 25px 50px -12px rgba(0, 0, 0, 0.25)...',
      'bar-3d': 'inset 0 1px 0 rgba(255, 255, 255, 0.15)...',
      'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)...',
    },
    
    // Custom animations
    animation: {
      'float': 'float 3s ease-in-out infinite',
      'bar-load': 'bar-load 1s ease-out',
    },
  },
}
```

---

## 5. Layout & Root

### 5.1 Root Layout: `app/layout.tsx`

**Purpose:** Root HTML structure, PWA metadata, Service Worker registration

**Key Features:**
- **PWA Manifest:** Apple touch icons, web app capabilities
- **Service Worker:** Gated by `NEXT_PUBLIC_ENABLE_SW` env var
- **Viewport Config:** Safe area insets, no user scaling (app-like)
- **Theme Color:** `#0f172a` (steel blue dark)

**Service Worker Registration (Gated):**
```javascript
// Only registers SW if NEXT_PUBLIC_ENABLE_SW=true
const enableSW = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';

// In <head>:
<script dangerouslySetInnerHTML={{
  __html: `
    var ENABLE_SW = ${enableSW ? 'true' : 'false'};
    if ('serviceWorker' in navigator && ENABLE_SW) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')...
      });
    }
  `
}} />
```

---

## 6. Global State Flow

### 6.1 Team Selection Flow

**Complete Callback Chain:**

```
USER ACTION: Clicks team in RankingDropdown
  ↓
RankingDropdown: onClick handler
  ↓
onTeamChange callback (from DynamicComparisonRow prop)
  ↓
DynamicComparisonRow: onTeamAChange or onTeamBChange prop
  ↓
OffensePanel: onTeamAChange prop
  ↓
ComparePage: handleTeamAChange
  ↓
setSelectedTeamA(newTeam)
  ↓
STATE UPDATE: selectedTeamA = "New Team"
  ↓
RE-RENDER: ComparePage re-renders
  ↓
PROPS UPDATE: Both OffensePanel AND DefensePanel receive new selectedTeamA
  ↓
DATA LOOKUP: Panels find new team data from offenseData/defenseData arrays
  ↓
ROWS UPDATE: All DynamicComparisonRow components re-render with new team data
  ↓
RANKING RECALC: useRanking hooks recalculate ranks for new team
  ↓
BARS ANIMATE: Bar widths recalculate via useBarCalculation
  ↓
UI UPDATES: New values, ranks, and bars displayed
```

**Key Insight:** Team selection is GLOBAL (managed at ComparePage level), so changing a team in OffensePanel also updates DefensePanel!

---

### 6.2 Metrics Selection Flow

```
USER ACTION: Clicks metric card in MetricsSelector
  ↓
MetricsSelector: handleToggleMetric
  ↓
onMetricsChange callback (from FloatingMetricsButton prop)
  ↓
FloatingMetricsButton: onOffenseMetricsChange or onDefenseMetricsChange prop
  ↓
ComparePage: setSelectedOffenseMetrics
  ↓
STATE UPDATE: selectedOffenseMetrics = [...updatedArray]
  ↓
RE-RENDER: ComparePage re-renders
  ↓
PROPS UPDATE: OffensePanel receives new selectedMetrics
  ↓
ROWS UPDATE: Panel's .map() creates/destroys DynamicComparisonRow components
  ↓
UI UPDATES: New metrics appear, old metrics disappear (smooth animations)
```

---

### 6.3 Display Mode Flow (Local to Each Panel)

```
USER ACTION: Selects "TOTAL" in OffensePanel dropdown
  ↓
OffensePanel: setDisplayMode('total')
  ↓
LOCAL STATE UPDATE: displayMode = 'total' (OffensePanel ONLY)
  ↓
RE-RENDER: OffensePanel re-renders
  ↓
DATA TRANSFORM: transformTeamData() applies new mode
  ↓
ROWS UPDATE: All DynamicComparisonRow in OffensePanel re-render with transformed data
  ↓
UI UPDATES: Values change from per-game to total
  ↓
NOTE: DefensePanel NOT affected (has its own displayMode state)
```

---

## 7. Interactive Elements

### 7.1 All Clickable Elements

#### **Team Selection:**
1. **TeamDropdown (Logo)** - Click logo → opens team list dropdown
2. **TeamDropdown Menu Items** - Click team → selects team, closes dropdown
3. **TeamDropdown Search** - Type to filter teams

#### **Ranking Selection:**
4. **RankingDropdown (Badge)** - Click rank badge → opens ranked team list
5. **RankingDropdown Menu Items** - Click team → selects team, closes dropdown
6. **"Avg" Badge** - Click "📊 Avg" → opens dropdown (even when average is selected)

#### **Display Mode:**
7. **Display Mode Dropdown** - Click dropdown → select PER GAME or TOTAL

#### **Metrics:**
8. **FloatingMetricsButton** - Click button → opens metrics drawer
9. **Metrics Selector Cards** - Click card → toggle metric selection
10. **Metrics Selector Bulk Actions** - "Add All" / "Clear All" / "Reset Defaults"
11. **Metrics Selector Close** - Click X or outside drawer → closes drawer

---

### 7.2 Hover States

#### **TeamDropdown:**
- **Logo Hover:** Scale up to 1.05, shadow increases
- **Menu Item Hover:** Background lightens, border glows

#### **RankingDropdown:**
- **Badge Hover:** Background lightens, border color intensifies
- **Menu Item Hover:** Background lightens, rank badge glows

#### **Metrics Selector:**
- **Card Hover (Unselected):** Border color shifts to blue, background lightens
- **Card Hover (Selected):** Green glow intensifies

---

### 7.3 Focus States

**Keyboard Navigation:**
- All interactive elements support Tab navigation
- Focus indicators: 2px purple outline (`outline: 2px solid #8b5cf6`)
- Skip to main content link for screen readers

---

### 7.4 Animations

#### **Dropdown Animations (Framer Motion):**
```typescript
// Entry animation
initial={{ opacity: 0, y: -10, scale: 0.95 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: -10, scale: 0.95 }}
transition={{ duration: 0.15, ease: 'easeOut' }}
```

#### **Bar Animations:**
```css
/* Bars grow from center outward */
.bar-team-a { transform-origin: right; }
.bar-team-b { transform-origin: left; }

/* Smooth width transitions */
transition: width 0.3s ease-out;
```

#### **Metrics Drawer:**
```typescript
// Slide up from bottom
initial={{ y: '100%' }}
animate={{ y: 0 }}
exit={{ y: '100%' }}
transition={{ duration: 0.3, ease: 'easeInOut' }}
```

---

## 8. Edge Cases & Special States

### 8.1 Loading States

#### **Initial Page Load:**
```
ComparePage
├─ OffensePanel → isLoading={true}
│  └─ "Loading offense data..."
└─ DefensePanel → isLoading={true}
   └─ "Loading defense data..."
```

#### **Invalid Team Selection:**
```
// When only one team selected or same team selected twice
OffensePanel
└─ "Select both teams to see offense comparison."
```

---

### 8.2 Error States

#### **API Fetch Failure:**
```
ErrorBoundary (in ComparePage)
└─ Fallback UI:
   ├─ ⚠️ Icon
   ├─ "Offense Panel Error"
   └─ "Unable to load offense comparison data"
```

#### **Missing Team Data:**
```
// If team not found in data array
DynamicComparisonRow
└─ teamAValue = "0" (fallback)
└─ ranking = null (shows "N/A")
```

---

### 8.3 Special Team Handling: "Avg Tm/G"

#### **Detection:**
```typescript
// utils/teamHelpers.ts
function isAverageTeam(teamName: string | undefined): boolean {
  return teamName === 'Avg Tm/G' || teamName === 'Avg/TmG' || teamName === 'Average team/G';
}
```

#### **Behavior:**

**In TeamDropdown:**
- ✅ Appears LAST in dropdown (after separator)
- ✅ Shows "📊 Avg (per game)" label
- ✅ Selectable for benchmarking

**In RankingDropdown:**
- ✅ Appears LAST in dropdown (after separator)
- ✅ Shows "📊 Avg" badge (no rank number)
- ✅ Excluded from ranking calculations (doesn't count as 33rd place)

**In DynamicComparisonRow:**
- ✅ Shows "📊 Avg" badge instead of rank pill
- ✅ Badge remains clickable (opens RankingDropdown)

**In Ranking Calculations:**
- ❌ EXCLUDED from `useRanking()` (via `excludeSpecialTeams: true`)
- ❌ Never gets a rank (returns `null`)
- ✅ Can be compared against (e.g., "Cowboys 151 pts vs Avg 114.6 pts")

---

### 8.4 Tie Handling

```typescript
// Two teams with 24.5 points
Team A: { rank: 5, formattedRank: "T-5th", isTied: true }
Team B: { rank: 5, formattedRank: "T-5th", isTied: true }

// UI displays: "T-5th" instead of "5th"
```

---

### 8.5 Offline Mode

**Service Worker Cache:**
- **Fresh:** Data fetched from network successfully
- **Stale:** Data served from cache (> 6 hours old)
- **Unavailable:** No cache available, network failed

**Offline Banner:**
```typescript
<OfflineStatusBanner />
// Shows yellow banner at top when offline
// "You're offline. Showing cached data from [date]"
```

---

## 9. Responsive Behavior

### 9.1 Breakpoints

**Tailwind Breakpoints:**
```
sm: 640px   (small tablets)
md: 768px   (tablets)
lg: 1024px  (laptops)
xl: 1280px  (desktops)
2xl: 1536px (large desktops)
```

---

### 9.2 Layout Shifts

#### **Mobile (< 1024px):**
```
ComparePage (single column)
├─ OffensePanel (full width)
├─ (spacing)
└─ DefensePanel (full width)
```

#### **Desktop (≥ 1024px):**
```
ComparePage (two columns)
├─ Grid (grid-cols-2)
│  ├─ OffensePanel (left 50%)
│  └─ DefensePanel (right 50%)
```

---

### 9.3 Component Responsive Behavior

#### **TeamDropdown:**
- Mobile: Logo 50px
- Desktop: Logo 60px

#### **DynamicComparisonRow:**
- Mobile: 
  - Values: text-sm (14px)
  - Rank badges: Compact size
  - Bars: Full width
- Desktop:
  - Values: text-base (16px)
  - Rank badges: Larger size
  - Bars: Full width with padding

#### **MetricsSelector:**
- Mobile: 1-2 columns
- Tablet: 3 columns
- Desktop: 4-5 columns

---

### 9.4 Touch Targets

**Minimum Touch Target Sizes:**
- Buttons: 48px × 48px (WCAG AAA)
- Dropdowns: min-h-[2.75rem] (44px)
- Logo buttons: 60px × 60px

**Touch Optimizations:**
```css
.touch-optimized {
  -webkit-tap-highlight-color: transparent;  /* Remove blue flash on tap */
  touch-action: manipulation;                 /* Disable double-tap zoom */
}
```

---

## 10. Component Relationship Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          app/compare/page.tsx                          │
│                         (Global State Manager)                         │
│                                                                         │
│  STATE:                                                                │
│  - selectedTeamA: string                                               │
│  - selectedTeamB: string                                               │
│  - selectedOffenseMetrics: string[]                                    │
│  - selectedDefenseMetrics: string[]                                    │
│  - offenseData: TeamData[] (from useNflStats)                         │
│  - defenseData: TeamData[] (from useNflStats)                         │
└────────────────────────────────────────────────────────────────────────┘
          │                                    │
          ├─────────┐                          ├─────────┐
          ↓         ↓                          ↓         ↓
┌─────────────────────────────┐    ┌─────────────────────────────┐
│   OffensePanel              │    │   DefensePanel              │
│   (Local Display Mode)      │    │   (Local Display Mode)      │
│                             │    │                             │
│   STATE:                    │    │   STATE:                    │
│   - displayMode: 'per-game' │    │   - displayMode: 'per-game' │
│                             │    │                             │
│   PROPS:                    │    │   PROPS:                    │
│   - selectedTeamA ←────────────┼────┼→ selectedTeamA           │
│   - selectedTeamB ←────────────┼────┼→ selectedTeamB           │
│   - selectedMetrics         │    │   - selectedMetrics         │
│   - offenseData             │    │   - defenseData             │
│   - onTeamAChange ─────────────┼────┼→ onTeamAChange           │
│   - onTeamBChange ─────────────┼────┼→ onTeamBChange           │
└─────────────────────────────┘    └─────────────────────────────┘
          │                                    │
          ├─────┬──────┬──────┐               ├─────┬──────┬──────┐
          ↓     ↓      ↓      ↓               ↓     ↓      ↓      ↓
    ┌──────────────────────────┐        ┌──────────────────────────┐
    │ DynamicComparisonRow     │        │ DynamicComparisonRow     │
    │ (Metric: points)         │        │ (Metric: points)         │
    │                          │        │                          │
    │ USES HOOKS:              │        │ USES HOOKS:              │
    │ - useRanking (Team A)    │        │ - useRanking (Team A)    │
    │ - useRanking (Team B)    │        │ - useRanking (Team B)    │
    │ - useBarCalculation      │        │ - useBarCalculation      │
    │ - useTheme               │        │ - useTheme               │
    └──────────────────────────┘        └──────────────────────────┘
          │                │                      │                │
          ↓                ↓                      ↓                ↓
    ┌───────────┐    ┌────────────────┐    ┌───────────┐    ┌────────────────┐
    │TeamDropdown│   │RankingDropdown │    │TeamDropdown│   │RankingDropdown │
    │(Team A)    │   │(Team A)        │    │(Team A)    │   │(Team A)        │
    │            │   │                │    │            │   │                │
    │ Renders:   │   │ Renders:       │    │ Renders:   │   │ Renders:       │
    │ - Logo     │   │ - Rank badge   │    │ - Logo     │   │ - Rank badge   │
    │ - Dropdown │   │ - Ranked list  │    │ - Dropdown │   │ - Ranked list  │
    │            │   │   (1st → 32nd) │    │            │   │   (1st → 32nd) │
    │ Callback:  │   │   + Avg last   │    │ Callback:  │   │   + Avg last   │
    │ → Parent   │   │                │    │ → Parent   │   │                │
    │ → Page     │   │ Callback:      │    │ → Page     │   │ Callback:      │
    │ → setState │   │ → Parent       │    │ → setState │   │ → Parent       │
    └───────────┘   │ → Page         │    └───────────┘   │ → Page         │
                    │ → setState     │                    │ → setState     │
                    └────────────────┘                    └────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                    FloatingMetricsButton (Fixed)                       │
│                                                                         │
│  PROPS:                                                                │
│  - selectedOffenseMetrics ←────────┐                                  │
│  - selectedDefenseMetrics ←────────┼─── From ComparePage              │
│  - onOffenseMetricsChange ─────────┤                                  │
│  - onDefenseMetricsChange ─────────┘                                  │
└────────────────────────────────────────────────────────────────────────┘
          │
          ↓ (Opens Drawer)
┌────────────────────────────────────────────────────────────────────────┐
│                          MetricsSelector                               │
│                     (Full-Screen Drawer)                               │
│                                                                         │
│  PROPS:                                                                │
│  - type: 'offense' | 'defense'                                         │
│  - selectedMetrics: string[]                                           │
│  - onMetricsChange: (metrics: string[]) => void                        │
│                                                                         │
│  RENDERS:                                                              │
│  - Category Grid (🏆 Scoring, 🎯 Passing, 💨 Rushing, ⚡ Efficiency)  │
│  - Metric Cards (clickable, toggleable)                                │
│  - Bulk Actions (Add All, Clear All, Reset)                            │
│                                                                         │
│  USER CLICKS METRIC CARD                                               │
│    ↓                                                                   │
│  onMetricsChange([...new selection])                                   │
│    ↓                                                                   │
│  FloatingMetricsButton → ComparePage → setSelectedOffenseMetrics      │
│    ↓                                                                   │
│  OffensePanel receives new selectedMetrics prop                        │
│    ↓                                                                   │
│  Panel re-renders with new metric rows                                 │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                         BUSINESS LOGIC HOOKS                           │
│                       (Shared Across Components)                       │
│                                                                         │
│  lib/useNflStats.ts                                                    │
│  ├─ Fetches offenseData, defenseData from API                         │
│  ├─ Manages loading states                                             │
│  └─ Returns 33 rows (32 teams + "Avg Tm/G")                           │
│                                                                         │
│  lib/useRanking.ts                                                     │
│  ├─ Calculates real-time ranks for any metric                         │
│  ├─ Handles tie detection                                              │
│  ├─ Excludes "Avg Tm/G" from ranking                                  │
│  └─ Returns { rank, formattedRank, isTied, totalTeams }               │
│                                                                         │
│  lib/useDisplayMode.ts                                                 │
│  ├─ Manages per-game vs total toggle                                  │
│  ├─ Transforms team data based on mode                                 │
│  └─ Returns { mode, transformTeamData, toggleMode }                   │
│                                                                         │
│  lib/useBarCalculation.ts                                              │
│  ├─ Calculates bar widths with rank-based amplification               │
│  ├─ Handles defense panel logic (flip values)                         │
│  └─ Returns { teamAPercentage, teamBPercentage, amplificationFactor } │
│                                                                         │
│  lib/useTheme.ts                                                       │
│  ├─ Manages color schemes, panel styles                                │
│  ├─ Provides team color utilities                                      │
│  └─ Returns { getTeamAColor, getPanelClasses, ... }                   │
└────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                      UTILITY FUNCTIONS & HELPERS                       │
│                                                                         │
│  utils/teamHelpers.ts                                                  │
│  ├─ isAverageTeam(teamName)                                            │
│  ├─ isNonSelectableSpecialTeam(teamName)                              │
│  ├─ shouldExcludeFromRanking(teamName)                                │
│  ├─ getTeamDisplayLabel(teamName) → "Avg (per game)"                  │
│  └─ getTeamEmoji(teamName) → "📊"                                     │
│                                                                         │
│  utils/teamDataTransform.ts                                            │
│  ├─ transformApiResponseToTeamData()                                   │
│  ├─ transformTeamDataByMode()                                          │
│  └─ transformAllTeamDataByMode()                                       │
│                                                                         │
│  lib/metricsConfig.ts                                                  │
│  ├─ AVAILABLE_METRICS (40+ definitions)                               │
│  ├─ getMetricsByCategory()                                             │
│  ├─ getMetricDefinition()                                              │
│  └─ formatMetricValue()                                                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Summary of UI Architecture

### **State Management Pattern:**
- **Global:** Team selection (Team A, Team B) managed at `ComparePage` level
- **Global:** Metrics selection managed at `ComparePage` level
- **Local:** Display mode (per-game vs total) managed at Panel level
- **Local:** Dropdown open/close states managed at Dropdown component level

### **Data Flow Pattern:**
1. **API → Hook:** `useNflStats` fetches data from API routes
2. **Hook → Page:** Page stores data in state
3. **Page → Panels:** Panels receive data + callbacks as props
4. **Panels → Rows:** Rows receive transformed data + callbacks
5. **Rows → Dropdowns:** Dropdowns receive callbacks that bubble up to Page

### **Callback Flow Pattern:**
```
User clicks team in RankingDropdown
  ↓
RankingDropdown.onClick
  ↓
DynamicComparisonRow.onTeamAChange
  ↓
OffensePanel.onTeamAChange
  ↓
ComparePage.handleTeamAChange
  ↓
setSelectedTeamA(newTeam)
  ↓
All panels re-render with new team
```

### **Re-render Triggers:**
- **Team change:** Triggers re-render of BOTH panels (offense + defense)
- **Metrics change:** Triggers re-render of specific panel only
- **Display mode change:** Triggers re-render of specific panel only
- **Data fetch:** Triggers re-render of all components when data arrives

---

## Questions Answered

### 7. Specific Behavior Questions

#### **Global State Flow:**
✅ Team selection flows: `TeamSelectionPanel` (deprecated) → `ComparePage` (global state) → `OffensePanel`/`DefensePanel` → `DynamicComparisonRow` → `TeamDropdown`/`RankingDropdown`

✅ Re-renders triggered when:
- `setSelectedTeamA()` or `setSelectedTeamB()` called → All panels re-render
- `setSelectedOffenseMetrics()` called → OffensePanel re-renders
- `setSelectedDefenseMetrics()` called → DefensePanel re-renders

✅ Callbacks threaded: `ComparePage` → Panel props → Row props → Dropdown props

#### **Ranking Dropdown (Previously "95% Complete"):**
✅ **RESOLVED:** When user clicks team in dropdown:
1. Dropdown calls `onTeamChange(teamName)`
2. Callback bubbles up to `ComparePage.handleTeamAChange()`
3. State updates via `setSelectedTeamA(teamName)`
4. All panels re-render with new team
5. Rankings recalculate via `useRanking` hook

✅ **Average Team Support Added:**
- "📊 Avg" badge remains clickable even when selected
- Average team appears last in RankingDropdown with separator
- Average team excluded from ranking calculations

#### **Display Mode Toggle:**
✅ Switching between "per-game" and "total":
- Affects ONLY the panel where dropdown is located
- Triggers `transformTeamData()` with new mode
- All `DynamicComparisonRow` components in that panel re-render
- Other panel unaffected (has separate displayMode state)

✅ State managed: LOCAL to each panel (OffensePanel and DefensePanel each have their own `useDisplayMode()` hook)

#### **theScore-Style Bars:**
✅ Bar widths calculated by `useBarCalculation` hook:
- Base ratio: `teamAValue / (teamAValue + teamBValue)`
- Amplification factor based on rank gap (1.2x - 2.5x)
- Exponential scaling: `Math.pow(baseRatio, amplificationFactor)`
- Normalization back to 100% width

✅ Animations triggered on:
- Component mount (initial render)
- Value change (team switch)
- Mode change (per-game ↔ total)

✅ Rank-based amplification:
- Rank gap 20+: 2.5x amplification (EXTREME)
- Rank gap 15-19: 2.2x (HUGE)
- Rank gap 10-14: 1.8x (BIG)
- Rank gap 5-9: 1.5x (MODERATE)
- Rank gap 0-4: 1.2x (SUBTLE)

#### **Metrics Selection:**
✅ Unlimited metrics can be selected (default max: 99)

✅ Changing metrics:
- Creates/destroys `DynamicComparisonRow` components via `.map()`
- Smooth animations via Framer Motion
- Panel re-renders with new metric rows

✅ Visual indicators:
- Selected metrics: Green border, checkmark, numbered badges
- Unselected metrics: Gray border, no checkmark

### 8. Edge Cases & Special States

✅ **Tied values:** Both teams show "T-5th" instead of "5th"

✅ **Loading states:**
- Initial load: "Loading offense data..." / "Loading defense data..."
- Invalid selection: "Select both teams to see offense comparison."

✅ **Error states:**
- API failure: ErrorBoundary with "⚠️ Offense Panel Error"
- Missing team: Shows "0" value, "N/A" rank

✅ **Offline mode:**
- Shows yellow banner: "You're offline. Showing cached data from [date]"
- Data freshness indicators: 'fresh', 'stale', 'unavailable'

### 9. Interactive Elements

✅ **All clickable elements:**
1. TeamDropdown logo
2. TeamDropdown menu items
3. RankingDropdown badge
4. RankingDropdown menu items
5. Display mode dropdown
6. FloatingMetricsButton
7. Metrics selector cards
8. Bulk action buttons

✅ **Hover/Focus/Active states:**
- Hover: Scale, shadow, color shifts
- Focus: Purple outline (2px)
- Active: Background lightens, border glows

✅ **Animations:**
- Dropdowns: Fade + scale (0.15s)
- Bars: Width transitions (0.3s)
- Drawer: Slide up (0.3s)

### 10. Responsive Behavior

✅ **Mobile vs Desktop:**
- Mobile: Single column, smaller text, compact dropdowns
- Desktop: Two columns, larger text, expanded dropdowns

✅ **Layout shifts:**
- < 1024px: Vertical stack (Offense above Defense)
- ≥ 1024px: Horizontal grid (Offense left, Defense right)

✅ **Touch targets:**
- Minimum 48px × 48px (WCAG AAA compliant)
- Touch optimizations: No tap highlight, no double-tap zoom

---

## 🎯 Key Takeaways

1. **Global Team Selection:** Team state lives at `ComparePage`, shared by both panels
2. **Local Display Mode:** Each panel manages its own per-game/total toggle
3. **Real-Time Ranking:** All rankings calculated client-side via `useRanking` hook
4. **Average Team Support:** "Avg Tm/G" row fully integrated, excluded from ranks, always appears last
5. **theScore-Style Bars:** Rank-based amplification (1.2x - 2.5x) makes differences dramatic
6. **Unlimited Metrics:** No hard limit on metrics (default: 99), easy to add more
7. **PWA-Ready:** Service Worker, offline support, mobile-optimized
8. **Fully Typed:** TypeScript strict mode, no `any` types

---

**End of Comprehensive UI Audit**

