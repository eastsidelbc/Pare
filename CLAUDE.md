# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Pare NFL Comparison Platform. **ALWAYS READ PROJECT_PLAN.md FIRST** for current status, rules, and context.

## 🎯 Project Overview

**Pare** is a production-ready, professional NFL team comparison platform built with Next.js 15 and TypeScript. It features:

- **Real-time 2025 NFL data** from Pro Football Reference (32 teams, 44+ metrics)
- **theScore-style visualization bars** with mathematical precision and rank-based amplification
- **Advanced per-game calculations** with smart field detection (excludes percentages/rates)
- **Interactive ranking dropdowns** allowing team selection by rank position (95% complete - debugging state management)
- **Self-hosted architecture** optimized for M1 Mac + PM2 deployment
- **Professional modular codebase** recently refactored from 437-line monolith to clean architecture

**🎯 PRIMARY STRATEGIC GOAL**: While currently a web application, the **biggest objective is to convert this to a native iOS app for the App Store**. The web app serves as the foundation and proof-of-concept, with the ultimate goal being to learn Swift and create a native mobile experience that leverages the existing API infrastructure and data processing logic.

**Current Status**: ✅ **Web App & PWA Complete** (Phase 1-2 Complete) | 🍎 **NOW STARTING: Phase 0 - iOS Swift Development** | Full 6-phase roadmap to App Store in `Mobile_plan.md`

## 📱 **Strategic Development Direction**

### **Primary Long-term Goal: iOS App Store**
The web application serves as a **proof-of-concept and API foundation** for the ultimate goal:

**🎯 Convert to Native iOS App:**
- **Learn Swift programming language** for native iOS development
- **Leverage existing infrastructure**: Keep CSV processing, API routes, and data logic
- **Enhance for mobile**: Touch-optimized theScore-style bars, native iOS design patterns
- **App Store deployment**: Implement iOS-specific features and monetization strategies
- **Maintain architecture**: Current modular design supports mobile conversion

### **🚀 CURRENT PHASE: iOS Native Development Roadmap**

**Status**: ✅ **Phase 1-2 Complete** (Web + PWA) | 🍎 **NOW STARTING: Phase 0** (iOS Foundations)  
**Target**: 🍎 **App Store Launch in Q1 2025**

**6-Phase iOS Development Strategy** (detailed in `Mobile_plan.md`):

#### **🍎 Phase 0: Foundations (Repo + Runtime) - CURRENT**
**Goal**: Clean, reproducible environment + stable API endpoints for iOS
- **Repo Hygiene**: Single lockfile, add MOBILE_NOTES.md, ios/README.md, SECURITY.md
- **API Readiness**: HTTPS base URL (ATS compliance), `/health` endpoint with version
- **Versioning**: Adopt SemVer (1.0.0) for iOS 1.0
- **Gate Questions**: 
  - Are we using Cloudflare in front of API for HTTPS?
  - SemVer or CalVer?

#### **📱 Phase 1: iOS Project Bootstrap**
**Goal**: SwiftUI app skeleton that compiles, runs, and talks to API
- **Xcode Project**: iOS 17+ target, PrivacyInfo.xcprivacy, AppIcon, Launch screen
- **Networking Layer**: StatsAPI.swift with async/await, URLCache, Config.xcconfig
- **Domain Models**: Swift structs mirror API responses (Team, Metric, CompareResult)
- **Basic Screen**: CompareView with team pickers, fetch on load, MetricRowViews
- **Gate Questions**:
  - Minimum iOS version? (16 or 17)
  - Dark mode only or both light/dark?

#### **📱 Phase 2: Core UX Mechanics**
**Goal**: Native UX parity with web app for Compare flow
- **Team Selection**: Real team list, persist via AppStorage
- **Inward Bars**: MetricRowView with ratio-based bars, smooth animations, optional haptics
- **Caching & Offline**: URLCache baseline, cache TTLs, offline banner
- **Errors & Retries**: Empty/error states, retry button, exponential backoff
- **Gate Questions**:
  - Show value labels on bars always or on tap?
  - Aggressive vs conservative caching?

#### **📱 Phase 3: Native System Integrations (Lite)**
**Goal**: Essential native features without Live Activities
- **Share Sheet**: Deep link to web `/compare?home=X&away=Y`, universal link handling
- **Siri Shortcut** (optional): "Compare [TEAM] and [TEAM]"
- **Settings Screen**: Default teams, refresh policy, theme toggle
- **Gate Questions**:
  - Add Siri Shortcut v1 now or later?
  - Any default favorite teams to seed?

#### **📱 Phase 4: Polish & Performance**
**Goal**: App Store-quality fit and finish
- **Design Pass**: 44×44pt touch targets, typography hierarchy, VoiceOver labels, Dynamic Type
- **Perf Pass**: Cold start profiling, image optimization, ETags/If-None-Match
- **QA Matrix**: iPhone 12-15, iOS 17+, airplane mode, bad network, server down
- **Gate Questions**:
  - Support both orientations or portrait only?
  - Reduced motion default for accessibility?

#### **📱 Phase 5: Distribution**
**Goal**: TestFlight → App Store with clean metadata
- **App Store Connect**: Name, subtitle, keywords, support URL, privacy policy
- **Build & Upload**: Version/build increment, Archive → TestFlight
- **Review Compliance**: Not "just a website" (native screens, share, settings, deep links)
- **Gate Questions**:
  - App name/subtitle finalized?
  - Beta feedback prompt in Settings?

#### **📱 Phase 6: Optional Enhancements (Post-1.0)**
**Goal**: Advanced features after successful launch
- **Widgets**: Small/medium widgets for favorite matchup snapshot
- **Push Notifications**: "New week's stats are live" (requires APNs)
- **In-App Purchases**: Pro tier with historical stats, saved matchups
- **Deeper Animations**: Springy bar transitions, haptics on compare flips
- **Gate Questions**:
  - Which post-1.0 enhancement to prioritize?
  - Monetization now or after traction?

#### **Definition of Done (v1.0)**
- ✅ Clean builds (Xcode + Next.js), green lint/TS/CI
- ✅ iOS app loads compare view, works offline after first fetch
- ✅ Share → deep link returns to correct teams
- ✅ Accessibility & performance passes documented
- ✅ TestFlight tested on ≥3 devices
- ✅ Submitted with complete metadata & screenshots

