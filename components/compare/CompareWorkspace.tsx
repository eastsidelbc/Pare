/**
 * CompareWorkspace — the swipeable multi-comparison workspace (Vision Step 2).
 *
 * Renders one page per item in the comparisons store, each showing the existing
 * <ComparePane> for that comparison's teams. Swipe left/right (Framer Motion) or
 * tapping a tab in <CompareTabBar> changes the active comparison via the store.
 *
 * Data comes from the app-wide <NflStatsProvider> (root layout) and is shared
 * to every pane as props — opening Compare or swiping never refetches; only the
 * two selected teams differ per page.
 * The single-compare case = one comparison in the store, so /compare behaves as
 * before (plus a 1-tab indicator). Deep link ?home=&away= still works.
 */

'use client';

import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CompareTicker from './CompareTicker';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useSharedNflStats } from '@/components/NflStatsProvider';
import { useComparisons } from '@/components/ComparisonsProvider';
import { useFillComparison } from '@/lib/comparisons/useFillComparison';
import { abbrToTeamName } from '@/lib/teams';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { APP_CONSTANTS } from '@/config/constants';
import ComparePane from '@/components/compare/ComparePane';
import CompareTabBar from '@/components/compare/CompareTabBar';
import CompareQuadrants from '@/components/compare/CompareQuadrants';
import OfflineStatusBanner from '@/components/OfflineStatusBanner';

/** Stable handler set for one pane (kept identity-constant per comparison id). */
interface PaneHandlers {
  onTeamAChange: (t: string) => void;
  onTeamBChange: (t: string) => void;
  onPickMatchup: (a: string, b: string) => void;
  onOffenseMetricsChange: (m: string[]) => void;
  onDefenseMetricsChange: (m: string[]) => void;
}

