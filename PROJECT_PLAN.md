> **Branch Note:** Current branch `docs-refactor` is used for documentation reorganization (hierarchy alignment, no code changes). The prior structure is preserved in `docs-snapshot`.

# 🏈 Pare: NFL Team Comparison Platform

## 📋 **Project Overview**

**Pare** is a professional NFL team comparison platform providing real-time statistical analysis with advanced per-game calculations. Built with Next.js 14/15 and optimized for self-hosting on M1 Mac with PM2.

**🎯 PRIMARY STRATEGIC GOAL**: While currently a web application, the **biggest objective is to convert this to a native iOS app for the App Store**. The web app serves as the foundation and proof-of-concept, with the ultimate goal being to learn Swift and create a native mobile experience that leverages the existing API infrastructure and sophisticated data processing logic.

### **Core Features**
- **Interactive Comparison**: Visual side-by-side team analysis with dynamic bars
- **Per-Game Intelligence**: Smart calculations showing meaningful per-game vs total stats  
- **Unlimited Customization**: Choose any metrics from Pro Football Reference's dataset (44+ metrics with enhanced defense options)
- **Real-Time Data**: Current 2025 NFL season stats with comprehensive metrics
- **Context-Aware Display**: Smart metric interpretation for offense vs defense perspectives
- **Self-Hosted Control**: Complete data ownership and customization freedom
- **Mobile-Ready Architecture**: Designed to support future native iOS app development

## 🧭 **How The Project Works (Simple Explanation)**

### **Data Flow Architecture**
```
Pro Football Reference CSV Files → Local Storage → API Routes → JSON Response → React Hooks → UI Components → Visual Comparison
```

**Step-by-Step:**
1. **Data Source**: Manual CSV exports from Pro Football Reference (offense-2025.csv, defense-2025.csv)
2. **API Processing**: Two Next.js API routes (`/api/nfl-2025/offense`, `/api/nfl-2025/defense`) parse CSV using position-based column mapping
3. **React Hooks**: `useNflStats` fetches data, `useRanking` calculates team rankings, `useDisplayMode` handles per-game/total toggle
4. **Components**: `ComparePage` orchestrates everything, `OffensePanel`/`DefensePanel` display comparisons, `DynamicComparisonRow` renders individual metrics
5. **Visualization**: `useBarCalculation` creates proportional bars, `useTheme` handles colors/styling

### **Key Components & Hooks**
- **`ComparePage`**: Main orchestrator, manages global team selection state
- **`OffensePanel`/`DefensePanel`**: Self-contained sections with team logos, metrics, and comparisons  
- **`DynamicComparisonRow`**: Individual metric comparison with interactive ranking dropdowns
- **`useNflStats`**: Fetches and caches NFL data from API endpoints
- **`useRanking`**: Client-side ranking calculations (1st, 2nd, 3rd, etc.) with tie handling
- **`useDisplayMode`**: Toggles between per-game and total stats with smart field detection
- **`useTheme`**: Dynamic color schemes and styling system

### **File Structure Logic**
```
app/
├── page.tsx                    # Landing page with API documentation
├── compare/page.tsx            # Main comparison interface
└── api/nfl-2025/              # API routes for offense/defense data

components/                     # Reusable UI components
├── OffensePanel.tsx           # Self-contained offense comparison
├── DefensePanel.tsx           # Self-contained defense comparison  
├── DynamicComparisonRow.tsx   # Individual metric visualization
└── RankingDropdown.tsx        # Interactive team selection by rank

lib/                           # Business logic and utilities
├── useNflStats.ts            # Data fetching and caching
├── useRanking.ts             # Client-side ranking calculations
├── useDisplayMode.ts         # Per-game vs total logic
├── metricsConfig.ts          # 44+ NFL metrics registry with enhanced defense options
└── pfrCsv.ts                 # CSV parsing engine

data/pfr/                     # Local data storage
├── offense-2025.csv          # Current season offense stats
└── defense-2025.csv          # Current season defense stats
```

## 📚 **Documentation Hierarchy (as of current branch)**

All project documentation follows a standardized hierarchy under `/docs/`:

### **`/docs/specs/`** — Technical Blueprints & Specifications
- **`layout-map.md`** - Complete desktop + mobile component architecture with file/line references
- **`data-flow.md`** - 3-tier caching strategy, API design, and live update integration slots
- **`ui-compact-spec.md`** - Product direction, compact structure, and future feature slots
- **`port-to-react-native.md`** - Complete React Native migration strategy with component mappings

### **`/docs/audit/`** — Engineering Audits, QA, and Risk Logs
- **`EXECUTIVE_SUMMARY.md`** - Top 10 findings, critical path, and recommended actions
- **`risks-and-questions.md`** - 11 identified risks with severity ratings + 12 open questions

