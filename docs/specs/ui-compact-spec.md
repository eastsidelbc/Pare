---
source_of_truth: PROJECT_PLAN.md
rules_reference: CLAUDE.md
branch: docs-refactor
last_moved: 2025-10-19
---

> _This document is maintained under `/docs-refactor` branch and aligns with CLAUDE.md and PROJECT_PLAN.md._

# UI Compact Spec: Product Direction

**Date**: 2025-10-19  
**Purpose**: Concrete UI specification matching current implementation  
**Status**: Documentation of existing patterns + future feature slots

---

## Executive Summary

This document specifies the **compact, information-dense UI structure** for the Pare NFL comparison app. It documents the current theScore-inspired mobile layout and identifies future feature slots for:

1. **Header line** with game status, spread, O/U
2. **Mismatch chips** (insight pills based on ranked stats)
3. **Left rail scoreboard** (live games)

The specification ensures **consistent behavior** across current web implementation and future React Native port.

---

## 1. Header Line Spec (Future Feature)

### Current State
**NOT IMPLEMENTED** - Compare view has no game header line.

### Proposed Format

**Desktop Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│ MIN @ DET  •  LIVE Q3 04:23  •  DET -2.5  •  O/U 46.5  │ [⇅] │
└────────────────────────────────────────────────────────────────┘
```

**Mobile Layout** (compact):
```
┌───────────────────────────────────────────────┐
│ MIN @ DET  •  Q3 04:23                        │
│ DET -2.5  •  O/U 46.5                   [⇅]  │
└───────────────────────────────────────────────┘
```

### Format Specification

**Text Format**:
```
{AWAY} @ {HOME}  •  {STATUS/CLOCK}  •  {SPREAD}  •  O/U {TOTAL}  │ [SWAP]
```

**Field Definitions**:

| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| **AWAY** | string | 3-letter abbrev | `MIN` | Away team abbreviation |
| **HOME** | string | 3-letter abbrev | `DET` | Home team abbreviation |
| **STATUS** | enum | See below | `LIVE`, `FINAL`, `1:00 PM ET` | Game status indicator |
| **CLOCK** | string | `QN HH:MM` | `Q3 04:23` | Quarter + time remaining |
| **SPREAD** | string | `{TEAM} {±N.N}` | `DET -2.5` | Favorite team + line |
| **TOTAL** | string | `N.N` | `46.5` | Over/Under total |
| **SWAP** | button | Icon | `⇅` | Swap teams button |

**Status Values**:
- `PREGAME`: `{TIME} ET` (e.g., `1:00 PM ET`, `8:20 PM ET`)
- `LIVE`: `LIVE Q{N} {MM:SS}` (e.g., `LIVE Q3 04:23`)
- `HALFTIME`: `HALF {AWAY_SCORE}-{HOME_SCORE}`
- `FINAL`: `FINAL {AWAY_SCORE}-{HOME_SCORE}`
- `FINAL/OT`: `FINAL/OT {AWAY_SCORE}-{HOME_SCORE}`

### Visual Styling

**Desktop**:
```css
.game-header {
  height: 48px;
  padding: 0 16px;
  background: rgba(15, 23, 42, 0.8);  /* slate-900/80 */
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);  /* purple-500/20 */
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.game-status {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #e2e8f0;  /* slate-200 */
}

.live-indicator {
  color: #ef4444;  /* red-500 */
  animation: pulse 2s ease-in-out infinite;
}

.swap-button {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(139, 92, 246, 0.1);  /* purple-500/10 */
  border: 1px solid rgba(139, 92, 246, 0.3);
  cursor: pointer;
}
```

**Mobile**:
```css
.game-header-mobile {
  height: 64px;  /* Two-line layout */
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.9);
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.game-header-line-1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
}

