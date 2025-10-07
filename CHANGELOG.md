# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

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