## 🛠️ Development Commands

### Core Commands
```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Production build with Turbopack
npm run start        # Start production server
npm run lint         # Run ESLint for code quality

# Deployment (PM2)
pm2 start npm --name "pare-nfl" -- start
pm2 status
pm2 logs pare-nfl
pm2 restart pare-nfl
```

### Data Updates
The app uses manual CSV exports from Pro Football Reference:
1. Visit https://www.pro-football-reference.com/years/2025/#team_stats → Export to `data/pfr/offense-2025.csv`
2. Visit https://www.pro-football-reference.com/years/2025/opp.htm#team_stats → Export to `data/pfr/defense-2025.csv`
3. Optional: `pm2 restart pare-nfl` (data cached for 6 hours)

## 📐 Detailed Architecture Overview

### Core Philosophy
- **Hook-based architecture**: Business logic lives in custom hooks (useNflStats, useRanking, useDisplayMode, useTheme), components focus on UI rendering only
- **Client-side calculations**: Rankings computed client-side via `useRanking` hook for accuracy and performance (never server-side)
- **Self-contained panels**: OffensePanel and DefensePanel each manage their own display mode and metrics independently
- **Position-based CSV mapping**: Handles duplicate column names (multiple "Yds" columns) via exact column position mapping in `lib/pfrCsv.ts`
- **Global state management**: Team selection managed at ComparePage level, passed down through props (no external state library)

### Complete File Structure & Responsibilities

#### **Main Application Pages**
- **`app/page.tsx`**: Landing page with API documentation and feature overview
- **`app/compare/page.tsx`**: Main comparison interface - orchestrates global team selection state, passes callbacks to panels
- **`app/layout.tsx`**: Global layout, metadata, and styling setup

#### **API Routes (Next.js App Router)**
- **`app/api/nfl-2025/offense/route.ts`**: Offense API - parses `data/pfr/offense-2025.csv` using position-based mapping, returns raw data (no server-side ranking)
- **`app/api/nfl-2025/defense/route.ts`**: Defense API - parses `data/pfr/defense-2025.csv`, same pattern as offense
- **Performance**: ~50ms cached responses, 6-hour in-memory cache, graceful degradation with stale data

#### **Core Components (Self-Contained)**
- **`components/OffensePanel.tsx`**: Complete offense comparison section (~140 lines)
  - Manages own display mode (per-game/total)
  - Renders team logos, metrics selector, comparison rows
  - Passes onTeamAChange/onTeamBChange callbacks to DynamicComparisonRow
- **`components/DefensePanel.tsx`**: Complete defense comparison section (mirrors OffensePanel)
- **`components/DynamicComparisonRow.tsx`**: Individual metric comparison visualization
  - Renders team values, ranking badges, theScore-style bars
  - Integrates RankingDropdown for interactive team selection
  - Uses useRanking hook for client-side rank calculations
  - Uses useBarCalculation for proportional bar widths

#### **Interactive Components**
- **`components/RankingDropdown.tsx`**: Interactive ranking dropdown (95% complete - debugging needed)
  - Shows teams ranked by specific metric with emoji indicators (🥇🥈🥉)
  - Handles tie visualization with special treatment
  - **CURRENT ISSUE**: State management - callbacks not propagating to global state
- **`components/TeamSelectionPanel.tsx`**: Global team selector at top of page
- **`components/TeamSelector.tsx`**: Reusable team dropdown with sorting
- **`components/MetricsSelector.tsx`**: Unlimited metrics selection interface

#### **Business Logic Hooks (CRITICAL)**
- **`lib/useNflStats.ts`**: Data fetching and caching
  - Fetches from offense/defense APIs simultaneously
  - Handles loading states, errors, and cache management
  - Returns transformed data ready for UI consumption
- **`lib/useRanking.ts`**: Client-side ranking calculations
  - `calculateBulkRanking()` - computes rankings for all teams/metrics
  - Perfect tie handling with proper rank gaps
  - Context-aware (defense metrics invert higherIsBetter)
- **`lib/useDisplayMode.ts`**: Per-game vs total toggle
  - Smart field detection (excludes percentages, rates from conversion)
  - Transforms team data based on games played
- **`lib/useTheme.ts`**: Dynamic theming system
  - Multiple color schemes, panel styling options
  - Team-specific colors (green for Team A, orange for Team B)
- **`lib/useBarCalculation.ts`**: theScore-style bar calculations
  - Proportional width calculations with rank-based amplification
  - Elite vs poor team dramatic scaling (up to 3.0x amplification)

#### **Configuration & Data**
- **`lib/metricsConfig.ts`**: Complete NFL metrics registry (44+ metrics)
  - Metric definitions with display names, categories, ranking direction
  - Available in offense/defense flags
  - Format types (number, decimal, percentage)
- **`lib/pfrCsv.ts`**: CSV parsing engine with position-based column mapping
- **`config/constants.ts`**: Centralized constants (cache times, API endpoints, special teams)
- **`data/pfr/offense-2025.csv`** & **`defense-2025.csv`**: Raw NFL data (manual exports)

#### **Utilities**
- **`utils/teamDataTransform.ts`**: Data transformation utilities
- **`utils/logger.ts`**: Structured logging with emoji prefixes and request IDs
- **`utils/helpers.ts`**: Common helper functions

### Data Flow (Detailed)
```
1. Manual CSV Export from Pro Football Reference
   ↓
2. Local Storage: data/pfr/*.csv files
   ↓
3. API Routes: Parse CSV using position-based mapping (lib/pfrCsv.ts)
   ↓
4. JSON Response: Raw team data with 6-hour caching
   ↓
5. useNflStats Hook: Fetch and transform API data
   ↓
6. useRanking Hook: Calculate client-side rankings per metric
   ↓
7. useDisplayMode Hook: Apply per-game calculations
   ↓
8. DynamicComparisonRow: Render individual comparisons
   ↓
9. useBarCalculation Hook: Calculate proportional bar widths with amplification
   ↓
10. theScore-style Bars: Mathematical precision visualization
```

## 🎨 theScore Bar System

The visualization uses mathematically precise proportional bars:
```typescript
const teamAPercentage = (teamAValue / (teamAValue + teamBValue)) * 100;
const teamBPercentage = (teamBValue / (teamAValue + teamBValue)) * 100;
```