.game-header-line-2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #94a3b8;  /* slate-400 */
}
```

### Update Behavior

**Silent Updates** (no loading spinner):
- Update clock every 1 second during LIVE games
- Update scores every 5 seconds (polling or WebSocket)
- No visible refresh animation

**Visual Indicators**:
- Red pulsing dot for LIVE games
- Score changes: Brief highlight (green = team scored, fade out after 2s)
- Status changes: Smooth transition (no flash)

**File Reference**: Proposed location: `components/GameHeader.tsx` (not yet created)

---

## 2. Mismatch Chips (Insight Pills)

### Current State
**NOT IMPLEMENTED** - No mismatch analysis in current UI.

### Proposed Format

**Visual Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│ Header Line (as above)                                          │
├────────────────────────────────────────────────────────────────┤
│ [Top-5 Pass O vs Bot-5 Pass D] [RZ TD%: 68% vs 44%] [...]  →  │
├────────────────────────────────────────────────────────────────┤
│ Comparison Panels                                              │
└────────────────────────────────────────────────────────────────┘
```

**Mobile Layout** (horizontal scroll):
```
┌───────────────────────────────────────────┐
│ [Top-5 Pass O vs Bot-5 Pass D]          →│
└───────────────────────────────────────────┘
```

### Chip Specification

**Visual Design**:
```css
.mismatch-chip {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border-radius: 16px;  /* Pill shape */
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

/* Severity-based colors */
.mismatch-chip.extreme {
  background: rgba(239, 68, 68, 0.15);   /* red-500/15 */
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;  /* red-300 */
}

.mismatch-chip.high {
  background: rgba(249, 115, 22, 0.15);  /* orange-500/15 */
  border: 1px solid rgba(249, 115, 22, 0.3);
  color: #fdba74;  /* orange-300 */
}

.mismatch-chip.moderate {
  background: rgba(234, 179, 8, 0.15);   /* yellow-500/15 */
  border: 1px solid rgba(234, 179, 8, 0.3);
  color: #fde047;  /* yellow-300 */
}
```

### Mismatch Rules (Deterministic)

**Rule Format**:
```typescript
interface MismatchRule {
  id: string;
  name: string;
  description: string;
  condition: (teamA: TeamData, teamB: TeamData, rankings: Rankings) => boolean;
  severity: 'extreme' | 'high' | 'moderate';
  displayText: (teamA: TeamData, teamB: TeamData) => string;
}
```

**Example Rules**:

```typescript
const MISMATCH_RULES: MismatchRule[] = [
  {
    id: 'elite-offense-vs-poor-defense',
    name: 'Elite Offense vs Poor Defense',
    description: 'Top-5 offense facing bottom-10 defense',
    condition: (teamA, teamB, rankings) => {
      const offenseRank = rankings.offense.points[teamA.team]?.rank || 99;
      const defenseRank = rankings.defense.points[teamB.team]?.rank || 99;
      return offenseRank <= 5 && defenseRank >= 23;  // Bottom 10 in 32-team league
    },
    severity: 'extreme',
    displayText: (teamA, teamB) => `Top-5 Offense vs Bottom-10 Defense`
  },
  
  {
    id: 'redzone-efficiency-gap',
    name: 'Red Zone Efficiency Mismatch',
    description: 'Large gap in red zone TD percentage',
    condition: (teamA, teamB, rankings) => {
      const teamA_RZ = parseFloat(String(teamA.redzone_td_pct || 0));
      const teamB_RZ = parseFloat(String(teamB.redzone_td_pct || 0));
      return Math.abs(teamA_RZ - teamB_RZ) >= 20;  // 20% difference
    },
    severity: 'high',
    displayText: (teamA, teamB) => {
      const a = parseFloat(String(teamA.redzone_td_pct || 0));
      const b = parseFloat(String(teamB.redzone_td_pct || 0));
      return `RZ TD%: ${a.toFixed(0)}% vs ${b.toFixed(0)}%`;
    }
  },
  
  {
    id: 'turnover-margin-advantage',
    name: 'Turnover Margin Advantage',
    description: 'Team with strong turnover differential advantage',
    condition: (teamA, teamB, rankings) => {
      const teamA_TO_margin = (teamA.turnovers_forced || 0) - (teamA.turnovers || 0);
      const teamB_TO_margin = (teamB.turnovers_forced || 0) - (teamB.turnovers || 0);
      return Math.abs(teamA_TO_margin - teamB_TO_margin) >= 8;
    },
    severity: 'high',
    displayText: (teamA, teamB) => {
      const marginA = (teamA.turnovers_forced || 0) - (teamA.turnovers || 0);
      const marginB = (teamB.turnovers_forced || 0) - (teamB.turnovers || 0);
      return `TO Margin: ${marginA > 0 ? '+' : ''}${marginA} vs ${marginB > 0 ? '+' : ''}${marginB}`;
    }
  },
  
  {
    id: 'pass-rush-vs-oline',
    name: 'Pass Rush vs O-Line',
    description: 'Elite pass rush facing weak pass protection',
    condition: (teamA, teamB, rankings) => {
      const sackRank = rankings.defense.sacks[teamA.team]?.rank || 99;
      const sackAllowedRank = rankings.offense.sacks_allowed[teamB.team]?.rank || 99;
      return sackRank <= 5 && sackAllowedRank >= 23;
    },
    severity: 'extreme',
    displayText: () => `Elite Pass Rush vs Weak O-Line`
  },
  
  {
    id: 'third-down-conversion-gap',
    name: '3rd Down Conversion Mismatch',
    description: 'Large gap in 3rd down conversion rates',
    condition: (teamA, teamB) => {
      const teamA_3rd = parseFloat(String(teamA.third_down_pct || 0));
      const teamB_3rd = parseFloat(String(teamB.third_down_pct || 0));
      return Math.abs(teamA_3rd - teamB_3rd) >= 15;  // 15% difference
    },
    severity: 'moderate',
    displayText: (teamA, teamB) => {
      const a = parseFloat(String(teamA.third_down_pct || 0));
      const b = parseFloat(String(teamB.third_down_pct || 0));
      return `3rd Down: ${a.toFixed(1)}% vs ${b.toFixed(1)}%`;
    }
  }
];
```

