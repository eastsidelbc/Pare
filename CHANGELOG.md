# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

### Changed
- **Documentation Reorganization** (2025-10-20) — `docs-refactor` branch
  - **New Hierarchy**: Established 4-tier structure (`/docs/specs/`, `/docs/audit/`, `/docs/data/`, `/docs/archive/`)
  - **Moved 69 Files**: Specs to `/docs/specs/`, audits to `/docs/audit/`, dev notes to `/DevNotes/`, historical docs to `/docs/archive/`
  - **Front-Matter Added**: YAML metadata linking to `PROJECT_PLAN.md` and `CLAUDE.md` in all active spec/audit docs
  - **Cross-Links Updated**: `CLAUDE.md` and `PROJECT_PLAN.md` now document complete hierarchy
  - **File History Preserved**: All movements tracked as git renames
  - **Dev Note**: See [2025-10-20-docs-reorganization.md](./2025-10-20-docs-reorganization.md)

### Added
- **iOS Wrapper Scaffold** (2025-10-14) ✅ PHASE C COMPLETE
  - **Complete iOS Project**: `/ios/` directory with full SwiftUI + WKWebView implementation
  - **20 Swift Files**: Models, App, Web, UI/Tabs, UI/Common layers
  - **Key Components**:
    - `PareApp.swift` - Main app entry with AppCoordinator
    - `WebViewContainer.swift` - WKWebView wrapper with pull-to-refresh, progress, external links
    - `WebViewModel.swift` - WebView state management (similar to React hooks)
    - `PareBridge.swift` - JavaScript bridge for iOS ↔ Web communication
    - `PareTabView.swift` - Bottom tab bar (Home, Settings, Debug)
    - `SettingsTab.swift` - Native environment switcher, cache controls
    - `DebugTab.swift` - Development tools, navigation controls
    - `ProgressBar.swift` - Loading progress indicator
  - **XcodeGen Configuration**: `project.yml` with Debug/Release schemes
  - **Build Configs**: `Debug.xcconfig` (port 4000), `Release.xcconfig` (prod URL)
  - **Info.plist**: ATS configured for localhost (Debug) and HTTPS (Release)
  - **Assets**: AppIcon.appiconset, AccentColor.colorset (purple brand color)
  - **Scripts**: `gen_xcode.sh`, `setup.sh` with first-time setup automation
  - **Total Files Created**: 30+ files across 10 directories
  - **Features**: Pull-to-refresh, progress bar, back/forward gestures, external link handling, cache management, environment switching
  - **Next**: Run `ios/Scripts/setup.sh` to generate Xcode project and start development

### Docs
- **iOS Runbook** (2025-10-14) ✅ COMPLETE
  - Created: `docs/mobile/IOS_RUNBOOK.md` (600+ lines)
  - **Quick Start**: First-time setup, prerequisites, development workflow
  - **Testing**: Complete checklist for basic, web integration, iOS features, edge cases
  - **Troubleshooting**: 10+ common issues with solutions (server not running, localhost unreachable, build errors, crashes, etc.)
  - **Console Output**: Expected logs, error diagnosis
  - **Performance Tips**: Build time, runtime, app size optimization
  - **Advanced Topics**: JS bridge usage, custom URL schemes, push notifications
  - **Physical Device**: Setup instructions, local network configuration
  - **Maintenance**: Update dependencies, clean up backups

- **iOS Wrapper Plan** (2025-10-14) ✅ PHASE B COMPLETE
  - Created: `docs/mobile/IOS_WRAPPER_PLAN.md` (600+ lines)
  - **Architecture**: SwiftUI + WKWebView + XcodeGen
  - **Bottom Tabs**: Home (WebView), Settings (Native), Debug (Native)
  - **Features**: Pull-to-refresh, progress bar, external links → Safari, photo upload support, JS bridge
  - **XcodeGen**: project.yml with Debug/Release schemes, deterministic generation
  - **ATS**: localhost allowed in Debug, HTTPS required in Release
  - **Config**: Debug.xcconfig (port 4000), Release.xcconfig (prod URL)
  - **File Layout**: 20 Swift files, modular structure (App/, Web/, UI/, Models/)
  - **Decision**: ✅ PROCEED_WITH_IOS_SCAFFOLD = true
  - **Next**: Phase C - Scaffold iOS Project