### **`/docs/data/`** — Data Pipelines, Scraping, and Adapter References
- _(Future): Scraping automation plans, data validation, API adapters)_

### **`/DevNotes/`** — Day-by-Day Notes and Changelogs
- **`CHANGELOG.md`** - Version history and release notes
- **`YYYY-MM-DD-*.md`** - Daily development notes and decision logs

### **`/docs/archive/`** — Historical References
- **`audits/`** - Older audit documents (pre-2025-10-19 reorganization)
- **`mobile/`** - Early iOS planning documents (superseded by specs)
- **`adr/`** - Architecture Decision Records (legacy)

> **Note**: All active specs include front-matter linking to `PROJECT_PLAN.md` (source of truth) and `CLAUDE.md` (rules reference).

## 📋 **Development Rules & Constraints**

### **Architecture Principles**
- **Keep logic simple and global**: Avoid unnecessary abstraction layers
- **Preserve existing structure**: Do not change the current architecture or add complexity
- **Component separation**: Each panel is self-contained with clear responsibilities
- **Hook-based logic**: Business logic lives in custom hooks, components focus on UI
- **No breaking changes**: Always maintain backward compatibility

### **Code Guidelines**
- **TypeScript everywhere**: Full type safety, no `any` types
- **Client-side ranking**: Use `useRanking` hook, avoid server-side calculations
- **Position-based CSV mapping**: Never change the CSV column mapping without updating both offense/defense APIs
- **Error boundaries**: All major components wrapped in error handling
- **Performance first**: Memoization, caching, efficient calculations

### **Data Management Rules**
- **CSV as source of truth**: Manual exports from Pro Football Reference
- **6-hour caching**: API responses cached for performance
- **Per-game calculations**: Applied at UI level, not API level
- **Ranking consistency**: Rankings calculated client-side for accuracy

### **PROJECT_PLAN.md Maintenance Rules**
- **Living Document**: Always update PROJECT_PLAN.md after every session with changes, progress, and discoveries
- **Single Source of Truth**: This file contains all current project status, rules, and future plans
- **Session Updates**: Add to changelog what was accomplished, what issues were found, what's next
- **Future Planning**: Keep detailed future plans and work-in-progress sections updated
- **Clean but Complete**: Remove redundancy but preserve important technical details and context
- **Carry Forward Context**: When opening new sessions, read and update this file to maintain continuity
- **Consistency with CLAUDE.md**: Both files should reflect the same version and session information

### **🚨 CRITICAL Architecture Guardrails (NEVER VIOLATE)**

#### **Preserve Existing Architecture**
- **DO NOT change the current modular architecture** - it's professionally designed and production-tested
- **DO NOT add unnecessary complexity** - keep solutions simple and aligned with existing patterns
- **ALWAYS check previous logic** before implementing new features - understand why things work the way they do
- **MAINTAIN global logic and behavior** - don't fragment or duplicate state management
- **NO interference with existing systems** - new code should integrate seamlessly without disrupting current functionality
- **DOUBLE CHECK everything** - verify changes don't break existing functionality, test thoroughly

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
- [ ] **Documentation needed** - update both PROJECT_PLAN.md and CLAUDE.md after changes

## 🛠️ **Technical Architecture**

### **Technology Stack**
- **Framework**: Next.js 14/15 + App Router + TypeScript
- **Styling**: Tailwind CSS v3 with premium effects
- **Data**: CSV parsing with position-based column mapping
- **Hosting**: M1 Mac + PM2 (24/7 uptime)
- **Caching**: 6-hour in-memory cache

### **theScore Bar Visualization System**
```typescript
// Perfect proportional calculation
const teamAPercentage = (teamAValue / (teamAValue + teamBValue)) * 100;
const teamBPercentage = (teamBValue / (teamAValue + teamBValue)) * 100;

// Visual result: Bars always meet in center, showing exact performance ratio
```

**Visual Excellence:**
- **Inward Growth**: Left bar extends right, right bar extends left
- **Perfect Connection**: Mathematical precision ensures bars meet in center
- **Instant Understanding**: Longer bar = better performance
- **Professional Polish**: Smooth animations and broadcast-quality styling

### **CSV Processing Innovation**

**Position-Based Column Mapping:**
```typescript
// Problem: CSV has duplicate "Yds" columns
// Solution: Map by exact position instead of header name

const CSV_COLUMN_MAPPING_BY_POSITION = {
  3: 'points',           // PF = Points For
  4: 'total_yards',      // Yds = TOTAL YARDS (position 4)
  12: 'pass_yds',        // Yds = PASSING YARDS (position 12) 
  18: 'rush_yds',        // Yds = RUSHING YARDS (position 18)
  21: 'rush_fd',         // 1stD = Rushing First Downs
  27: 'exp_pts_tot'      // EXP = Expected Points
};
```

