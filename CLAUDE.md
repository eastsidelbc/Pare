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

**Current Status**: Production ready web app with one outstanding issue - RankingDropdown state management needs debugging. Architecture designed to support future mobile app development.

## 📱 **Strategic Development Direction**

### **Primary Long-term Goal: iOS App Store**
The web application serves as a **proof-of-concept and API foundation** for the ultimate goal:

**🎯 Convert to Native iOS App:**
- **Learn Swift programming language** for native iOS development
- **Leverage existing infrastructure**: Keep CSV processing, API routes, and data logic
- **Enhance for mobile**: Touch-optimized theScore-style bars, native iOS design patterns
- **App Store deployment**: Implement iOS-specific features and monetization strategies
- **Maintain architecture**: Current modular design supports mobile conversion

**Development Approach:**
- **Phase 1**: Complete web app (current focus - finish RankingDropdown)
- **Phase 2**: Learn Swift and iOS development fundamentals
- **Phase 3**: Convert data processing and API logic to iOS-compatible format
- **Phase 4**: Build native UI with enhanced mobile UX
- **Phase 5**: App Store optimization and deployment

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

### Metrics Configuration
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
- Debug RankingDropdown state management issue (1-2 hours estimated)

**📊 Current Status:**
- **Architecture**: Professional-grade, recently refactored from monolith
- **Performance**: ~50ms API responses, production optimized
- **Documentation**: Comprehensive guides for PROJECT_PLAN.md and CLAUDE.md
- **Technical Debt**: Minimal, well-structured codebase

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