- **iOS Foundation Audit** (2025-10-14) ✅ PHASE A COMPLETE
  - Created: `docs/mobile/AUDIT_iOS_FOUNDATION.md` (500+ lines)
  - **Verdict**: ✅ Excellent candidate for iOS WKWebView wrapper
  - **Strengths**: Zero external dependencies, port 4000 ready, mobile-first design, iOS-friendly PWA
  - **Repo Analysis**: Next.js 15 App Router, React 19, TypeScript, 32 NFL logos, 8 mobile components
  - **Network Surface**: All same-origin (CSV → API routes → Frontend), no external hosts
  - **PWA/Cache**: Service worker excludes HTML precaching (perfect for iOS)
  - **Assets**: Has 192x192 icon, needs 1024x1024 for iOS AppIcon
  - **Risks**: None critical, minor cleanup needed (ios-backup folders)
  - **Next**: Phase B - iOS Wrapper Plan

### Fixed
- **Swift Compilation Errors** (2025-10-10) ✅ COMPLETE
  - Fixed: `StatsViewModel.swift` - Added missing `import Combine`
  - Fixed: `ContentView.swift` - Corrected preview block syntax
  - **Issue 1**: ObservableObject conformance required Combine import
  - **Issue 2**: Preview blocks used explicit return statements (not allowed in ViewBuilder)
  - **Issue 3**: Preview blocks tried to access private @StateObject
  - **Result**: All 10 Xcode build errors resolved
  - Status: ✅ Project now compiles successfully

### Added
- **Monorepo Reorganization** (2025-10-10) ✅ COMPLETE
  - Created: `docs/devnotes/2025-10-10-monorepo-reorganization.md`
  - **Action**: Consolidated iOS project into monorepo structure
  - **From**: Split between `/Pare-iOS/` and `/Pare/ios/`
  - **To**: All in `/Pare/ios/` (professional monorepo)
  - **Moved**: Pare-iOS.xcodeproj → Pare/ios/Pare.xcodeproj
  - **Organized**: Proper folder structure (Models, Services, ViewModels, Views)
  - **Preserved**: All Swift files, Config.xcconfig, Info.plist, Assets
  - **Next**: Open Pare.xcodeproj and fix file references in Xcode

### Docs
- **Comprehensive Session Summary** (2025-10-10) ✅ COMPLETE
  - Created: `SESSION_SUMMARY_2025-10-10.md` (900+ lines)
  - **Purpose**: Complete context for continuing work with fresh Claude instance
  - **Coverage**: All work completed, files created/modified, current state, next steps
  - **Sections**: Project context, work completed, files created, current state, key decisions, next steps, testing, commands, React→Swift patterns, success criteria
  - **Use**: Provide to Claude on desktop to continue seamlessly
  - **Status**: Ready for context window transfer

### Added
- **Swift API Client & Data Models** (2025-10-10) ✅ COMPLETE
  - Created: `Pare-iOS/Pare/Models/TeamData.swift` - Data structures (Codable)
  - Created: `Pare-iOS/Pare/Services/StatsAPI.swift` - API client with async/await
  - Created: `Pare-iOS/Pare/Services/CacheManager.swift` - 6-hour cache manager
  - Created: `Pare-iOS/Pare/ViewModels/StatsViewModel.swift` - State management
  - Updated: `Pare-iOS/Pare/ContentView.swift` - Test UI with team list
  - Created: `Pare-iOS/SWIFT_FILES_SETUP.md` - Step-by-step setup guide
  - **Features**: Health check, offense/defense fetch, caching, error handling
  - **React Equivalent**: Like useNflStats hook + TypeScript interfaces
  - **Status**: ✅ Ready to add to Xcode project
  - **Next**: Add files to Xcode, test data loading, build comparison UI

