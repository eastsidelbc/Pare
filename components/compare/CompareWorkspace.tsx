/**
 * CompareWorkspace — the swipeable multi-comparison workspace (Vision Step 2).
 *
 * Renders one page per item in the comparisons store, each showing the existing
 * <ComparePane> for that comparison's teams. Swipe left/right (Framer Motion) or
 * tapping a tab in <CompareTabBar> changes the active comparison via the store.
 *
 * Data is fetched ONCE here (useNflStats) and shared to every pane as props, so
 * swiping never triggers a refetch — only the two selected teams differ per page.
 * The single-compare case = one comparison in the store, so /compare behaves as
 * before (plus a 1-tab indicator). Deep link ?home=&away= still works.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useNflStats } from '@/lib/useNflStats';
import { useComparisons } from '@/components/ComparisonsProvider';
import { abbrToTeamName } from '@/lib/teams';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { APP_CONSTANTS } from '@/config/constants';
import ComparePane from '@/components/compare/ComparePane';
import CompareTabBar from '@/components/compare/CompareTabBar';
import FloatingMetricsButton from '@/components/FloatingMetricsButton';
import OfflineStatusBanner from '@/components/OfflineStatusBanner';

export default function CompareWorkspace() {
  const isMobile = useIsMobile();

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
  } = useNflStats();

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

  // Snap the track to the active page whenever active/width/count changes
  // (but not mid-drag — this only reacts to committed state).
  useEffect(() => {
    const controls = animate(x, -activeIndex * width, {
      type: 'spring',
      stiffness: 320,
      damping: 34,
    });
    return controls.stop;
  }, [activeIndex, width, comparisons.length, x]);

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

  // Metric handlers for the workspace-level floating button (active comparison).
  const handleActiveOffenseMetrics = useCallback(
    (metrics: string[]) => updateComparison(activeId, { settings: { offenseMetrics: metrics } }),
    [updateComparison, activeId],
  );
  const handleActiveDefenseMetrics = useCallback(
    (metrics: string[]) => updateComparison(activeId, { settings: { defenseMetrics: metrics } }),
    [updateComparison, activeId],
  );

  console.log('🏈 [COMPARE-WORKSPACE] Render:', {
    comparisons: comparisons.length,
    activeIndex,
    activeTeams: `${activeComparison.teamA} vs ${activeComparison.teamB}`,
    offenseTeams: offenseData.length,
    defenseTeams: defenseData.length,
    isLoading,
    hasErrors: !!(offenseError || defenseError),
  });

  // ── Error state (shared data failed) ────────────────────────────────────────
  if (offenseError || defenseError) {
    return (
      <div className="min-h-screen-dynamic w-full bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#1e293b] text-white px-4 sm:px-6 py-safe-top pb-safe-bottom pt-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-6">⚠️ Data Loading Error</h1>
          <div className="bg-slate-900/90 rounded-xl border border-red-500/50 p-8 space-y-6">
            <p className="text-slate-300 text-lg">
              Unable to load NFL team data. Please check the API connection.
            </p>
            <div className="text-left space-y-4">
              {offenseError && (
                <div>
                  <span className="text-red-400 font-medium">Offense API:</span>
                  <p className="text-slate-300 text-sm mt-1">{offenseError}</p>
                </div>
              )}
              {defenseError && (
                <div>
                  <span className="text-red-400 font-medium">Defense API:</span>
                  <p className="text-slate-300 text-sm mt-1">{defenseError}</p>
                </div>
              )}
            </div>
            <div className="mt-8 space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
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
      className="flex flex-col overflow-hidden text-white"
      style={{
        height: '100dvh',
        // Reserve space for the persistent app BottomNav (shell-level) so the
        // pager/panels sit above it (border-box → padding shrinks inner height).
        paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom))',
        background: 'var(--bg)',
      }}
    >
      <OfflineStatusBanner />

      {/* Title row — back + title + "+" (new comparison). Single shared header
          for the whole compare screen; the mobile per-pane top bar was removed
          so this is the only header. */}
      <div
        className="flex-none border-b"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="mx-auto grid h-14 w-full max-w-[600px] grid-cols-[44px_1fr_44px] items-center px-2">
          <Link
            href="/"
            aria-label="Back to schedule"
            className="flex h-11 w-11 items-center justify-center rounded-lg touch-optimized active:opacity-60"
            style={{ color: 'var(--text)' }}
          >
            <ChevronLeft size={22} />
          </Link>
          <h1
            className="text-center font-black tracking-tight"
            style={{ fontSize: '18px', color: 'var(--text)' }}
          >
            Compare
          </h1>
          {/* Right spacer keeps the title centered — the "+" now lives on the
              tab row (far right) per the new create flow. */}
          <div />
        </div>
      </div>

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
          dragConstraints={{ left: -(comparisons.length - 1) * width, right: 0 }}
          dragElastic={0.12}
          onDragEnd={handleDragEnd}
        >
          {comparisons.map((c) => (
            <div
              key={c.id}
              className="shrink-0 h-full overflow-y-auto relative"
              style={{ width: width || '100%' }}
            >
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
                onTeamAChange={(t) => updateComparison(c.id, { teamA: t })}
                onTeamBChange={(t) => updateComparison(c.id, { teamB: t })}
                onOffenseMetricsChange={(m) => updateComparison(c.id, { settings: { offenseMetrics: m } })}
                onDefenseMetricsChange={(m) => updateComparison(c.id, { settings: { defenseMetrics: m } })}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Floating metrics button (desktop) — edits the ACTIVE comparison.
          Rendered at the workspace root so its fixed positioning isn't captured
          by the pager's transform. */}
      {!isMobile && (
        <FloatingMetricsButton
          selectedOffenseMetrics={activeComparison.settings.offenseMetrics}
          selectedDefenseMetrics={activeComparison.settings.defenseMetrics}
          onOffenseMetricsChange={handleActiveOffenseMetrics}
          onDefenseMetricsChange={handleActiveDefenseMetrics}
        />
      )}
    </div>
  );
}