### **Smart Per-Game Calculation Engine**
```typescript
// Per-game calculation logic
const calculatePerGameStats = (teamData, mode) => {
  if (mode === 'total' || !teamData?.g) return teamData;
  
  const games = parseFloat(teamData.g) || 1;
  
  // Convert totals to per-game (exclude percentages/rates)
  Object.keys(teamData).forEach(key => {
    if (!key.includes('pct') && !key.includes('per') && isNumeric(teamData[key])) {
      teamData[key] = (parseFloat(teamData[key]) / games).toFixed(1);
    }
  });
  
  return teamData;
};
```

### **Rank-Based Dramatic Amplification System**

**Dynamic Bar Amplification Based on NFL Rankings:**
```javascript
// Calculate rank gap between teams
const rankGap = Math.abs(teamARank - teamBRank);

// Determine amplification factor based on gap size
let amplificationFactor = 1.2; // Base factor for close matches

if (rankGap >= 20) {
  amplificationFactor = 2.5; // EXTREME difference
} else if (rankGap >= 15) {
  amplificationFactor = 2.2; // HUGE difference  
} else if (rankGap >= 10) {
  amplificationFactor = 1.8; // BIG difference
} else if (rankGap >= 5) {
  amplificationFactor = 1.5; // MODERATE difference
} else {
  amplificationFactor = 1.2; // SUBTLE difference
}

// Elite vs Poor Bonus: Top 5 vs Bottom 10 teams
const eliteVsPoorBonus = (teamAIsElite && teamBIsPoor) || 
                        (teamBIsElite && teamAIsPoor) ? 0.5 : 0;
amplificationFactor += eliteVsPoorBonus;

// Apply exponential scaling
const amplifiedRatioA = Math.pow(baseRatioA, amplificationFactor);
const amplifiedRatioB = Math.pow(baseRatioB, amplificationFactor);
```

**Amplification Philosophy:**
- **League Position Matters More Than Raw Values**: A 1st-ranked defense gets a huge bar, 31st-ranked gets tiny bar
- **Psychologically Accurate**: Reflects how fans perceive team strength differences
- **Visually Dramatic**: Makes elite teams look truly elite, creates instant understanding
- **Maximum 3.0x Amplification**: For elite vs poor matchups (Top 5 vs Bottom 10 + rank gap 20+)

## 🚀 **Production Deployment**

### **PM2 Setup**
```bash
# Build and start
npm run build
pm2 start npm --name "pare-nfl" -- start

# Monitor and manage
pm2 status
pm2 logs pare-nfl
pm2 restart pare-nfl
```

### **Data Update Process**
```bash
# Weekly refresh (recommended)
1. Visit: https://www.pro-football-reference.com/years/2025/#team_stats
2. Export CSV → save as data/pfr/offense-2025.csv
3. Visit: https://www.pro-football-reference.com/years/2025/opp.htm#team_stats
4. Export CSV → save as data/pfr/defense-2025.csv
5. Optional: pm2 restart pare-nfl
```

### **Performance Metrics**
- **API Response**: ~50ms (cached), ~200ms (fresh)
- **Memory Usage**: ~200MB total footprint
- **Concurrent Users**: 100+ supported with caching
- **Uptime**: 99.9%+ with PM2 auto-restart

## 📝 **Development History & Changelog**

### **2025-09-25 - Project Audit & Documentation Update**

**🔍 Current Status: ✅ PRODUCTION READY**
- Professional hook-based architecture with clear separation of concerns
- Recently refactored from 437-line monolith to modular components
- Full TypeScript implementation with comprehensive error handling
- Efficient CSV processing with position-based column mapping
- Sophisticated visualization system with mathematical precision

**🎯 CLAUDE.md Enhancement (Latest Session)**
- **MASSIVELY IMPROVED**: Transformed vague CLAUDE.md into comprehensive 500+ line developer guide
- **Detailed Architecture**: Complete file structure with responsibilities for every component and hook
- **Development Workflows**: Step-by-step guides for common tasks (adding metrics, debugging, performance)
- **Debugging Strategies**: Specific troubleshooting scenarios with solutions and command examples
- **Code Patterns**: TypeScript interfaces, memoization examples, performance monitoring
- **Quick Reference**: Key file locations, hook usage examples, emergency debugging steps
- **Production Ready**: Comprehensive deployment, testing, and monitoring guidance
- **🚨 CRITICAL GUARDRAILS**: Added architectural constraints and change management checklist
- **📝 LIVE CHANGELOG**: Implemented patch versioning system (v1.0.1) with session templates
- **🔒 PRESERVATION RULES**: Specific guidelines to maintain existing architecture and global behavior