### Display Logic

**Max Visible**: 2 chips on screen, rest accessible via horizontal scroll

**Sorting Priority**:
1. Extreme severity first
2. High severity second
3. Moderate severity last
4. Within same severity: Alphabetical by rule ID

**Interaction**:
- Click chip → Scroll to relevant metric in comparison view
- Hover → Show full description tooltip
- No ML/AI yet - purely rule-based deterministic logic

**File Reference**: Proposed location: `components/MismatchChips.tsx` + `lib/mismatchRules.ts` (not yet created)

---

## 3. Compare Sections & Row Order

### Current Implementation

**Section Order** (matches current codebase):

```
1. Offense Panel
   ├─ Header: Team A Logo | "OFFENSE" | Team B Logo
   ├─ Mode Toggle: PER GAME ⟷ TOTAL
   └─ Metrics (default 5):
      ├─ Points (points)
      ├─ Total Yards (total_yards)
      ├─ Passing Yards (pass_yds)
      ├─ Rushing Yards (rush_yds)
      └─ Scoring % (score_pct)

2. Defense Panel
   ├─ Header: Team A Logo | "DEFENSE" | Team B Logo
   ├─ Mode Toggle: PER GAME ⟷ TOTAL
   └─ Metrics (default 8):
      ├─ Points Allowed (points)
      ├─ Yards Allowed (total_yards)
      ├─ Pass Yards Allowed (pass_yds)
      ├─ Rush Yards Allowed (rush_yds)
      ├─ Turnovers Forced (turnovers)
      ├─ Interceptions (pass_int)
      ├─ Opp Scoring % (score_pct)
      └─ Opp Turnover % (turnover_pct)
```

**File Reference**: `lib/metricsConfig.ts:355-370`

### Future V1 Row Order (Proposed)

**Goal**: Logical progression from high-level to detailed stats

```
V1 Proposed Order:

1. SCORING & EFFICIENCY (High-level overview)
   ├─ Points For/Against
   ├─ Total Yards
   ├─ Yards per Play
   ├─ Scoring % (drives ending in TD/FG)
   └─ Third Down %

2. OFFENSE (Detailed breakdown)
   ├─ Passing Yards
   ├─ Pass TDs
   ├─ Completions
   ├─ Pass Yards/Attempt
   ├─ Rushing Yards
   ├─ Rush TDs
   └─ Rush Yards/Attempt

3. DEFENSE (Detailed breakdown)
   ├─ Sacks
   ├─ Turnovers Forced
   ├─ Interceptions
   ├─ Fumbles Forced
   ├─ Pass Yards Allowed
   └─ Rush Yards Allowed

4. SPECIAL TEAMS (If implemented)
   ├─ FG %
   ├─ Punt Average
   ├─ Kick Return Average
   └─ Punt Return Average
```