- **Xcode Project Configuration Files** (2025-10-10) ✅ COMPLETE
  - Created: `Pare-iOS/Config.xcconfig` - App configuration (like .env for iOS)
  - Created: `Pare-iOS/Info.plist` - Complete with ATS, dark mode, bundle settings
  - Created: `Pare-iOS/XCODE_SETUP_GUIDE.md` - Beginner-friendly setup instructions
  - **Config.xcconfig**: API base URL (port 4000), version numbers, feature flags
  - **Info.plist**: Dark mode forced, localhost networking enabled, bundle ID configured
  - **Setup Guide**: Step-by-step Xcode instructions with React → Swift comparisons
  - Status: ✅ Ready to add to Xcode project
  - Next: Add files to Xcode, configure project settings, test configuration

- **Port 4000 Migration** (2025-10-10) ✅ COMPLETE
  - Updated: `package.json` - Dev server now runs on port 4000 (`-p 4000`)
  - Updated: `config/constants.ts` - Added PORT: 4000 to API config
  - Updated: `MOBILE_NOTES.md` - All examples use port 4000
  - **Why**: iOS ContentView.swift already hardcoded to port 4000
  - **Consistency**: Backend, docs, and iOS all use same port
  - **Test**: `npm run dev` → `curl http://localhost:4000/api/health | jq`

- **API Health Endpoint for iOS** (2025-10-10) ✅ COMPLETE
  - Created: `app/api/health/route.ts`
  - Returns: `{ ok: true, version: "1.0.0", timestamp, uptime, endpoints, environment }`
  - Purpose: iOS App Store compliance + production monitoring
  - Status: ✅ Ready (restart dev server to activate)
  - Test: `curl http://localhost:4000/api/health | jq`

### Docs
- **API Audit for iOS Development** (2025-10-10) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-10-api-audit.md`
  - See: `MOBILE_NOTES.md` (iOS API documentation)
  - **Purpose**: Pre-iOS development API readiness assessment
  - **Coverage**: All 3 existing endpoints + error handling + caching + data sources
  - **Status**: ⚠️ 99% Ready (missing HTTPS production URL)
  - **Key Findings**:
    - ✅ 3 working endpoints (offense, defense, preferences)
    - ✅ Excellent 6-hour in-memory caching with stale data fallback
    - ✅ Comprehensive error handling (200 OK with stale flag, or 500 with details)
    - ✅ Clean codebase (zero TODO/FIXME/HACK comments)
    - ✅ Consistent JSON response format across all endpoints
    - ❌ Missing `/api/health` endpoint → CREATED ✅
    - ⚠️ No HTTPS production URL (required for iOS ATS compliance)
  - **Deliverables**:
    - Complete API audit report with status codes, response formats, cache strategies
    - MOBILE_NOTES.md with iOS-specific documentation and Swift code examples
    - `/api/health` endpoint implementation
    - iOS readiness checklist (score: 9.5/10 after health endpoint)
  - **Swift Examples**: Complete `StatsAPI` client with cache management, error handling, retry logic
  - **Deployment**: Recommends Vercel for free HTTPS (zero config, automatic SSL)
  - **Next**: Deploy to HTTPS production, then begin Phase 1 (iOS Project Bootstrap)

- **Mobile Components Deep Dive** (2025-10-10) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-10-mobile-components-audit.md`
  - **Purpose**: Surgical analysis of 9 mobile components for SwiftUI conversion
  - **Focus**: State management, dropdown behavior, interaction patterns
  - **Key Findings**:
    - Two distinct dropdowns: Team selector (alphabetical) + Ranking dropdown (rank-sorted)
    - Mutual exclusion pattern: Only one dropdown open at a time per panel
    - Floating UI positioning: Professional portal-based rendering with auto-flip
    - Instant display toggle: No dropdown, immediate mode switch
    - Two-line row layout: Data line (padded) + bar line (edge-to-edge)
  - **Detailed Flows**: 3 complete user interaction flows with visual examples
  - **Dropdown Management**: Full documentation of positioning strategy and state control
  - **SwiftUI Mappings**: Component-by-component conversion patterns
  - **Next**: Phase 1 - iOS Project Bootstrap (create SwiftUI versions)