Key features:
- **Inward growth**: Left bar extends right, right bar extends left
- **Perfect connection**: Bars always meet in center showing exact performance ratio
- **Rank-based amplification**: Elite vs poor team matchups get dramatic visual scaling (up to 3.0x)

## 🏗️ Technical Implementation Details

### CSV Processing
Uses position-based column mapping to handle duplicate "Yds" columns:
```typescript
const CSV_COLUMN_MAPPING_BY_POSITION = {
  3: 'points',           // PF = Points For
  4: 'total_yards',      // Yds = TOTAL YARDS (position 4)
  12: 'pass_yds',        // Yds = PASSING YARDS (position 12)
  18: 'rush_yds',        // Yds = RUSHING YARDS (position 18)
};
```

### Smart Per-Game Calculations
```typescript
// Automatically detects percentage fields and excludes them from per-game conversion
if (!key.includes('pct') && !key.includes('per') && isNumeric(teamData[key])) {
  teamData[key] = (parseFloat(teamData[key]) / games).toFixed(1);
}
```

### Complete Metrics Configuration System

The platform features a comprehensive metrics registry in `lib/metricsConfig.ts` supporting **44+ NFL statistics** with context-aware display for both offense and defense.

#### **Metrics Architecture Overview**
- **Universal Data Source**: Both offense and defense use identical CSV column structure from Pro Football Reference
- **Context-Dependent Display**: Same raw data interpreted differently (e.g., "turnovers committed" vs "turnovers forced")
- **Smart Availability Filtering**: Metrics marked `availableInOffense`/`availableInDefense` control UI display
- **Ranking Context**: `higherIsBetter` flag handles context-dependent ranking logic
- **Category Organization**: Metrics grouped by category (scoring, passing, rushing, efficiency, advanced)

#### **Metric Definition Structure**
```typescript
interface MetricDefinition {
  name: string;                    // Display name: "Passing Yards (Yds)"
  field: string;                   // CSV field: "pass_yds" 
  category: string;                // UI grouping: "passing"
  higherIsBetter: boolean;         // Ranking direction
  format: 'number'|'decimal'|'percentage'|'time'; // Display format
  description: string;             // Tooltip text
  availableInOffense: boolean;     // Show in offense metrics selector
  availableInDefense: boolean;     // Show in defense metrics selector
}
```

#### **Complete Metrics Inventory**

**🏈 Basic Stats (Available Both)**
- `g` - Games Played
- `points` - Points For/Against (PF/PA)
- `total_yards` - Total Yards Gained/Allowed
- `first_down` - First Downs

**⚡ Efficiency Metrics**
- `plays_offense` - Offensive Plays Run/Allowed
- `yds_per_play_offense` - Yards per Play
- `turnovers` - **Context-dependent**: Committed (offense) vs Forced (defense) 
- `fumbles_lost` - **Context-dependent**: Lost (offense) vs Forced (defense)

**📡 Passing Stats (26 metrics total)**
- `pass_cmp` - Completions Made/Allowed
- `pass_att` - Pass Attempts 
- `pass_yds` - Passing Yards
- `pass_td` - Passing Touchdowns Scored/Allowed
- `pass_int` - **Context-dependent**: Thrown (offense) vs Made (defense)
- `pass_net_yds_per_att` - Net Yards per Attempt
- `pass_first_down` - Passing First Downs

**🏃 Rushing Stats**
- `rush_att` - Rush Attempts Made/Faced
- `rush_yds` - Rushing Yards  
- `rush_td` - Rushing Touchdowns Scored/Allowed
- `rush_yds_per_att` - Rushing Yards per Attempt
- `rush_fd` - Rushing First Downs

**🚫 Penalties (Both Sides)**
- `penalties` - Penalties Committed
- `penalties_yds` - Penalty Yards
- `pen_fd` - Penalty First Downs

**📊 Advanced Efficiency**
- `third_down_pct` - 3rd Down Conversion %
- `score_pct` - Scoring Percentage 
- `turnover_pct` - **Context-dependent**: Drives ending in turnovers
- `exp_pts_tot` - Expected Points For/Against

#### **Context-Dependent Ranking Logic**

**Offense Perspective (Higher = Better)**
- More points, yards, touchdowns, completions = better performance
- Fewer turnovers, interceptions, penalties = better performance

**Defense Perspective (Interpretation Flip)**
- **Good for Defense**: More turnovers forced, more interceptions = better defense
- **Bad for Defense**: Fewer points/yards/touchdowns allowed = better defense

**Example Context Handling:**
```typescript
'turnovers': {
  name: 'Turnovers (TO)',
  higherIsBetter: false, // Base setting
  description: 'Turnovers per game (offense: committed, defense: forced)'
  // UI shows: "Turnovers Committed" (offense) vs "Turnovers Forced" (defense)
  // Ranking: Low rank good for offense, high rank good for defense
}
```

#### **Default Metric Sets**
```typescript
DEFAULT_OFFENSE_METRICS = [
  'points', 'total_yards', 'pass_yds', 'rush_yds', 'score_pct'
];

DEFAULT_DEFENSE_METRICS = [
  'points',        // Points allowed
  'total_yards',   // Yards allowed  
  'pass_yds',      // Passing yards allowed
  'rush_yds',      // Rushing yards allowed
  'turnovers',     // Turnovers FORCED (good!)
  'pass_int',      // Interceptions MADE (good!)
  'score_pct',     // Opponent scoring %
  'turnover_pct'   // Opponent turnover % (good for defense!)
];
```

#### **Usage in UI Components**
```typescript
// Get available metrics for current panel type
const availableMetrics = getAvailableMetrics(type); // 'offense' | 'defense'

// Get metrics grouped by category for selector
const groupedMetrics = getMetricsByCategory(type);

// Format metric value for display  
const displayValue = formatMetricValue(rawValue, metric.format);
```

#### **Adding New Metrics**
1. **Add to CSV Column Mapping**: Update `CSV_COLUMN_MAPPING_BY_POSITION` in `lib/pfrCsv.ts`
2. **Define Metric**: Add entry to `AVAILABLE_METRICS` in `lib/metricsConfig.ts`
3. **Set Availability**: Mark `availableInOffense`/`availableInDefense` as needed
4. **Configure Ranking**: Set `higherIsBetter` from offensive perspective
5. **UI Ready**: Metric automatically appears in selectors and rankings