**📚 Documentation Updates:**
- Added "How The Project Works" section with simple data flow explanation
- Added "Development Rules & Constraints" for future development guidelines  
- **MAJOR CLEANUP**: Removed 700+ lines of redundant, duplicate, and outdated content
- Merged similar technical explanations into single authoritative sections
- Eliminated conflicting status information and duplicate phase descriptions
- **LIVING DOCUMENT RULES**: Added PROJECT_PLAN.md maintenance guidelines for future sessions
- **PRESERVED IMPORTANT DETAILS**: Re-added rank-based amplification system technical details
- **CURRENT WORK STATUS**: Added detailed RankingDropdown progress and debugging status
- **COMPREHENSIVE FUTURE PLANNING**: Expanded future goals with detailed short/medium/long-term plans
- **ENHANCED CLAUDE.md**: Massively improved CLAUDE.md from vague to comprehensive developer guide
- **ARCHITECTURAL GUARDRAILS**: Added critical constraints and preservation rules to both files
- **LIVE CHANGELOG SYSTEM**: Implemented patch versioning (v1.0.1) with session templates in both files
- **CONSISTENCY MAINTAINED**: Both PROJECT_PLAN.md and CLAUDE.md now have parallel documentation systems
- **STRATEGIC DIRECTION**: Added iOS App Store conversion as primary long-term goal with Swift learning roadmap
- Cleaned up PROJECT_PLAN.md to serve as single source of truth with complete context

**✅ Previously Outstanding Issue (NOW RESOLVED):**
- **RankingDropdown State Management**: FIXED - Simplified to pure global state architecture, no more revert issues

## ✅ **Recently Completed Work**

### **Interactive Ranking Dropdown System**
**Status:** 🎉 **100% COMPLETE - FULLY FUNCTIONAL**

**Vision:** Transform static rank displays into interactive dropdowns that allow users to select any team by their ranking position for each metric.

**Current State:**
```
Minnesota Vikings (1st)  ← Static text
```

**Target State:**
```
1st ▼  ← Clickable dropdown
├── 🥇 1st    Buffalo Bills        (28.2)
├── 🥈 2nd    Baltimore Ravens     (27.8)  
├── 🥉 3rd    Detroit Lions        (26.9)
├──    4th    Miami Dolphins       (25.1)
├── 🔸 T-5th  Pittsburgh Steelers  (24.8)  ← Tie indicator
├── 🔸 T-5th  Green Bay Packers    (24.8)  ← Same value = tie
└──    7th    Kansas City Chiefs   (24.1)
```

**✅ COMPLETED DELIVERABLES:**
- ✅ **`components/RankingDropdown.tsx`** - Fully functional component created
- ✅ **Visual Design** - Smooth animations, team theming (green/orange), emoji indicators
- ✅ **Data Integration** - Perfect integration with `calculateBulkRanking` logic
- ✅ **Ranking Display** - Compact badges (`1st ▼`), dropdown expansion, tie handling (`T-5th`, 🔸)
- ✅ **Component Integration** - Full prop threading through DynamicComparisonRow → Panels → ComparePage
- ✅ **UI Polish** - Professional animations, proper positioning, responsive design

**✅ ISSUE RESOLVED:**
- **Problem WAS:** Ranking dropdowns caused "nano second revert" due to state conflicts
- **Root Cause:** TeamSelectionPanel internal state overriding global state changes
- **Solution Applied:** Simplified to pure global state architecture - removed useTeamSelection hook
- **Result:** Click "Baltimore Ravens" → Team A changes globally → All panels update seamlessly ✅

**🎉 COMPLETED DELIVERABLES:**
1. ✅ **Traced Callback Chain** - Identified TeamSelectionPanel as the override source
2. ✅ **Fixed State Management** - Simplified to controlled components using global state only
3. ✅ **Verified Integration** - All components now respond to team changes immediately
4. ✅ **Architectural Improvement** - Removed 50+ lines of complex sync logic for simple approach

**✅ SOLUTION IMPLEMENTED:**
Users can now select teams via **ANY** ranking dropdown and achieve the same result as using the top team selector dropdowns. This creates a powerful "**select team by rank position**" navigation system. ✅

**🎮 USER EXPERIENCE ACHIEVED:**
```
User clicks "🥇 1st Buffalo Bills" in any metric dropdown
↓
Team A/B instantly changes to Buffalo Bills globally ✅
↓
All offense + defense metrics update immediately ✅
↓
All ranking badges update to show Bills' rankings ✅
↓
All comparison bars recalculate for new matchup ✅
↓
Seamless, professional team selection experience ✨ COMPLETE!
```