- **Comprehensive iOS Conversion Audit** (2025-10-10) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-10-ios-conversion-audit.md`
  - **Purpose**: Pre-iOS conversion analysis of entire codebase
  - **Coverage**: 17 desktop components, 9 mobile components, 5 hooks, 44+ metrics
  - **Deliverables**: Component tree, data flow diagrams, SwiftUI mappings, iOS checklist
  - **Key Findings**:
    - Clean modular architecture translates exceptionally well to iOS
    - Zero external state libraries = easy SwiftUI conversion
    - Client-side calculations = reusable Swift functions
    - Estimated 3-4 weeks to App Store v1.0
  - **Swift Patterns**: Provided SwiftUI code examples for all major patterns
  - **iOS Checklist**: 6-phase roadmap with gate questions for each phase
  - **Next**: Phase 0 - iOS Foundations (repo hygiene, MOBILE_NOTES.md, /health endpoint)

### Fixed
- **Critical: Per-Game Ranking Precision Fix** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-hooks-alignment-audit.md`
  - See: `docs/audits/2025-10-cross-surface-hooks/findings.md`
  - **Issue**: `.toFixed(1)` was rounding values BEFORE ranking computation
  - **Root Cause**: `utils/teamDataTransform.ts:54` converted per-game values to strings (e.g., 38.888 → "38.9")
  - **Impact**: Broke tie detection in per-game mode - Vikings showed "15th" instead of "T-13th"
  - **Fix**: Removed `.toFixed(1)` from data transform layer
  - **Result**: Full precision preserved for ranking, formatting only at display layer
  - Affects both desktop AND mobile (shared bug)
  - No other code changes needed (display components already format correctly)
  - Per-game and Total modes now have identical tie detection precision
- **Mobile Dropdown Positioning - Floating UI Migration** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-floating-ui-migration.md`
  - See: `docs/devnotes/2025-10-09-floating-ui-bugfix.md` (React setState fix)
  - See: `docs/audits/2025-10-09-mobile-dropdown-audit.md`
  - **Issue #1 Fixed**: Dropdowns no longer clipped by panel divider/overflow-hidden
  - **Issue #2 Fixed**: Right-side (Team B) dropdowns stay within viewport  
  - **Issue #3 Fixed**: Bottom row dropdowns auto-flip to render above when needed
  - **Positioning Enhancement**: Smart side positioning - Team A dropdowns appear RIGHT, Team B dropdowns appear LEFT
  - **Height Fix**: Shows 8-9 complete rows (416-468px) instead of 5.38 rows - no more mid-row cutoff (San Francisco issue)
  - Migrated from manual absolute positioning to industry-standard **Floating UI** library
  - Professional solution used by GitHub, Stripe, Vercel, Linear, Notion
  - Added `@floating-ui/react` dependency (~10KB gzipped)
  - Portal-based rendering escapes clipping containers
  - Auto-flip, shift, and boundary detection middleware
  - Works flawlessly across all screen sizes (320px-428px+)
  - Handles device rotation, scroll, resize automatically
  - Mobile touch-optimized with accessibility built-in
  - Production-ready for iOS App Store deployment

### Added
- **Mobile UI Transformation - Phase 4: Final Polish & Testing** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-phase4-final-polish.md`
  - Added touch-optimized CSS utilities (`.touch-optimized`, `.focus-ring`)
  - Comprehensive testing across viewport sizes (320px - 1024px)
  - Verified all dropdowns, interactions, and state management
  - Visual consistency audit (spacing, colors, typography)
  - Performance verification (60fps scrolling, instant interactions)
  - Complete mobile UI architecture documentation
  - Production-ready mobile comparison interface
  - **MOBILE TRANSFORMATION COMPLETE**: 9 new components, ~1,200 lines
  - theScore's structure + Pare's style = Perfect balance