### Legacy Metrics Configuration
All NFL metrics are defined in `lib/metricsConfig.ts` with:
- Display names and field mappings
- Category groupings (scoring, passing, rushing, etc.)
- Ranking direction (higher/lower is better)
- Format types (number, decimal, percentage)

## 🔧 Comprehensive Development Guidelines

### **🚨 CRITICAL Architecture Guardrails (NEVER VIOLATE)**

#### **Preserve Existing Architecture**
- **DO NOT change the current modular architecture** - it's professionally designed and production-tested
- **DO NOT add unnecessary complexity** - keep solutions simple and aligned with existing patterns
- **ALWAYS check previous logic** before implementing new features - understand why things work the way they do
- **MAINTAIN global logic and behavior** - don't fragment or duplicate state management
- **NO interference with existing systems** - new code should integrate seamlessly without disrupting current functionality
- **DOUBLE CHECK everything** - verify changes don't break existing functionality, test thoroughly

#### **Specific Technical Constraints**
- **Hook-based logic**: Keep ALL business logic in custom hooks, components handle UI rendering only
- **Client-side ranking**: ALWAYS use `useRanking` hook, NEVER server-side calculations (violates performance design)
- **Component separation**: Each panel is completely self-contained with clear responsibilities
- **No breaking changes**: Always maintain backward compatibility
- **Position-based CSV mapping**: NEVER change column mapping without updating both offense/defense APIs
- **Global state via props**: No external state libraries - team selection managed at ComparePage level
- **Performance first**: Don't add features that degrade the ~50ms API response times

#### **Global Logic & Behavior Preservation**
- **NEVER duplicate state management** - team selection happens ONLY at ComparePage level
- **RESPECT existing data flow** - components receive data via props, don't fetch independently
- **MAINTAIN hook contracts** - custom hooks have established APIs, don't change their signatures
- **PRESERVE component isolation** - OffensePanel and DefensePanel are self-contained, keep it that way
- **NO side effects** - new code shouldn't cause unexpected behavior in unrelated components
- **CONSISTENT user experience** - changes should feel natural within existing interface patterns

#### **Before Making ANY Changes - Mandatory Checklist**
- [ ] **Read PROJECT_PLAN.md** for current status and context
- [ ] **Understand existing logic** - why does the current implementation work this way?
- [ ] **Check for similar patterns** - is there already a solution for this problem?
- [ ] **Verify no interference** - will this change affect other components?
- [ ] **Test backwards compatibility** - do existing features still work?
- [ ] **Follow existing conventions** - naming, structure, patterns
- [ ] **Performance impact** - does this maintain current speed?
- [ ] **Global behavior check** - does this maintain consistent user experience?
- [ ] **State management review** - does this respect the single source of truth pattern?
- [ ] **Documentation needed** - update relevant files after changes

## 🍎 **iOS Swift Development Guidelines & Workflows**

### **Current Phase**: Phase 0 - Foundations (Repo + Runtime)

For detailed iOS development roadmap, see `Mobile_plan.md`. This section provides Swift/iOS-specific guidelines and patterns.

### **🚀 Phase 0: iOS Foundations Checklist**

When preparing for iOS development, follow this systematic approach:

#### **Repo Hygiene & API Setup**
```bash
# Ensure single package manager
rm -f yarn.lock pnpm-lock.yaml  # Keep only package-lock.json

# Create iOS documentation structure
mkdir -p ios
touch ios/README.md ios/QA.md ios/RELEASE_NOTES.md
touch MOBILE_NOTES.md SECURITY.md

# Add health endpoint (create app/api/health/route.ts)
# Returns: { ok: true, version: "1.0.0" }

# Test HTTPS access (required for iOS ATS)
curl https://your-domain.com/api/health
```

#### **API Documentation for iOS**
```markdown
# MOBILE_NOTES.md
## API Endpoints Used by iOS App

### Base URL
- Production: https://your-domain.com
- Development: http://localhost:3000 (for simulator only)

### Endpoints
- GET /api/health - Health check, returns {ok, version}
- GET /api/nfl-2025/offense - Returns all team offense stats
- GET /api/nfl-2025/defense - Returns all team defense stats

### Response Format
All endpoints return JSON with structure:
{
  rows: [{ team: string, ...stats }],
  lastUpdated: timestamp
}

### Caching Strategy
- Client should cache for 6 hours
- Use ETags/If-None-Match for bandwidth optimization
```

### **🍎 Phase 1: Swift Project Bootstrap Patterns**

#### **Basic SwiftUI Project Structure**
```
ios/
├── PareApp/
│   ├── PareApp.swift           # App entry point
│   ├── Config.xcconfig         # Base URL, no secrets
│   ├── PrivacyInfo.xcprivacy   # Privacy manifest
│   ├── Models/
│   │   ├── Team.swift          # Mirror API response
│   │   ├── Metric.swift
│   │   └── CompareResult.swift
│   ├── Services/
│   │   └── StatsAPI.swift      # Networking layer
│   ├── Views/
│   │   ├── CompareView.swift   # Main screen
│   │   └── MetricRowView.swift # Individual bars
│   └── Assets.xcassets/
│       └── AppIcon.appiconset/
```

#### **Swift API Client Pattern**
```swift
// Services/StatsAPI.swift
import Foundation

class StatsAPI {
    private let baseURL: String
    private let session: URLSession
    
    init(baseURL: String) {
        self.baseURL = baseURL
        
        // Configure URLCache for offline support
        let cache = URLCache(
            memoryCapacity: 50 * 1024 * 1024,  // 50MB memory
            diskCapacity: 100 * 1024 * 1024     // 100MB disk
        )
        
        let config = URLSessionConfiguration.default
        config.urlCache = cache
        config.requestCachePolicy = .returnCacheDataElseLoad
        
        self.session = URLSession(configuration: config)
    }
    
    func fetchOffenseStats() async throws -> [TeamData] {
        let url = URL(string: "\(baseURL)/api/nfl-2025/offense")!
        let (data, _) = try await session.data(from: url)
        let response = try JSONDecoder().decode(StatsResponse.self, from: data)
        return response.rows
    }
    
    func fetchDefenseStats() async throws -> [TeamData] {
        let url = URL(string: "\(baseURL)/api/nfl-2025/defense")!
        let (data, _) = try await session.data(from: url)
        let response = try JSONDecoder().decode(StatsResponse.self, from: data)
        return response.rows
    }
}

struct StatsResponse: Codable {
    let rows: [TeamData]
}
```