**Customization**: Users can reorder via MetricsSelector (current feature)

**File Reference**: `components/MetricsSelector.tsx:1-400`

---

## 4. Number Formatting & Display

### Current Formatting Rules

**File**: `lib/metricsConfig.ts:1-400`

```typescript
export type MetricFormat = 'number' | 'decimal' | 'percentage' | 'time';

// Formatting logic
export function formatMetricValue(value: string | number, format: MetricFormat): string {
  const num = parseFloat(String(value));
  
  if (isNaN(num)) return '0';
  
  switch (format) {
    case 'number':
      return num.toFixed(0);  // Integer: 245
    
    case 'decimal':
      return num.toFixed(1);  // 1 decimal: 38.9
    
    case 'percentage':
      return `${num.toFixed(1)}%`;  // Percentage: 68.4%
    
    case 'time':
      return value.toString();  // Time string: "03:24"
    
    default:
      return num.toFixed(0);
  }
}
```

**Examples**:

| Metric | Raw Value | Format | Displayed |
|--------|-----------|--------|-----------|
| Points | `245` | `number` | `245` |
| Pass Yards | `3891.2` | `decimal` | `3891.2` |
| Per Game Points | `38.888` | `decimal` | `38.9` |
| Third Down % | `0.423` | `percentage` | `42.3%` |
| Scoring % | `0.684` | `percentage` | `68.4%` |
| Time of Possession | `31:24` | `time` | `31:24` |

**File Reference**: `lib/metricsConfig.ts:421-445`

### Future Enhancement: Monospace Numbers

**Current Issue**: Numbers not aligned vertically (different digit widths)

**Proposed Fix**:
```css
.metric-value {
  font-family: 'SF Mono', 'Roboto Mono', 'Courier New', monospace;
  font-feature-settings: 'tnum';  /* Tabular nums */
  letter-spacing: -0.02em;
}
```

**Impact**: Better vertical alignment in comparison view

---

## 5. Accessibility & Density Targets

### Touch Target Sizes

**iOS Human Interface Guidelines Compliance**:

| Element | Desktop | Mobile | File Reference |
|---------|---------|--------|----------------|
| **Team Logo** | 60×60px | 60×60px | `components/mobile/CompactPanelHeader.tsx:38` |
| **Rank Badge** | 32×32px | 44×44px | `components/mobile/CompactRankingDropdown.tsx:48` |
| **Mode Toggle** | 36×36px | 44×44px | `components/mobile/CompactPanelHeader.tsx:60` |
| **Tab Bar Item** | N/A | 64px height | `components/mobile/MobileBottomBar.tsx:20` |
| **Dropdown Row** | 40px height | 48px height | `components/mobile/CompactRankingDropdown.tsx:220` |

**Minimum**: 44×44px for all interactive elements on mobile (iOS HIG)

### Spacing Rhythm

**8px Grid System**:

```css
/* Mobile spacing */
--space-1: 8px;   /* 0.5rem */
--space-2: 16px;  /* 1rem */
--space-3: 24px;  /* 1.5rem */
--space-4: 32px;  /* 2rem */

/* Desktop spacing */
--space-1: 12px;  /* 0.75rem */
--space-2: 24px;  /* 1.5rem */
--space-3: 36px;  /* 2.25rem */
--space-4: 48px;  /* 3rem */
```

**File Reference**: `tailwind.config.js:17-22`

### Row Height Targets

**Desktop**:
```
┌─────────────────────────────────────────────┐
│ VALUE  (RANK)    METRIC NAME    (RANK) VALUE│  ← 24px
│ ════════════ BAR WIDTH ═════════════════════│  ← 20px + 16px padding
│                                              │  ← Total: ~70px
└─────────────────────────────────────────────┘
```