**🏆 ACHIEVED BENEFITS:**
- **🎯 Interactive Navigation**: Jump to any team by rank position in any metric
- **🏆 Tie Visualization**: Clear display of tied teams with special indicators
- **📊 Metric-Specific Rankings**: Each dropdown shows teams ranked for that exact metric
- **⚡ Instant Updates**: All bars and rankings recalculate immediately
- **🎨 Professional Polish**: Smooth animations matching broadcast quality
- **🚀 Competitive Advantage**: Unique interactive ranking system not found elsewhere
- **👥 User Engagement**: More interactive and engaging interface
- **📊 Data Exploration**: Easier exploration of team performance data

### **Major Architecture Achievements (September 2025)**

**🚀 Senior Developer Architecture Transformation:**
- ❌ **437-line God Component** → ✅ **Modular Architecture**
- ❌ **Hardcoded UI Colors** → ✅ **Dynamic Theme System**  
- ❌ **Duplicate Logic** → ✅ **Professional Reusable Hooks**
- ❌ **Server-side Rankings** → ✅ **Client-side Calculations**

**Key Refactoring Results:**
- Professional hooks system (`useTeamSelection`, `useTheme`, `useDisplayMode`)
- Self-contained panels with clear responsibilities
- Centralized constants and eliminated magic numbers
- Professional logging system with structured output
- Performance optimizations and bundle cleanup

## 🎯 **Future Goals & Next Steps**

### **Immediate Priority (Next Session)**
1. **✅ Current Web App Complete**: All major features working (RankingDropdown, TeamDropdowns, FloatingMetrics)
   - **Status**: Production ready with clean, modern interface
   - **Ready for**: Mobile optimization and iOS development planning

### **🚀 NEXT MAJOR PHASE: Mobile & iOS Development**

**Current Working Plan**: See comprehensive roadmap in **`Mobile_plan.md`** for detailed phase breakdown, timelines, and deliverables.

**📱 Overview**: Multi-phase transformation converting Pare from web app to native iOS App Store release:
- **Phase 1**: Mobile Web Excellence ✅ (Complete)
- **Phase 2**: PWA Implementation ✅ (Complete) 
- **Phase 3**: iOS App Development (Current focus)
- **Phase 4**: App Store Deployment & CI/CD

**Current Status**: Phase 2 Complete | **Next**: iOS native development
**Target**: 🍎 App Store Launch Q1 2025

### **🎯 Strategic Development Priorities**

**Current Status**: ✅ **Phase 2 Complete** - Full PWA with offline capabilities and cross-platform installation
**Next Sprint**: 🍎 **Phase 3A: iOS App (WKWebView)** - Fast market entry with web wrapper
**Target**: 🍎 **App Store Launch in Q1 2025**

### **📚 Learning Path for iOS Development**
1. **Swift Fundamentals**: Complete Swift language essentials
2. **SwiftUI Basics**: Learn declarative UI patterns and state management
3. **iOS Frameworks**: URLSession, SwiftData, Swift Charts integration
4. **App Store Process**: Submission guidelines, review process, monetization

### **🏗️ Technical Debt & Infrastructure (Ongoing)**
- **Performance**: Bundle splitting, lazy loading, virtual scrolling
- **Architecture**: Consider Zustand, GraphQL, microservices, Docker
- **Security**: Rate limiting, error monitoring, CI/CD, backup/recovery
- **Business**: Analytics dashboard, monetization, community features

---

## 📝 **Live Development Changelog**

### **Version 1.0.0 - Foundation Release (September 2025)**
**Status**: ✅ **PRODUCTION READY**

#### **Patch 1.0.1 - Documentation & Architecture Audit (2025-09-25)**
**Session Summary**: Complete project audit and documentation overhaul for development continuity

**🔍 What Was Accomplished:**
- **Comprehensive Project Analysis**: Thoroughly examined entire codebase, architecture, and current status
- **PROJECT_PLAN.md Transformation**: Removed 700+ lines of redundancy, consolidated to single source of truth
- **CLAUDE.md Enhancement**: Transformed from vague 130-line guide to comprehensive 500+ line developer reference
- **Architecture Documentation**: Added detailed "How The Project Works" section with complete data flow
- **Development Rules & Constraints**: Established clear guidelines and guardrails for future development
- **Living Document System**: Implemented patch versioning and session tracking for both files
- **Current Work Documentation**: Detailed RankingDropdown progress and debugging roadmap
- **Architectural Guardrails**: Added critical preservation rules and mandatory checklists to both files
- **Consistency System**: Both PROJECT_PLAN.md and CLAUDE.md now maintain parallel documentation standards
- **Strategic Direction**: Added iOS App Store conversion as primary long-term goal with Swift learning path
- **🔧 RankingDropdown State Management FIX**: Solved the "nano second revert" issue by simplifying architecture
- **Pure Global State Implementation**: Removed complex sync logic, TeamSelectionPanel now uses controlled props
- **State Conflict Resolution**: Eliminated internal state battles between components for seamless team selection