#### **Domain Models Pattern**
```swift
// Models/Team.swift
import Foundation

struct TeamData: Codable, Identifiable {
    let id = UUID()
    let team: String
    let games: Int
    let points: Double
    let totalYards: Double
    let passYards: Double
    let rushYards: Double
    // Add all other stats matching API
    
    enum CodingKeys: String, CodingKey {
        case team, games = "g"
        case points, totalYards = "total_yards"
        case passYards = "pass_yds"
        case rushYards = "rush_yds"
    }
}

struct Metric: Identifiable {
    let id = UUID()
    let key: String
    let displayName: String
    let higherIsBetter: Bool
}
```

#### **SwiftUI CompareView Pattern**
```swift
// Views/CompareView.swift
import SwiftUI

struct CompareView: View {
    @State private var teamA: String = "Buffalo Bills"
    @State private var teamB: String = "Kansas City Chiefs"
    @State private var offenseStats: [TeamData] = []
    @State private var isLoading = false
    @State private var error: Error?
    
    private let api = StatsAPI(baseURL: "https://your-domain.com")
    
    var body: some View {
        NavigationStack {
            VStack {
                // Team Selection
                TeamPicker(selection: $teamA, label: "Team A")
                TeamPicker(selection: $teamB, label: "Team B")
                
                // Metrics List
                if isLoading {
                    ProgressView()
                } else if let teamAData = offenseStats.first(where: { $0.team == teamA }),
                          let teamBData = offenseStats.first(where: { $0.team == teamB }) {
                    List {
                        MetricRowView(
                            metric: "Points",
                            teamA: teamAData,
                            teamB: teamBData,
                            valueA: teamAData.points,
                            valueB: teamBData.points
                        )
                        // Add more metrics...
                    }
                }
            }
            .navigationTitle("Compare Teams")
            .task {
                await loadData()
            }
        }
    }
    
    func loadData() async {
        isLoading = true
        do {
            offenseStats = try await api.fetchOffenseStats()
        } catch {
            self.error = error
        }
        isLoading = false
    }
}
```

#### **Inward Bars Component Pattern**
```swift
// Views/MetricRowView.swift
import SwiftUI

struct MetricRowView: View {
    let metric: String
    let teamA: TeamData
    let teamB: TeamData
    let valueA: Double
    let valueB: Double
    
    private var teamAPercentage: Double {
        valueA / (valueA + valueB)
    }
    
    private var teamBPercentage: Double {
        valueB / (valueA + valueB)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(metric)
                .font(.headline)
            
            // Team A Info
            HStack {
                Text(teamA.team)
                Spacer()
                Text(String(format: "%.1f", valueA))
            }
            .font(.caption)
            
            // Inward Bars (theScore-style)
            GeometryReader { geometry in
        HStack(spacing: 2) {
                    // Left bar (Team A - grows from left to right)
            Rectangle()
                .fill(Color.green)
                        .frame(width: geometry.size.width * teamAPercentage)
            
                    // Right bar (Team B - grows from right to left)
            Rectangle()
                .fill(Color.orange)
                        .frame(width: geometry.size.width * teamBPercentage)
                }
            }
            .frame(height: 20)
            .animation(.spring(response: 0.4), value: teamAPercentage)
            
            // Team B Info
            HStack {
                Text(teamB.team)
                Spacer()
                Text(String(format: "%.1f", valueB))
            }
            .font(.caption)
        }
        .padding()
    }
}
```

### **🔧 iOS Development Commands**

```bash
# Next.js API (keep running for iOS simulator)
npm run dev              # Provides API at localhost:3000
npm run build            # Production build
npm run start            # Production server

# iOS Development (Xcode)
# Open ios/PareApp.xcodeproj in Xcode
# Cmd+R to build and run
# Cmd+B to build only
# Product → Archive for TestFlight/App Store

# Testing
# Simulator: Select device, press Cmd+R
# Physical Device: Connect via USB, select device, Cmd+R
```

### **📊 iOS Performance & Monitoring Patterns**

```swift
// Add performance tracking to SwiftUI views
import os.log

extension View {
    func measurePerformance(_ label: String) -> some View {
        self.onAppear {
            let start = CFAbsoluteTimeGetCurrent()
            DispatchQueue.main.async {
                let duration = CFAbsoluteTimeGetCurrent() - start
                os_log("⚡ %{public}@ rendered in %.3f seconds", label, duration)
            }
        }
    }
}

// Usage in CompareView
CompareView()
    .measurePerformance("CompareView")
```

### **Code Standards & Patterns**
- **TypeScript everywhere**: Full type safety, absolutely no `any` types allowed
- **Error boundaries**: All major components wrapped in ErrorBoundary components
- **Performance first**: Always use memoization (`useMemo`, `useCallback`), efficient calculations
- **Console logging**: Use structured logging from `utils/logger.ts` with emoji prefixes and request IDs
- **Component props**: Always define explicit TypeScript interfaces for props
- **Hook dependencies**: Be careful with useEffect dependencies to avoid infinite re-renders

### **Common Development Tasks & Workflows**

#### **Adding New NFL Metrics**
1. Update `lib/metricsConfig.ts` → Add to `AVAILABLE_METRICS` object
2. Verify CSV column position in `lib/pfrCsv.ts` → Update `CSV_COLUMN_MAPPING_BY_POSITION`
3. Test with both offense and defense APIs
4. Update `DEFAULT_OFFENSE_METRICS` or `DEFAULT_DEFENSE_METRICS` if desired

#### **Debugging Performance Issues**
1. Check API response times: `curl http://localhost:3000/api/nfl-2025/offense | jq '.rows | length'`
2. Monitor React DevTools Profiler for component re-renders
3. Look for missing memoization in custom hooks
4. Check console for excessive logging (use `utils/logger.ts` levels)

#### **Debugging State Management**
1. Add console.log statements using logger: `logger.debug({ context: 'COMPONENT-NAME' }, 'message', data)`
2. Trace callback chains: Component → Props → Parent State Updates
3. Verify hook dependencies and useEffect cleanup
4. Check for stale closures in event handlers