- **Mobile UI Transformation - Phase 3: Team Logo Dropdown Integration** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-phase3-team-logo-selector.md`
  - Implemented `CompactTeamSelector` dropdown (alphabetical team list)
  - Responsive height: clamp(320px, 50vh, 420px)
  - Tap team logo → Opens team selector with all 32 teams + "Avg" last
  - Purple accents, Pare styling, average team emoji badge
  - Added state management for team selector dropdowns (separate from ranking)
  - Mutual exclusion: Only one dropdown open at a time per panel
  - Complete team selection flow: Logo → Dropdown → Select → Update global state

- **Mobile UI Transformation - Phase 2: Panel Headers & Comparison Rows** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-phase2-panel-rows.md`
  - Implemented `CompactPanelHeader` (70px height, instant PER GAME/TOTAL toggle)
  - Implemented `CompactComparisonRow` (two-line layout: data line + edge-to-edge bars)
    - LINE 1: Values, ranks, metric name (with padding)
    - LINE 2: Green/orange gradient bars (NO padding, touch panel edges)
    - Bar height: 6px with glow effects
    - Total row height: ~52px
  - Implemented `CompactRankingDropdown` (responsive height clamp(280px, 40vh, 380px))
  - Full integration with `useRanking`, `useBarCalculation`, `useDisplayMode` hooks
  - Tap rank text `(30th)` to open dropdown with all teams sorted by rank
  - theScore layout structure + Pare visual identity (green/orange bar colors from desktop)
  - Average team support (`📊 Avg` badge in dropdowns)
  - Fully functional comparison UI with real data

- **Mobile UI Transformation - Phase 1: Foundation & Shell** (2025-10-09) ✅ COMPLETE
  - See: `docs/devnotes/2025-10-09-phase1-mobile-foundation.md`
  - Created `useIsMobile` hook for viewport detection (<1024px)
  - Created mobile component directory (`components/mobile/`)
  - Implemented `MobileCompareLayout` with conditional rendering
  - Implemented `MobileTopBar` (56px fixed, safe area padding)
  - Implemented `MobileBottomBar` (64px fixed, 3-tab placeholder)
  - Pare-styled background gradient and borders
  - Desktop layout preserved completely unchanged (≥1024px)

- **Special "Avg Tm/G" Team Support** (2025-10-08) ✅ ALL PHASES COMPLETE
  - See: `docs/devnotes/2025-10-08-avg-team-support.md`
  - **Phase 1**: Created utility functions (`utils/teamHelpers.ts`) for detecting league average special row
  - **Phase 2**: TeamDropdown shows "📊 Avg (per game)" as last option with visual separator
  - **Phase 3**: RankingDropdown shows "📊 Avg" badge (no rank number) after ranked teams (1-32)
  - **Phase 4**: Comparison view shows "📊 Avg" badge when average team selected (no rank pill)
  - **Fix #1**: RankingDropdown button shows "📊 Avg" when average selected (not "N/A")
  - **Fix #2**: "Avg" badge in comparison view is clickable (opens RankingDropdown)
  - Average team can be selected for benchmarking (e.g., "Cowboys 151 pts vs Avg 114.6 pts")
  - 32 teams still get ranks 1-32 (average excluded from ranking calculations)
  - Verified CSV contains "Avg Tm/G" row with per-game league averages

### Fixed
- **Service Worker CSS Caching** (2025-10-08)
  - See: `docs/devnotes/2025-10-08-sw-css-cache-fix.md`
  - Changed CSS caching from cache-first to network-first strategy
  - Fixes Tailwind class changes not applying on normal refresh (only after hard reload)
  - CSS now always fetches fresh, falls back to cache when offline
  - Bumped SW version to v1.0.6 to invalidate old caches
  - Added `npm run dev:clean` script for easy cache clearing

### Added
- Dev Note: Phases execution summary (2025-10-07)
  - See: `docs/devnotes/2025-10-07-phases-execution.md`