**🐛 Issues Identified & RESOLVED:**
- **✅ RankingDropdown State Management**: FIXED - Team selection now persists properly without reverting
  - **Root Cause**: State conflict between TeamSelectionPanel internal state and global state
  - **Solution**: Simplified to pure global state architecture, removed complex useTeamSelection hook
  - **Result**: Any component can now change teams freely - "change wherever available"

**🎯 Session Goals COMPLETED:**
- ✅ **Debug RankingDropdown**: State management issue completely resolved
- ✅ **Traced callback chain**: Identified TeamSelectionPanel override as root cause  
- ✅ **Simplified architecture**: Removed 50+ lines of complex sync logic for pure global state
- ✅ **Verified integration**: RankingDropdown now works seamlessly with all panels

**📊 Current Status:**
- **Architecture**: Professional-grade, simplified to pure global state with no internal state conflicts
- **Performance**: ~50ms API responses, optimized for production deployment
- **Documentation**: Both PROJECT_PLAN.md and CLAUDE.md serve as comprehensive development guides
- **Technical Debt**: Minimal, well-structured codebase with proper TypeScript implementation
- **✅ Outstanding Work**: All major features complete! RankingDropdown now fully functional
- **🎯 Next Phase**: Ready for Swift learning and iOS app development planning

**🔒 Architecture Preservation:**
- **Guardrails Established**: Critical constraints added to prevent architectural violations
- **Global Logic Protection**: Rules to maintain existing state management and component isolation
- **Change Management**: Mandatory checklist for any modifications to preserve production stability

---

#### **Patch 1.0.2 - Interactive TeamDropdown (2025-09-26)**
- ✅ Added TeamDropdown component for seamless team selection via corner logos
- ✅ Interactive team logos in all 4 corners (look identical but clickable)  
- ✅ Fixed RankingDropdown state management issue
- ✅ 6 total team selection methods working perfectly
- **Status**: Production ready, iOS development ready

#### **Patch 1.0.3 - Floating Metrics & UI Cleanup (2025-09-26)**
- ✅ Added FloatingMetricsButton in bottom-right corner (modern app-like experience)
- ✅ Removed TeamSelectionPanel from header for ultra-clean interface
- ✅ Added "Stay Locked" footer, removed calculation/debug text from bars
- ✅ Larger metrics window (448px wide, 512px tall) for better usability
- **Status**: Production ready, clean modern interface complete

#### **Patch 1.0.4 - Mobile & iOS Development Roadmap (2025-09-26)**
- ✅ Integrated comprehensive Mobile_plan.md into PROJECT_PLAN.md and CLAUDE.md
- ✅ Added 4-phase mobile development strategy (Mobile Web → PWA → iOS App → CI/CD)
- ✅ Detailed technical guidelines for mobile optimization and iOS transition
- ✅ Set strategic target: Q1 2025 App Store launch
- **Status**: Ready for Phase 1 mobile web optimization

#### **Patch 1.0.5 - Phase 1: Mobile Web Excellence Complete (2025-09-26)**
- ✅ **Foundation & Viewport**: iOS safe-area support, dynamic viewport units, responsive design
- ✅ **Touch & Interaction**: 44×44pt touch targets, eliminated tap delays, prevented iOS zoom
- ✅ **Performance & Images**: Optimized next/image, code splitting, mobile performance monitoring
- ✅ **Accessibility & Polish**: ARIA labels, screen reader support, keyboard navigation, reduced motion
- **Status**: Mobile web excellence achieved, ready for Phase 2 (PWA)

#### **Patch 1.0.6 - Phase 2: PWA-Ready Complete (2025-09-26)**
- ✅ **PWA Manifest & Icons**: Custom PNG icons, app shortcuts, "Add to Home Screen" functionality
- ✅ **Service Worker**: Smart caching (30min fresh, 6hr stale), offline NFL stats, team logo caching
- ✅ **Offline Excellence**: Auto-detection, user feedback banner, background sync capabilities
- ✅ **Installation Prompts**: Cross-platform install detection, iOS instructions, Android one-click
- ✅ **Standalone Mode**: App-like experience, deep links, navigation handling, touch optimizations
- **Status**: Full PWA ready, installable on all platforms, ready for Phase 3 (iOS App)

#### **Patch 1.0.7 - Defense Metrics Expansion (2025-09-30)**
- ✅ **Defense Metrics Unlocked**: Enabled 18+ previously blocked metrics in defense MetricsSelector (turnovers forced, interceptions made, passing/rushing stats allowed)
- ✅ **Context-Dependent Display**: Smart interpretation of same data for defense perspective ("turnovers committed" vs "turnovers forced")
- ✅ **Enhanced Defense Analysis**: Defense metrics selector now shows ~26 metrics instead of ~8, matching offense richness
- ✅ **Configuration Documentation**: Updated CLAUDE.md with comprehensive metrics system documentation
- **Status**: Defense analysis significantly enhanced with full stat availability, ready for iOS development