#### **Adding New Components**
1. Create in appropriate directory: `components/` for UI, `lib/` for hooks
2. Follow existing patterns: self-contained, TypeScript interfaces, error handling
3. Use existing hooks: `useNflStats`, `useRanking`, `useDisplayMode`, `useTheme`
4. Integrate with global team selection if needed (callbacks from ComparePage)

### **Critical Current Issue - RankingDropdown Debugging**

**Problem**: State management callbacks not working (95% complete feature)
- **Symptom**: Dropdowns render perfectly, clicking teams doesn't change global selection
- **Expected**: Click "Baltimore Ravens" → Global team changes → All panels update
- **Actual**: Visual click works but global state stays unchanged

**Debugging Checklist**:
1. **Trace callback chain**:
   ```
   RankingDropdown.handleTeamSelect → 
   onTeamChange prop → 
   DynamicComparisonRow.onTeamAChange → 
   OffensePanel/DefensePanel callback → 
   ComparePage.handleTeamAChange → 
   setSelectedTeamA
   ```
2. **Add debug logging** at each step with unique identifiers
3. **Check prop threading**: Verify callbacks passed correctly through component tree
4. **Verify state updates**: Ensure `setSelectedTeamA`/`setSelectedTeamB` called with correct values
5. **Test isolation**: Try callback directly from ComparePage to isolate issue

### **Performance Optimization Patterns**

#### **Memoization Examples**
```typescript
// Memoize expensive calculations
const allTeamRankings = useMemo(() => {
  return calculateBulkRanking(allData, metricKey, teamNames, options);
}, [allData, metricKey, teamNames, options]);

// Memoize event handlers
const handleTeamSelect = useCallback((teamName: string) => {
  onTeamChange(teamName);
}, [onTeamChange]);
```

#### **API Performance**
- Always check cache first (6-hour TTL)
- Use structured logging to monitor response times
- Graceful degradation with stale data on errors
- Batch API calls where possible

### **Code Quality Checklist**
- [ ] TypeScript interfaces defined for all props
- [ ] Error boundaries around major components
- [ ] Console logging uses structured logger utility
- [ ] Memoization applied to expensive calculations
- [ ] useEffect dependencies properly specified
- [ ] Component props properly threaded through tree
- [ ] No direct DOM manipulation (use React patterns)
- [ ] Follow existing naming conventions

## 📊 Data Management

- **Source**: Manual CSV exports from Pro Football Reference (ensures data accuracy)
- **Caching**: 6-hour in-memory cache for API performance
- **Processing**: Position-based column mapping handles duplicate field names
- **Calculations**: Per-game stats calculated client-side, rankings computed dynamically

## 🚀 Production Setup & Deployment

### **Technology Stack**
- **Framework**: Next.js 15 + App Router + TypeScript
- **Styling**: Tailwind CSS v3 with custom themes
- **Data Processing**: CSV parsing with position-based mapping
- **Deployment**: Self-hosted on M1 Mac with PM2 for 24/7 uptime
- **Performance**: ~50ms cached API responses, ~200ms fresh, supports 100+ concurrent users

### **Production Commands**
```bash
# Build and deploy
npm run build
pm2 start npm --name "pare-nfl" -- start

# Monitoring
pm2 status               # Check all processes
pm2 logs pare-nfl        # View logs
pm2 restart pare-nfl     # Restart after data updates
pm2 delete pare-nfl      # Remove process

# Health checks
curl http://localhost:3000/api/nfl-2025/offense | jq '.rows | length'  # Should return 32
curl http://localhost:3000/api/nfl-2025/defense | jq '.rows | length'  # Should return 32
```

### **Data Update Workflow**
1. **Weekly**: Update CSV files from Pro Football Reference
2. **Verify**: Check that both offense and defense APIs return 32 teams
3. **Optional**: Restart PM2 (cache invalidates automatically after 6 hours)
4. **Monitor**: Check logs for any parsing errors

## 🧪 Testing & Debugging Strategies

### **API Testing**
```bash
# Test API responses
curl -w "@curl-format.txt" http://localhost:3000/api/nfl-2025/offense
curl -w "@curl-format.txt" http://localhost:3000/api/nfl-2025/defense

# Check specific team data
curl http://localhost:3000/api/nfl-2025/offense | jq '.rows[] | select(.team == "Baltimore Ravens")'

# Verify per-game calculations
curl http://localhost:3000/api/nfl-2025/offense | jq '.rows[0] | {team, points, games: .g}'
```

### **Component Testing Patterns**
```typescript
// Test ranking calculations
console.log('🧪 Testing rankings:', {
  metric: metricKey,
  team: teamName,
  ranking: useRanking(allData, metricKey, teamName, { higherIsBetter: true })
});

// Test bar calculations
console.log('🧪 Testing bars:', {
  teamA: teamAValue,
  teamB: teamBValue,
  percentages: `${teamAPercentage.toFixed(1)}% vs ${teamBPercentage.toFixed(1)}%`
});
```

### **Common Debugging Scenarios**

#### **Issue: API returns no data**
- Check CSV files exist in `data/pfr/` directory
- Verify CSV format matches expected column positions
- Check server logs for parsing errors
- Test with curl commands above

#### **Issue: Rankings incorrect**
- Verify `higherIsBetter` logic in metrics config
- Check defense context inversion (defense metrics flip ranking direction)
- Test `calculateBulkRanking` function directly
- Ensure client-side calculation (not using stale server-side ranks)

#### **Issue: Bars not displaying correctly**
- Check for null/undefined values in team data
- Verify `useBarCalculation` hook dependencies
- Test proportional math: teamA + teamB + gap should equal 100%
- Look for rank amplification issues (elite vs poor bonus)

#### **Issue: State not updating**
- Trace callback chains with console.log statements
- Check for stale closures in event handlers
- Verify useEffect dependencies
- Ensure props threaded correctly through component tree

### **Performance Monitoring**
```javascript
// Add to component for performance tracking
const startTime = performance.now();
// ... expensive operation
console.log(`⚡ Operation took ${performance.now() - startTime}ms`);

// Monitor re-renders
useEffect(() => {
  console.log(`🔄 Component re-rendered: ${componentName}`);
});
```

## 📋 Quick Reference