- MetricsSelector: Toggle metric selection by clicking bubbles (2025-10-02)
  - See: `docs/devnotes/2025-10-02-metrics-selector-ui-improvements.md`
  - Click selected metric to remove, click unselected to add
  - New "Add All / Clear All" button with dynamic label
  - Desktop responsive sizing improvements (md: breakpoints for larger text/grid/spacing)
- MetricsSelector: Full-width desktop layout & UX cleanup (2025-10-02)
  - See: `docs/devnotes/2025-10-02-metrics-fullwidth-cleanup.md`
  - Desktop panel now spans full width (responsive padding: 1rem→2rem→3rem)
  - Removed "Customize" button - metrics always visible for immediate interaction
  - Clean selected labels - removed redundant field keys (e.g., `1. Points` not `1. Points (points)`)
- MetricsSelector: 4-column desktop grid with improved density (2025-10-02)
  - See: `docs/devnotes/2025-10-02-metrics-4col-desktop-layout.md`
  - Desktop (≥1024px) now shows 4 columns instead of 3 (+33% metrics per row)
  - Reduced card padding and font sizes on desktop for better information density
  - Added min-height (105-120px) for consistent row alignment
  - Text clamping (1-line titles, 2-line descriptions) prevents overflow and maintains grid alignment
- MetricsSelector: 5-column ultra-wide grid & vertical expansion (2025-10-02)
  - See: `docs/devnotes/2025-10-02-metrics-5col-vertical-expansion.md`
  - Extra-large screens (≥1280px) now show 5 columns instead of 4 (+25% metrics per row)
  - Panel height expanded to 75% of viewport (leaving 25% gap from top for page context)
  - Scrollable area now fills available space (was fixed at 32rem/512px)
  - Combined improvements: +87% more metrics visible on modern widescreen displays

### Performance
- **Metrics Drawer Performance Optimization** (2025-10-03)
  - See: `docs/devnotes/2025-10-03-metrics-drawer-performance-audit.md`
  - First open: 150-200ms → <16ms (92% faster)
  - Animation: 30-40ms/frame → 10-15ms/frame (67% faster)
  - Eliminated spinner flash on first open (100% improvement)
  - Removed double backdrop-blur, added GPU layer hints (`will-change-transform`)
  - Changed scale animation to translate-only for better compositing
  - Professional 4-layer preload system (idle + interaction + hover + promise-gated)
  - Added singleton preload utility (`lib/metricsSelectorPreload.ts`)
  - Memoized MetricsSelector internal logic (`useMemo` + `useCallback`)
  - Wrapped FloatingMetricsButton in `React.memo` (50% fewer wasted re-renders)

### Fixed
- Increase RankingDropdown visible teams from 4 to 10+ (2025-10-02)
  - See: `docs/devnotes/2025-10-02-ranking-dropdown-height-increase.md`
  - Changed `max-h-60` (240px) to `max-h-[40rem]` (640px) in `components/RankingDropdown.tsx`

### Docs
- Add Dev Note for docs/release ops bootstrap (2025-10-02)
  - See: `docs/devnotes/2025-10-02-docs-release-ops-bootstrap.md`
  - Norms: `CLAUDE.md#changelog-guidelines`
- Add ADR template scaffold under `docs/adr/_template.md` (2025-10-02)

### Docs
- Phase 4: Mock API Integration (2025-10-27) ✅ COMPLETE
  - Dev Note: `docs/devnotes/2025-10-27-phases-1-4-ui-mock-api.md`
  - `PROJECT_PLAN.md` updated with Phase 2–4 notes
  - `docs/audit/qa-checklist.md` updated with Phase 4 section

### Added
- Mock API endpoints and wiring (2025-10-27)
  - `types/matchup.ts` (ScoreboardGame, MatchupPayload, Chip)
  - `app/api/mock/scoreboard` (5s polling) & `app/api/mock/matchup`
  - `utils/time.ts` (Chicago kickoff), `utils/odds.ts` (spread/total)
  - `lib/hooks/useScoreboardMock.ts` (5s polling)
  - Rail/Header/Chips wired to mocks with skeletons