---

### **Session Template (Copy for Future Updates)**

#### **Patch 1.0.X - [Session Title] (YYYY-MM-DD)**
- ✅ [What was accomplished - keep brief]
- ✅ [Another accomplishment]
- ✅ [Bug fix or improvement]
- **Status**: [Current production status]

---

### **Simplified Changelog Guidelines**

**Patch Format Rules:**
- **Keep it concise** - 3-5 bullet points max per patch
- **Use checkmarks** (✅) for completed items  
- **Focus on user-facing changes** - what actually matters
- **Include status line** - current production readiness
- **One patch per session** - increment 1.0.X for each development session

**What to Include:**
- Major features added or fixed
- UI/UX improvements 
- Bug fixes that affect users
- Performance or architectural improvements
- Brief status update

**What NOT to Include:**
- Verbose technical details (save for CLAUDE.md)
- Internal implementation specifics
- Debug/development artifacts
- Extensive explanations

---

**✅ Status**: Defense Metrics Enhanced (v1.0.7) | **📱 PWA**: Full Offline, Cross-Platform Installation Ready | **📊 Data**: Live 2025 NFL Stats with Enhanced Defense Analysis | **🔧 Platform**: Next.js 15 + TypeScript + PM2

*Last Updated: 2025-09-30 | Single Source of Truth for Pare NFL Comparison Platform | Living Documentation System Active*



## Current Active Phase: Phase 1 — UI Foundations
Focus: Implementing the left scoreboard rail (double-row format, mock data).

- Phase 1 underway: Building `ScoreboardRail` (double-row), pinned on desktop, drawer on mobile. Local mock data only.

Pare Roadmap (Detailed, Update-as-we-go)
Conventions (apply to every phase)

Branch: work in docs-refactor. Open a PR to main only when a phase is “Done”.

Docs to update each phase:

PROJECT_PLAN.md → “Current Active Phase” + changelog entry