**Mobile**:
```
┌───────────────────────────────────────┐
│ VAL (RANK)  METRIC NAME  (RANK) VAL  │  ← 32px (padded)
│████████████████████████████████████░░│  ← 6px (edge-to-edge)
│                                       │  ← Total: ~52px
└───────────────────────────────────────┘
```

**File References**:
- Desktop row: `components/DynamicComparisonRow.tsx:126-221`
- Mobile row: `components/mobile/CompactComparisonRow.tsx:124-206`

### Typography Scale

| Element | Desktop | Mobile | Weight | File Reference |
|---------|---------|--------|--------|----------------|
| **Metric Value** | 16px (1rem) | 15px | 600 | `CompactComparisonRow.tsx:132` |
| **Metric Name** | 14px (0.875rem) | 13px | 500 | `CompactComparisonRow.tsx:154` |
| **Rank Badge** | 12px (0.75rem) | 11px | 400 | `CompactRankingDropdown.tsx:235` |
| **Panel Title** | 24px (1.5rem) | 18px | 700 | `OffensePanel.tsx:85` |
| **Tab Label** | N/A | 11px | 500 | `MobileBottomBar.tsx:40` |

**Font Stack**:
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**File Reference**: `tailwind.config.js:10-12`

---

## 6. Left Rail (Scoreboard) Spec

### Current State
**NOT IMPLEMENTED** - No scoreboard rail in current UI.

### Proposed Layout

**Desktop (256px fixed width)**:
```
┌──────────────────────────┐
│ LIVE GAMES       [↻]     │
├──────────────────────────┤
│ 🔴 KC 24 @ BUF 20        │
│    Q3 04:23 │ KC -2.5    │
├──────────────────────────┤
│ 🔴 SF 17 @ SEA 14        │
│    Q2 08:15 │ SF -3      │
├──────────────────────────┤
│ UPCOMING                 │
├──────────────────────────┤
│ MIN @ DET                │
│ 1:00 PM ET │ DET -2.5    │
├──────────────────────────┤
│ FINAL                    │
├──────────────────────────┤
│ DAL 31, NYG 28           │
│ FINAL/OT                 │
└──────────────────────────┘
```

**Mobile (Slide-out drawer from left)**:
```
┌─────────────────────────────────┐
│ ← GAMES                [↻] [✕] │
├─────────────────────────────────┤
│ 🔴 LIVE                         │
│                                  │
│ KC 24 @ BUF 20  Q3 04:23        │
│ KC -2.5 • O/U 46.5              │
│                                  │
│ SF 17 @ SEA 14  Q2 08:15        │
│ SF -3 • O/U 44                  │
├─────────────────────────────────┤
│ UPCOMING                         │
│                                  │
│ MIN @ DET  1:00 PM ET           │
│ DET -2.5 • O/U 48.5             │
└─────────────────────────────────┘
```

### Row Format Specification

**One-Line Row Format**:
```
{AWAY_ABBREV} {AWAY_SCORE} @ {HOME_ABBREV} {HOME_SCORE}  {STATUS}
```

**Examples**:
- LIVE: `KC 24 @ BUF 20  Q3 04:23`
- UPCOMING: `MIN @ DET  1:00 PM ET`
- FINAL: `DAL 31, NYG 28  FINAL/OT`

**Sorting Logic**:
1. **LIVE** games (by most recent scoring play)
2. **UPCOMING** games (by kickoff time, soonest first)
3. **FINAL** games (by game end time, most recent first)

### Click Behavior

**V1 (Simple)**: Replace current compare teams
```typescript
function handleGameClick(gameId: string) {
  const game = games.find(g => g.id === gameId);
  
  setSelectedTeamA(game.awayTeam);
  setSelectedTeamB(game.homeTeam);
  
  // Mobile: Close drawer
  if (isMobile) {
    setDrawerOpen(false);
  }
}
```

**V2 (Future)**: Dock multiple comparisons
```typescript
function handleGameClick(gameId: string, modifier: 'none' | 'cmd' | 'shift') {
  if (modifier === 'cmd') {
    // Dock side-by-side (desktop only)
    addComparisonPanel(gameId);
  } else {
    // Replace current
    replaceComparison(gameId);
  }
}
```

