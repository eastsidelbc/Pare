# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

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