### **Key File Locations**
- **Main comparison logic**: `app/compare/page.tsx`
- **Data fetching**: `lib/useNflStats.ts`
- **Ranking calculations**: `lib/useRanking.ts`
- **Metrics definitions**: `lib/metricsConfig.ts`
- **CSV parsing**: `lib/pfrCsv.ts`
- **API routes**: `app/api/nfl-2025/*/route.ts`
- **Current issue**: `components/RankingDropdown.tsx` (state management)

### **Common Hook Usage**
```typescript
// Get NFL data
const { offenseData, defenseData, isLoading } = useNflStats();

// Calculate rankings
const ranking = useRanking(allData, metricKey, teamName, { higherIsBetter: true });

// Apply per-game calculations
const { mode, setMode, transformTeamData } = useDisplayMode('per-game');

// Get themed styling
const { getTeamAColor, getTeamBColor } = useTheme();
```

### **Emergency Debugging**
If the app breaks:
1. Check console for error messages
2. Verify API endpoints return data: `curl http://localhost:3000/api/nfl-2025/offense`
3. Check CSV files are properly formatted
4. Restart PM2: `pm2 restart pare-nfl`
5. Check PROJECT_PLAN.md for current status and known issues

### **Service Worker Debugging**
If CSS/Tailwind changes don't apply on refresh:

```bash
# Quick fix: Clean cache and restart dev server
npm run dev:clean

# Manual fix: Unregister SW in browser
# Chrome DevTools → Application → Service Workers → Unregister
# Then: Application → Storage → Clear site data
```

**Common SW Issues:**
- **Stale CSS**: SW caches old CSS even after changes → Use `dev:clean` or hard reload
- **SW persists after disabled**: Once registered, SW stays active until manually unregistered
- **Check if SW is active**: DevTools → Application → Service Workers (should show none in dev)

**Dev Mode Best Practice:**
- Leave `NEXT_PUBLIC_ENABLE_SW` unset (defaults to disabled)
- Only enable SW for production testing or PWA features
- Use `npm run dev:clean` if encountering cache issues

**This is a production-ready application with professional architecture, comprehensive error handling, and sophisticated data visualization capabilities. Always consult PROJECT_PLAN.md for current status and development context.**

---

## 📝 **Live Development Changelog**

### **Version 1.0.0 - Foundation Release (September 2025)**
**Status**: ✅ **PRODUCTION READY**

#### **Patch 1.0.1 - Documentation & Architecture Audit (2025-09-25)**
**Session Summary**: Complete project audit and documentation overhaul

**🔍 What Was Accomplished:**
- **Project Analysis**: Thoroughly examined entire codebase and architecture
- **PROJECT_PLAN.md Cleanup**: Removed 700+ lines of redundancy, consolidated to single source of truth
- **CLAUDE.md Enhancement**: Transformed from vague guide to comprehensive 500+ line developer reference
- **Architecture Documentation**: Added detailed file structure, component responsibilities, and data flow
- **Development Workflows**: Created step-by-step guides for common tasks and debugging
- **Guardrails Added**: Critical architectural constraints and change management checklist
- **Strategic Direction**: Added iOS App Store conversion as primary long-term goal with Swift learning path

**🐛 Issues Identified:**
- **RankingDropdown State Management**: 95% complete, callbacks not propagating through component tree

**🎯 Next Session Priority:**
- ✅ **COMPLETED**: RankingDropdown state management issue resolved
- ✅ **COMPLETED**: Web app interface optimization complete
- **NEW PRIORITY**: Phase 1 Mobile Web Optimization (based on Mobile_plan.md)

**📊 Current Status:**
- **Architecture**: Professional-grade, simplified to pure global state
- **Performance**: ~50ms API responses, production optimized
- **Documentation**: Comprehensive guides including mobile development roadmap
- **Technical Debt**: Minimal, ready for mobile optimization phase

#### **Patch 1.0.4 - Mobile & iOS Development Roadmap (2025-09-26)**
**Session Summary**: Integrated comprehensive mobile development strategy

**🔍 What Was Accomplished:**
- **Mobile_plan.md Integration**: Added 4-phase mobile development roadmap to both documentation files
- **Strategic Planning**: Established Q1 2025 App Store launch target with clear phase breakdown
- **Technical Guidelines**: Added comprehensive mobile optimization workflows and code patterns
- **iOS Transition Planning**: Detailed both WKWebView wrapper and native SwiftUI development paths
- **Development Readiness**: Project now has complete roadmap from mobile web to App Store

**🚀 Mobile Development Phases Added:**
- **Phase 1**: Mobile Web Excellence (2-3 weeks) - Layout, UX, performance, accessibility
- **Phase 2**: PWA-Ready (2-3 days) - "Add to Home Screen" functionality
- **Phase 3A**: iOS App WKWebView (1-2 weeks) - Fast market entry with web wrapper
- **Phase 3B**: Native SwiftUI (2-3 months) - Ultimate native iOS experience
- **Phase 4**: CI/CD & Release (1 week) - Professional deployment pipeline

**📱 Next Session Priority:**
- Begin Phase 3A: iOS App (WKWebView) - Swift learning and native wrapper development

**📊 Current Status:**
- **Web App**: ✅ Complete and production ready
- **PWA**: ✅ Full offline functionality, cross-platform installation ready
- **Mobile Optimization**: ✅ Phase 1 & 2 complete - excellent mobile experience
- **Next Phase**: 🍎 Phase 3A iOS App development (WKWebView wrapper)
- **Target**: 🍎 Q1 2025 App Store launch

#### **Patch 1.0.5 - Phase 1: Mobile Web Excellence Complete (2025-09-26)**
**Session Summary**: Achieved mobile web excellence with comprehensive optimizations

**🔍 What Was Accomplished:**
- ✅ **Foundation & Viewport**: iOS safe-area support, dynamic viewport units, responsive design
- ✅ **Touch & Interaction**: 44×44pt touch targets, eliminated tap delays, prevented iOS zoom
- ✅ **Performance & Images**: Optimized next/image, code splitting, mobile performance monitoring
- ✅ **Accessibility & Polish**: ARIA labels, screen reader support, keyboard navigation, reduced motion

**🎯 Next Session Priority:**
- Phase 2: PWA-Ready implementation

**📊 Current Status:**
- **Mobile Web**: ✅ iOS-ready excellence achieved
- **Performance**: ✅ Lighthouse mobile optimized
- **Next Phase**: 📱 Ready for PWA implementation