**File Reference**: Proposed location: `components/ScoreboardRail.tsx` (not yet created)

---

## 7. Mobile Drawer Behavior

### Proposed Drawer Specs

**Open Trigger**:
- Tap hamburger menu icon in MobileTopBar (☰)
- Swipe right from left edge (gesture)

**Close Trigger**:
- Tap close button (✕)
- Tap outside drawer (backdrop)
- Swipe left (gesture)
- Select a game (auto-close)

**Animation**:
```css
.drawer-enter {
  transform: translateX(-100%);
}

.drawer-enter-active {
  transform: translateX(0);
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-exit {
  transform: translateX(0);
}

.drawer-exit-active {
  transform: translateX(-100%);
  transition: transform 200ms cubic-bezier(0.4, 0, 1, 1);
}
```

**Backdrop**:
```css
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 40;
}
```

**File Reference**: Proposed location: `components/mobile/GameDrawer.tsx` (not yet created)

---

## 8. Visual Consistency Rules

### Color Palette (Pare Brand)

**Background Gradients**:
```css
/* Desktop: Multi-layer steel-blue */
.desktop-bg {
  background: linear-gradient(135deg, #070d16 0%, #0b1120 25%, #1e293b 100%);
}

/* Mobile: Simpler steel-blue */
.mobile-bg {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
}
```

**Team Colors**:
```css
/* Team A (Left) */
--team-a-primary: #10B981;    /* green-500 */
--team-a-gradient: linear-gradient(90deg, #10B981 0%, #059669 100%);

/* Team B (Right) */
--team-b-primary: #F97316;    /* orange-500 */
--team-b-gradient: linear-gradient(90deg, #F97316 0%, #EA580C 100%);
```

**Accent Colors**:
```css
--purple-accent: #8B5CF6;     /* purple-500 - panel headers */
--blue-accent: #3B82F6;       /* blue-500 - interactive elements */
--red-live: #EF4444;          /* red-500 - live indicators */
```

**File Reference**: `tailwind.config.js:13-16, app/compare/page.tsx:194-204`

### Border & Shadow System

**Borders**:
```css
/* Panel borders */
border: 1px solid rgba(100, 116, 139, 0.3);  /* slate-500/30 */

/* Section separators */
border-bottom: 1px solid rgba(139, 92, 246, 0.2);  /* purple-500/20 */

/* Dropdown borders */
border: 1px solid rgba(71, 85, 105, 0.5);  /* slate-600/50 */
```

**Shadows**:
```css
/* Panel floating shadow */
box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.4), 
            0 0 0 1px rgba(255, 255, 255, 0.06);

/* Bar glow effects */
box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);  /* green glow */
box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);  /* orange glow */
```

**File Reference**: `tailwind.config.js:33-39`

---

## 9. Interaction Patterns

### Dropdown Behavior

**Open Trigger**:
- Desktop: Click rank badge or team logo
- Mobile: Tap rank badge or team logo

**Close Trigger**:
- Select a team (auto-close)
- Click outside dropdown
- Press Escape key (desktop)
- Scroll page (desktop)

**Positioning**:
- Desktop: Floating UI (auto-flip, auto-shift)
- Mobile: Fixed positioning (responsive height)

**File Reference**: `components/RankingDropdown.tsx:142-150`

### Mode Toggle (Per-Game ⟷ Total)

**Desktop**: Select dropdown
```html
<select>
  <option value="per-game">PER GAME</option>
  <option value="total">TOTAL</option>
</select>
```

**Mobile**: Instant button toggle (no dropdown)
```html
<div className="toggle-container">
  <button className={mode === 'per-game' ? 'active' : ''}>
    PER GAME
  </button>
  <button className={mode === 'total' ? 'active' : ''}>
    TOTAL
  </button>
</div>
```

**File References**:
- Desktop: `components/OffensePanel.tsx:90-98`
- Mobile: `components/mobile/CompactPanelHeader.tsx:60-75`

### Bar Animation

**On Load**: Animate from 0% to final width (300ms ease-out)
```css
@keyframes bar-load {
  0% { width: 0%; opacity: 0; }
  100% { width: var(--target-width); opacity: 1; }
}
```