export default function CompareWorkspace() {
  const isMobile = useIsMobile();
  // Phones (<768px) keep the single-pane swipe; tablet/desktop get the 2×2
  // quadrant grid. (iPad portrait 834 and landscape 1194 both get quadrants.)
  const isPhone = useIsMobile(768);

  // Deep link: /compare?away=XXX&home=YYY (away → Team A, home → Team B).
  const searchParams = useSearchParams();
  const queryTeamA = abbrToTeamName(searchParams.get('away'));
  const queryTeamB = abbrToTeamName(searchParams.get('home'));

  const {
    offenseData,
    defenseData,
    isLoading,
    isLoadingOffense,
    isLoadingDefense,
    offenseError,
    defenseError,
  } = useSharedNflStats();

  const {
    comparisons,
    activeId,
    activeComparison,
    hydrated,
    addComparison,
    setActive,
    removeComparison,
    updateComparison,
  } = useComparisons();

  const activeIndex = Math.max(0, comparisons.findIndex((c) => c.id === activeId));

  // Deterministic defaults (used only to validate/repair invalid selections).
  const defaultTeams = useMemo(() => {
    const specialTeams = ['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'];
    const availableTeams = offenseData.filter((team) => !specialTeams.includes(team.team));
    if (availableTeams.length < 2) return { a: '', b: '' };
    const preferredTeamA = 'Minnesota Vikings';
    const preferredTeamB = 'Detroit Lions';
    const a = availableTeams.find((t) => t.team === preferredTeamA)?.team || availableTeams[0]?.team || '';
    const b = availableTeams.find((t) => t.team === preferredTeamB && t.team !== a)?.team
      || availableTeams.find((t) => t.team !== a)?.team || '';
    return { a, b };
  }, [offenseData]);

  // Deep link → open the matchup ON TOP of the restored tabs (deep link wins for
  // what's active). Waits for hydration so it lands on the restored set, then
  // dedupes to an existing tab for the same pair or creates one (respects cap).
  useEffect(() => {
    if (!hydrated) return;
    if (!queryTeamA && !queryTeamB) return;
    const a = queryTeamA ?? activeComparison.teamA;
    const b = queryTeamB ?? activeComparison.teamB;
    const existing = comparisons.find(
      (c) => (c.teamA === a && c.teamB === b) || (c.teamA === b && c.teamB === a),
    );
    if (existing) {
      setActive(existing.id);
    } else {
      const id = addComparison(a, b); // respects MAX_COMPARISONS (null if capped)
      if (id) setActive(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, queryTeamA, queryTeamB]);

  // Validation-only: repair STALE (non-empty but invalid) team names across all
  // comparisons when data arrives. Empty teams are left untouched — a blank tab
  // is intentional (the "+" empty state) and must stay blank until picked.
  // Idempotent — once every set team is valid, no further patches fire.
  useEffect(() => {
    if (offenseData.length === 0) return;
    comparisons.forEach((c) => {
      const patch: { teamA?: string; teamB?: string } = {};
      if (c.teamA && !offenseData.some((t) => t.team === c.teamA) && defaultTeams.a) {
        patch.teamA = defaultTeams.a;
      }
      if (c.teamB && !offenseData.some((t) => t.team === c.teamB) && defaultTeams.b) {
        patch.teamB = defaultTeams.b;
      }
      if (patch.teamA || patch.teamB) updateComparison(c.id, patch);
    });
  }, [offenseData, comparisons, defaultTeams, updateComparison]);

  // ── Swipe / paging ─────────────────────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );
  const x = useMotionValue(0);

  // Measure the pager viewport (full-width) and keep it in sync on resize.
  useEffect(() => {
    const measure = () => {
      if (viewportRef.current) setWidth(viewportRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Windowing center that only moves once the slide has LANDED (perf Pass 3).
  // Panes mount around `settledIndex`, so the next neighbor is built after the
  // spring finishes — not mid-swipe — and inside startTransition, so React can
  // pause that work if you touch the screen again.
  const [settledIndex, setSettledIndex] = useState(activeIndex);
  const settle = useCallback((i: number) => {
    startTransition(() => setSettledIndex(i));
  }, []);

  // Snap the track to the active page whenever active/width/count changes
  // (but not mid-drag — this only reacts to committed state).
  const prevIndexRef = useRef(activeIndex);
  useEffect(() => {
    const distance = Math.abs(activeIndex - prevIndexRef.current);
    prevIndexRef.current = activeIndex;
    // Non-adjacent jump (tab tap across >1 page): snap instantly. Windowing only
    // mounts active ±1, so animating a long slide would scroll past empty cells.
    // Adjacent moves (swipe / neighbor tap) still spring smoothly.
    if (distance > 1) {
      x.set(-activeIndex * width);
      setSettledIndex(activeIndex); // instant jump → window moves now (urgent)
      return;
    }
    const controls = animate(x, -activeIndex * width, {
      type: 'spring',
      stiffness: 320,
      damping: 34,
      onComplete: () => settle(activeIndex),
    });
    return controls.stop;
  }, [activeIndex, width, comparisons.length, x, settle]);

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = Math.max(48, width * 0.2);
      const { offset, velocity } = info;
      let target = activeIndex;
      if (offset.x < -threshold || velocity.x < -500) {
        target = Math.min(activeIndex + 1, comparisons.length - 1);
      } else if (offset.x > threshold || velocity.x > 500) {
        target = Math.max(activeIndex - 1, 0);
      }
      if (target !== activeIndex) {
        setActive(comparisons[target].id); // active change → snap effect runs
      } else {
        animate(x, -activeIndex * width, { type: 'spring', stiffness: 320, damping: 34 });
      }
    },
    [activeIndex, width, comparisons, setActive, x],
  );

  const canDrag = comparisons.length > 1 && width > 0;

  // "+" on the tab row → add a BLANK comparison (no teams) and activate it.
  // It renders as an empty state (two inline "Pick team" slots) until filled.
  const handleAddBlank = useCallback(() => {
    addComparison('', ''); // respects MAX_COMPARISONS; auto-activates the new tab
  }, [addComparison]);

  // Stable per-comparison handler sets (keyed by id) so memoized <ComparePane>s
  // don't re-render when an unrelated `setActive` changes. `updateComparison` is
  // read through a ref, so the cached closures never need to change identity.
  const updateRef = useRef(updateComparison);
  useEffect(() => {
    updateRef.current = updateComparison;
  }, [updateComparison]);
  const fillComparison = useFillComparison();
  const fillRef = useRef(fillComparison);
  useEffect(() => {
    fillRef.current = fillComparison;
  }, [fillComparison]);
  const paneHandlersRef = useRef<Map<string, PaneHandlers>>(new Map());
  const getPaneHandlers = useCallback((id: string): PaneHandlers => {
    const cache = paneHandlersRef.current;
    let h = cache.get(id);
    if (!h) {
      h = {
        onTeamAChange: (t: string) => updateRef.current(id, { teamA: t }),
        onTeamBChange: (t: string) => updateRef.current(id, { teamB: t }),
        onPickMatchup: (a: string, b: string) => fillRef.current(id, a, b),
        onOffenseMetricsChange: (m: string[]) =>
          updateRef.current(id, { settings: { offenseMetrics: m } }),
        onDefenseMetricsChange: (m: string[]) =>
          updateRef.current(id, { settings: { defenseMetrics: m } }),
      };
      cache.set(id, h);
    }
    return h;
  }, []);

  if (process.env.NODE_ENV !== 'production') {
    console.log('🏈 [COMPARE-WORKSPACE] Render:', {
      comparisons: comparisons.length,
      activeIndex,
      activeTeams: `${activeComparison.teamA} vs ${activeComparison.teamB}`,
      offenseTeams: offenseData.length,
      defenseTeams: defenseData.length,
      isLoading,
      hasErrors: !!(offenseError || defenseError),
    });
  }

  // ── Error state (shared data failed) ────────────────────────────────────────
  if (offenseError || defenseError) {
    return (
      <div className="min-h-screen-dynamic w-full bg-linear-to-br from-[var(--bg)] via-[var(--surface)] to-[var(--card)] text-text px-4 sm:px-6 py-safe-top pb-safe-bottom pt-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-red mb-6">⚠️ Data Loading Error</h1>
          <div className="bg-surface/90 rounded-xl border border-red/50 p-8 space-y-6">
            <p className="text-text text-lg">
              Unable to load NFL team data. Please check the API connection.
            </p>
            <div className="text-left space-y-4">
              {offenseError && (
                <div>
                  <span className="text-red font-medium">Offense API:</span>
                  <p className="text-text text-sm mt-1">{offenseError}</p>
                </div>
              )}
              {defenseError && (
                <div>
                  <span className="text-red font-medium">Defense API:</span>
                  <p className="text-text text-sm mt-1">{defenseError}</p>
                </div>
              )}
            </div>
            <div className="mt-8 space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue hover:bg-blue/80 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                🔄 Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden text-text"
      style={{
        height: 'var(--app-h, 100dvh)',
        // No bottom reserve here: the pager fills the full height so comparison
        // cards scroll BEHIND the floating BottomNav (seamless, iOS-style). The
        // inner scroll content keeps its own nav-height bottom padding, so the
        // last card still clears the pill when scrolled to the end.
        background: 'var(--bg-deep)',
      }}
    >
      <OfflineStatusBanner />

      {/* Title row — back + title + "+" (new comparison). Single shared header
          for the whole compare screen; the mobile per-pane top bar was removed
          so this is the only header. */}
      <div
        className="flex-none"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          background: 'var(--bg-deep)',
        }}
      >
        <div className="mx-auto grid h-10 w-full max-w-[600px] grid-cols-[40px_1fr_40px] items-center px-2">
          <Link
            href="/"
            aria-label="Back to schedule"
            className="flex h-9 w-9 items-center justify-center rounded-lg touch-optimized active:opacity-60"
            style={{ color: 'var(--text)' }}
          >
            <ChevronLeft size={20} />
          </Link>
          <CompareTicker />
          {/* Right spacer keeps the title centered — the "+" now lives on the
              tab row (far right) per the new create flow. */}
          <div />
        </div>
      </div>

      {isPhone ? (
        <>
          {/* Comparison tabs pill — sits BETWEEN the title row and the cards. The "+"
              (far right, easy thumb tap) adds a BLANK tab and activates it. */}
          <CompareTabBar
            comparisons={comparisons.map((c) => ({ id: c.id, teamA: c.teamA, teamB: c.teamB }))}
            activeId={activeId}
            onSelect={setActive}
            onClose={removeComparison}
            onAdd={handleAddBlank}
            canAdd={comparisons.length < APP_CONSTANTS.MAX_COMPARISONS}
          />

          {/* Pager viewport */}
          <div ref={viewportRef} className="relative flex-1 overflow-hidden">
            <motion.div
              className="flex h-full"
              style={{ x }}
              drag={canDrag ? 'x' : false}
              dragDirectionLock
              dragConstraints={{ left: -(comparisons.length - 1) * width, right: 0 }}
              dragElastic={0.12}
              onDragEnd={handleDragEnd}
            >
              {comparisons.map((c, i) => {
                // Windowing: mount the settled pane and its immediate neighbors
                // (±1) — plus the active pane, always. Neighbors stay mounted so a
                // swipe reveals a ready page (no blank flash); panes ≥2 away are
                // virtualized (empty cell of the same width, preserving the track
                // layout + drag constraints). The window follows `settledIndex`, so
                // the new far neighbor mounts only after the slide lands.
                const isWindowed = i === activeIndex || Math.abs(i - settledIndex) <= 1;
                const h = getPaneHandlers(c.id);
                return (
                  <div
                    key={c.id}
                    className="shrink-0 h-full overflow-y-auto relative"
                    style={{
                      width: width || '100%',
                      // pan-y: browser handles vertical scroll natively; pager owns x.
                      // overscroll contain: prevents scroll chaining to the document.
                      touchAction: 'pan-y',
                      overscrollBehavior: 'contain',
                    }}
                  >
                    {isWindowed ? (
                      <ComparePane
                        isMobile={isMobile}
                        teamA={c.teamA}
                        teamB={c.teamB}
                        offenseData={offenseData}
                        defenseData={defenseData}
                        selectedOffenseMetrics={c.settings.offenseMetrics}
                        selectedDefenseMetrics={c.settings.defenseMetrics}
                        isLoading={isLoading}
                        isLoadingOffense={isLoadingOffense}
                        isLoadingDefense={isLoadingDefense}
                        onTeamAChange={h.onTeamAChange}
                        onTeamBChange={h.onTeamBChange}
                        onPickMatchup={h.onPickMatchup}
                        onOffenseMetricsChange={h.onOffenseMetricsChange}
                        onDefenseMetricsChange={h.onDefenseMetricsChange}
                      />
                    ) : null}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </>
      ) : (
        /* Tablet / desktop — 2×2 quadrant grid (own paging, add, remove, metrics). */
        <CompareQuadrants
          offenseData={offenseData}
          defenseData={defenseData}
          isLoading={isLoading}
          isLoadingOffense={isLoadingOffense}
          isLoadingDefense={isLoadingDefense}
        />
      )}
    </div>
  );
}