#### **Patch 1.0.6 - Phase 2: PWA-Ready Complete (2025-09-26)**
**Session Summary**: Full PWA implementation with offline capabilities and cross-platform installation

**🔍 What Was Accomplished:**
- ✅ **PWA Manifest & Icons**: Custom PNG icons, app shortcuts, "Add to Home Screen" functionality  
- ✅ **Service Worker**: Smart caching (30min fresh, 6hr stale), offline NFL stats, team logo caching
- ✅ **Offline Excellence**: Auto-detection, user feedback banner, background sync capabilities
- ✅ **Installation Prompts**: Cross-platform install detection, iOS instructions, Android one-click
- ✅ **Standalone Mode**: App-like experience, deep links, navigation handling, touch optimizations

**🎯 Next Session Priority:**
- 🍎 Phase 0: iOS Foundations - Repo hygiene, API readiness, HTTPS setup, health endpoint

**📊 Current Status:**
- **PWA**: ✅ Fully functional, installable on all platforms
- **Offline**: ✅ Smart caching with user feedback
- **Next Phase**: 🍎 iOS App development starting

#### **Patch 1.0.7 - iOS Development Roadmap Update (2025-09-29)**
**Session Summary**: Updated documentation for iOS Swift development phase

**🔍 What Was Accomplished:**
- ✅ **Mobile_plan.md Updated**: Replaced with comprehensive 6-phase iOS native development roadmap
- ✅ **CLAUDE.md iOS Focus**: Updated from web-mobile patterns to Swift/iOS development guidelines
- ✅ **Phase Structure**: Now following Phase 0-6 roadmap (Foundations → Bootstrap → UX → Integrations → Polish → Distribution → Enhancements)
- ✅ **Swift Code Patterns**: Added SwiftUI examples, API client patterns, domain models, inward bars implementation
- ✅ **Gate Questions**: Documented decision points for each iOS development phase
- ✅ **Definition of Done**: Clear v1.0 success criteria for App Store submission

**🎯 Next Session Priority:**
- 🍎 **Begin Phase 0**: Repo hygiene, add MOBILE_NOTES.md, ios/README.md, SECURITY.md
- 🍎 **API Setup**: Add /health endpoint, verify HTTPS access
- 🍎 **Decision Needed**: SemVer vs CalVer, Cloudflare HTTPS setup

**📊 Current Status:**
- **Web App**: ✅ Production ready with full feature set
- **PWA**: ✅ Fully functional, installable on all platforms  
- **Documentation**: ✅ Updated for iOS native development
- **Current Phase**: 🍎 **Phase 0 - iOS Foundations** (Ready to start Swift development)
- **Roadmap**: Complete 6-phase plan to App Store (Q1 2025 target)

#### **Patch 1.0.8 - Defense Metrics Expansion & Configuration Documentation (2025-09-30)**
**Session Summary**: Major expansion of defense metrics availability and comprehensive metrics system documentation

**🔍 What Was Accomplished:**
- ✅ **Defense Metrics Unlocked**: Enabled 18+ previously blocked metrics for defense display (turnovers forced, interceptions made, passing/rushing stats allowed, efficiency metrics)
- ✅ **Context-Dependent Logic**: Implemented smart metric interpretation (same data, different perspective - "turnovers committed" vs "turnovers forced")
- ✅ **Enhanced Default Metrics**: Updated `DEFAULT_DEFENSE_METRICS` to include key defensive stats (turnovers forced, interceptions made, turnover %)
- ✅ **Configuration Documentation**: Added comprehensive "Complete Metrics Configuration System" section to CLAUDE.md with full metric inventory, context logic, and usage examples
- ✅ **Availability Expansion**: Defense metrics selector now shows ~26 metrics instead of ~8, matching the richness of offense display

**🔧 Technical Changes:**
- **lib/metricsConfig.ts**: All blocked metrics now have `availableInDefense: true` with context-dependent descriptions
- **Ranking Logic**: Preserved existing `higherIsBetter` flags with context-aware UI interpretation  
- **Documentation**: Added 120+ lines detailing metrics architecture, inventory, context handling, and usage patterns

**🎯 Next Session Priority:**
- 🍎 **Phase 0 Continuation**: Repo hygiene, add MOBILE_NOTES.md, ios/README.md, SECURITY.md
- 🔍 **User Testing**: Verify defense metrics display correctly with new expanded options

**📊 Current Status:**
- **Metrics System**: ✅ Comprehensive 44+ metrics available for both offense and defense with context-aware display
- **Defense Analysis**: ✅ Significantly enhanced with full stat availability (turnovers forced, interceptions, efficiency metrics)
- **Documentation**: ✅ Complete metrics system documented with examples and usage patterns
- **Next Phase**: 🍎 **Phase 0 - iOS Foundations** (Ready to continue Swift development prep)

---

### **Session Template (Copy for Future Updates)**

#### **Patch 1.0.X - [Session Title] (YYYY-MM-DD)**
**Session Summary**: [Brief description of what was worked on]

**🔍 What Was Accomplished:**
- [ ] [Specific task completed]
- [ ] [Another completed task]
- [ ] [Documentation updates]

**🐛 Issues Found/Fixed:**
- **[Issue Name]**: [Description and resolution]

**🎯 Next Session Priority:**
- [What should be tackled next]

**📊 Current Status:**
- **Architecture**: [Any changes or confirmations]
- **Performance**: [Any impacts or improvements]
- **Outstanding Issues**: [What still needs work]

---

### **Changelog Guidelines**

**When to Create New Patch Version:**
- Each development session gets a new patch number (1.0.X)
- Document all changes, discoveries, and decisions
- Update both CLAUDE.md and PROJECT_PLAN.md accordingly

**What to Include:**
- **Accomplishments**: What was built, fixed, or improved
- **Issues**: Problems found and their status (fixed/ongoing)
- **Architecture Impact**: Any structural changes or confirmations
- **Performance Notes**: Speed impacts or optimizations
- **Next Steps**: Clear priority for following session

**Version Numbering:**
- **Major (X.0.0)**: Significant architecture changes or new major features
- **Minor (1.X.0)**: New features or substantial improvements
- **Patch (1.0.X)**: Bug fixes, documentation updates, minor enhancements