/docs/specs/* → keep specs accurate (rail, header, chips, compare)

/docs/audit/qa-checklist.md → add tests you actually ran

/docs/audit/risks-and-questions.md → log new risks + answers

State tools: Zustand (UI state) + TanStack Query (data)

UI tools: Tailwind, shadcn/ui, Lucide, Recharts

Cadence targets: scores 5s, odds 20–30s, season hourly (server-side polling)

Definition of Done (DoD) per phase: all acceptance criteria met, QA checklist updated, small demo notes in /DevNotes/<date>.md.

Phase 1 — UI Foundations (Layout + Left Rail)

Goal: Establish the compact layout and double-row scoreboard (desktop pinned, mobile drawer). No external data yet.

Deliverables

ScoreboardRail component (double-row items)

Responsive layout shell (desktop rail pinned @ 320–360 px; mobile drawer @ 300–320 px)

Grouping: LIVE → UPCOMING → FINAL headers

Key Behaviors

No search UI; selecting a row emits {awayAbbr, homeAbbr} to app state

Typographic density: mono digits, one-line truncation, 8px rhythm

Acceptance Criteria

Desktop: rail pinned; sections grouped; rows render exactly as spec

Mobile: drawer toggles; tapping a row selects and closes drawer

No visual jank switching between items

QA Checklist (add to docs)

Verify grouping order, widths, line-breaks, and right-aligned odds/status

Keyboard focus outline visible; items accessible by tab

Risks & Mitigations

Layout shifts → lock row heights, avoid content jumps

Hydration mismatch → prefer CSS breakpoints; no isMobile branching at SSR

Future Hooks

Possession dot (•), pin favorites, compact team logos

Phase 2 — Header Line + Mismatch Chips

Goal: Show the compact header (AWAY @ HOME • status/clock • SPREAD • O/U • [Swap]) and rule-based chips under it.

Deliverables

CompareHeader with Swap (visual flip only)

MismatchChips row: max 2 visible, horizontal scroll for extras

Rules (V1)

Show only when strong: rank gap ≥ 20, top/bottom bands (≤5 or ≥28), recent trend delta ≥10–15% (L3 vs season)

Acceptance Criteria

Header updates instantly on selection change

Chips only appear when rules hit; copy is neutral, single line

Swap flips columns visually; numbers keep meaning

QA

Toggle between 3+ games; verify header/odds change without flicker

Long team names don’t overflow; chips scroll cleanly

Risks

Overcrowding → cap to 2 chips; keep copy short

Future Hooks

Chip tap opens mini explanation; add “why this matters” drawer

Phase 3 — Compare View Wiring (Compact Rows)

Goal: Wire selected teams into the Compare view; enforce compact defaults.

Deliverables

Compare view reads {awayAbbr, homeAbbr} from app state

Mobile defaults: 5 rows per section (Scoring/Efficiency, Offense, Defense, ST) with “More” expander

Bars “meet in the middle”; mono digits; consistent decimals

Acceptance Criteria

Switching games updates rows immediately

No URL/search dependency; purely from rail selection

One-line rows; numbers aligned; bars render symmetrically

QA

Expand/collapse “More”; ensure smooth layout

Verify number formatting (ints vs 1-decimal; % where applicable)

Risks

Bar math inconsistencies → centralize helper; unit tests later

Future Hooks

Trend arrows (L3 vs season); per-section sort

Phase 4 — Live Data (Mock)

Goal: See the UI working end-to-end using mock endpoints (no scraping yet).

Deliverables

/api/mock/scoreboard with LIVE/UPCOMING/FINAL examples

/api/mock/matchup?away=&home= returning header fields + chip flags

Acceptance Criteria

Rail, header, chips, compare all hydrate from mock routes

Poll rail every 5s; odds every 20s (still mock)

QA

Verify silent updates (values change, no spinner)

Simulate edge cases: PK spread, overtime label, missing scores

Risks

Mock drift → document schema in /docs/specs/* and reuse it later

Future Hooks

Add 1–2 “weird games” in mocks (weather, long team names)

Phase 5 — Polling Service Layer (Adapters + Aggregator)

Goal: Build the local service shape that will later scrape public pages.

Deliverables

/services/live-adapters/ with scoresAdapter.ts, oddsAdapter.ts (function signatures + TODOs)

/services/live-aggregator.ts merges adapters, caches snapshot in memory

Real endpoints: /api/scoreboard, /api/matchup mirror mock schema

Acceptance Criteria

UI switched from /api/mock/* → real /api/* with identical behavior

Polling cadence enforced serverside (scores 5s; odds 20–30s)

Clear comments on swap-in/out of adapter sources

QA

Network tab: only /api/* in use; no mock calls

Aggregator handles partial data gracefully (missing odds or late scores)

Risks

Tight polling in dev → throttle or pause when tab hidden

Future Hooks

Redis/Edge KV cache; SSE/WS push later

Phase 6 — Real Scraping & Odds (No Paid APIs)

Goal: Implement actual scraping into the adapters, safely and swap-ably.

Deliverables

scoresAdapter.ts parses 1–2 public sources (primary + fallback)

oddsAdapter.ts parses 1 source (fallback optional at first)

/docs/data/scrape-plan.md updated with targets, cadence, fallback policy

Acceptance Criteria

Real live scores (5s) + odds (20–30s) flow to UI

If primary breaks, toggling to fallback keeps UI alive with minimal edits

QA

Simulate one source failing; verify fallback works

Confirm times are local; verify FINAL labeling; PK display

Risks

Scraper breakage → keep adapters small; add clear error logs

Legal/ToS → note “testing/personal use”; revisit licensing if monetizing

Future Hooks

Consensus odds (avg across books); historical line movement

Phase 7 — RN Parity (Later)

Goal: Mirror the same structure in React Native; share logic.

Deliverables

Parity doc mapping web components → RN (FlashList, Reanimated, MMKV, Skia)

Shared packages for models/formatting/math/fetchers

Acceptance Criteria

RN screens visually/behaviorally match web (rail as drawer, header, chips, compact rows)

QA

Snapshot comparisons web vs RN; interaction parity list

Risks

Over-customizing RN too early → keep RN simple; reuse logic, rebuild only the UI layer

Phase 8 — UX Polish & QA

Goal: Final pass to make it feel professional.

Deliverables

Subtle animations (value fades, chip slide), skeletons > spinners

Sentry for error tracking; react-hot-toast for confirmations

/docs/audit/qa-checklist.md fully exercised; /docs/audit/EXECUTIVE_SUMMARY.md snapshot

Acceptance Criteria

No layout shifts; smooth updates; clear errors logged

Checklist green for desktop + mobile behaviors

QA

Resize/rotate tests; slow 3G simulation; throttled CPU

Accessibility pass (focus order, color contrast)

Risks

Over-animation → keep it subtle; no blocking transitions

Milestone Criteria (merge gates)

M1 (after Phase 3): Layout + header + chips + compare wired with mocks

M2 (after Phase 5): Live endpoints from local aggregator (no mocks)

M3 (after Phase 6): Real live scores/odds via adapters; scrape plan documented

M4 (after Phase 8): Polished UI; QA checklist complete; Sentry integrated

Metrics We’ll Watch (lightweight)

UI latency: rail → compare switch under ~150ms perceived

Update smoothness: no visible flicker on 5s score changes

Bundle health: keep initial JS in reasonable range; lazy-load heavy charts

Errors: Sentry event rate low and actionable