**On Team Change**: Smooth transition (300ms ease-out)
```css
.bar {
  transition: width 300ms ease-out;
}
```

**File Reference**: `tailwind.config.js:64-67, components/DynamicComparisonRow.tsx:197-203`

---

## 10. Keyboard Navigation (Future Enhancement)

### Current State
**NOT IMPLEMENTED** - Mouse/touch only.

### Proposed Shortcuts

**Global**:
- `Cmd/Ctrl + K`: Open team search
- `Cmd/Ctrl + M`: Open metrics selector
- `Tab`: Cycle through interactive elements
- `Escape`: Close any open dropdown

**Dropdowns**:
- `↑/↓`: Navigate list
- `Enter`: Select highlighted team
- `Escape`: Close dropdown
- `Home`: Jump to first team
- `End`: Jump to last team
- Type team name: Jump to matching team

**Comparison View**:
- `1-9`: Switch metric sets (preset favorites)
- `Cmd/Ctrl + ⇧ + M`: Toggle PER GAME ⟷ TOTAL
- `Cmd/Ctrl + ⇧ + S`: Swap teams

---

## 11. Error States & Empty States

### No Data Available

```
┌─────────────────────────────────────────┐
│        ⚠️                                │
│   No Data Available                     │
│                                          │
│   The NFL stats API is currently        │
│   unavailable. Please try again later.  │
│                                          │
│   [Retry]                                │
└─────────────────────────────────────────┘
```

### Loading State

```
┌─────────────────────────────────────────┐
│   Loading NFL data...                   │
│   [Progress spinner]                    │
└─────────────────────────────────────────┘
```

### No Live Games

```
┌─────────────────────────────────────────┐
│   No Live Games                          │
│                                          │
│   Next game starts in 2h 34m            │
│   MIN @ DET • 1:00 PM ET                │
└─────────────────────────────────────────┘
```

**File Reference**: `app/compare/page.tsx:119-162`

---

## 12. Responsive Breakpoint Summary

| Breakpoint | Width | Layout Changes | File Reference |
|------------|-------|----------------|----------------|
| **xs** | 0-639px | Mobile layout, single column | `useIsMobile.ts:10` |
| **sm** | 640-767px | Mobile layout, increased padding | `tailwind.config.js` |
| **md** | 768-1023px | Mobile layout, tablet tweaks | `tailwind.config.js` |
| **lg** | 1024px+ | **Desktop layout switch** | `app/compare/page.tsx:24,167` |
| **xl** | 1280px+ | Max-width containers | `tailwind.config.js` |
| **2xl** | 1536px+ | Extra-wide spacing | `tailwind.config.js` |

**Critical Breakpoint**: `1024px` - Complete component tree replacement

---

## 13. Performance Targets

### Desktop

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| **Initial Load** | < 2s | ~1.5s | Good |
| **API Response (cached)** | < 100ms | ~50ms | Excellent |
| **Dropdown Open** | < 16ms | ~15ms | 60fps |
| **Bar Animation** | 60fps | 60fps | Smooth |
| **Mode Toggle** | < 100ms | ~50ms | Instant |

### Mobile

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| **Initial Load (4G)** | < 3s | ~2.5s | Good |
| **Touch Response** | < 100ms | ~50ms | Snappy |
| **Scroll Performance** | 60fps | 60fps | Smooth |
| **Drawer Animation** | 60fps | N/A | Not implemented |
| **Service Worker Cache** | < 50ms | ~20ms | Excellent |

**File Reference**: `app/compare/page.tsx:88-116` (performance monitoring)

---

## Summary

This specification documents the **current compact UI structure** and identifies clear slots for future features:

**Implemented** ✅:
- theScore-inspired mobile layout
- Desktop/mobile dual architecture
- Bar visualization with amplification
- Dropdown positioning system
- Touch-optimized interactions

**Future Slots** 🎯:
- Game header line (status, spread, O/U)
- Mismatch chips (deterministic insight pills)
- Left rail scoreboard (live games)
- Keyboard navigation
- Multi-comparison docking (desktop)

All specifications are **deterministic and rule-based** - ready for React Native port with behavior parity.

---

**End of UI Spec**

