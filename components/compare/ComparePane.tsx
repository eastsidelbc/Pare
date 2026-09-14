/**
 * ComparePane — the reusable Compare UI for ONE comparison.
 *
 * Extracted verbatim from the old single-compare page so the workspace (and
 * later the Home accordion) can render it per comparison. It is purely
 * presentational: teams, metrics, data + change handlers all arrive as props.
 * NO data fetching, NO store access, NO ranking/bar math here — unchanged from
 * before, just parameterised.
 *
 * Fixed-position chrome (offline banner, floating metrics button) is rendered
 * by the parent workspace, NOT here, because a Framer Motion transform on the
 * pager track would otherwise capture `position: fixed` descendants.
 */

'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { TeamData } from '@/lib/useNflStats';
import MobileCompareLayout from '@/components/mobile/MobileCompareLayout';
import OffensePanel from '@/components/OffensePanel';
import DefensePanel from '@/components/DefensePanel';
import BlankComparePicker from '@/components/compare/BlankComparePicker';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export interface ComparePaneProps {
  isMobile: boolean;
  /** Inline (Home accordion) peek: render the compact panels only, no chrome.
   *  Same Compare UI as the full/tab view — this is the "one component, three
   *  places" from VISION.md, not a duplicate. */
  inline?: boolean;
  teamA: string;
  teamB: string;
  offenseData: TeamData[];
  defenseData: TeamData[];
  selectedOffenseMetrics: string[];
  selectedDefenseMetrics: string[];
  isLoading: boolean;
  isLoadingOffense: boolean;
  isLoadingDefense: boolean;
  onTeamAChange: (team: string) => void;
  onTeamBChange: (team: string) => void;
  onOffenseMetricsChange: (metrics: string[]) => void;
  onDefenseMetricsChange: (metrics: string[]) => void;
}

export default function ComparePane({
  isMobile,
  inline = false,
  teamA,
  teamB,
  offenseData,
  defenseData,
  selectedOffenseMetrics,
  selectedDefenseMetrics,
  isLoading,
  isLoadingOffense,
  isLoadingDefense,
  onTeamAChange,
  onTeamBChange,
  onOffenseMetricsChange,
  onDefenseMetricsChange,
}: ComparePaneProps) {
  // Blank comparison (created by the "+" on the tab row) → empty state with two
  // inline "Pick team" slots until both teams are chosen. (Never happens for the
  // Home accordion peek, which always seeds both teams from the matchup.)
  if (!inline && (!teamA || !teamB)) {
    return (
      <BlankComparePicker
        teamA={teamA}
        teamB={teamB}
        offenseData={offenseData}
        onTeamAChange={onTeamAChange}
        onTeamBChange={onTeamBChange}
      />
    );
  }

  if (inline) {
    // Compact peek for the Home accordion — reuses the mobile compare layout
    // (panels only) regardless of viewport.
    return (
      <MobileCompareLayout
        variant="inline"
        selectedTeamA={teamA}
        selectedTeamB={teamB}
        onTeamAChange={onTeamAChange}
        onTeamBChange={onTeamBChange}
        offenseData={offenseData}
        defenseData={defenseData}
        selectedOffenseMetrics={selectedOffenseMetrics}
        selectedDefenseMetrics={selectedDefenseMetrics}
        onOffenseMetricsChange={onOffenseMetricsChange}
        onDefenseMetricsChange={onDefenseMetricsChange}
        isLoading={isLoading}
      />
    );
  }

  if (isMobile) {
    return (
      <MobileCompareLayout
        selectedTeamA={teamA}
        selectedTeamB={teamB}
        onTeamAChange={onTeamAChange}
        onTeamBChange={onTeamBChange}
        offenseData={offenseData}
        defenseData={defenseData}
        selectedOffenseMetrics={selectedOffenseMetrics}
        selectedDefenseMetrics={selectedDefenseMetrics}
        onOffenseMetricsChange={onOffenseMetricsChange}
        onDefenseMetricsChange={onDefenseMetricsChange}
        isLoading={isLoading}
      />
    );
  }

  // ── Desktop layout (unchanged from the old page, minus fixed-position chrome) ──
  return (
    <div className="min-h-screen-dynamic w-full relative text-white px-4 sm:px-6 py-safe-top pb-safe-bottom pt-4">
      {/* Premium Steel-Blue Multi-Layer Gradient. `absolute` (not `fixed`) so it
          works inside the pager's transformed track and covers the full pane. */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#070d16] via-[#0b1120] to-[#1e293b]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#0b1120]/60 via-[#0f172a]/30 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#0f172a]/50 via-[#1e293b]/25 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,_var(--tw-gradient-stops))] from-[#1e293b]/40 via-transparent to-transparent"></div>
        <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]"></div>
      </div>
      <div className="max-w-6xl mx-auto">
        {/* Back to schedule */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
          >
            <ChevronLeft size={18} /> Schedule
          </Link>
        </div>
        {/* Comparison Panels - Protected by Error Boundaries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ErrorBoundary fallback={
            <div className="p-8 bg-slate-900/90 rounded-xl border border-red-500/30 text-center">
              <div className="text-red-400 text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-bold text-red-400">Offense Panel Error</h3>
              <p className="text-slate-400 mt-2">Unable to load offense comparison data</p>
            </div>
          }>
            <OffensePanel
              offenseData={offenseData}
              defenseData={defenseData}
              selectedTeamA={teamA}
              selectedTeamB={teamB}
              selectedMetrics={selectedOffenseMetrics}
              isLoading={isLoadingOffense}
              onTeamAChange={onTeamAChange}
              onTeamBChange={onTeamBChange}
            />
          </ErrorBoundary>

          <ErrorBoundary fallback={
            <div className="p-8 bg-slate-900/90 rounded-xl border border-red-500/30 text-center">
              <div className="text-red-400 text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-bold text-red-400">Defense Panel Error</h3>
              <p className="text-slate-400 mt-2">Unable to load defense comparison data</p>
            </div>
          }>
            <DefensePanel
              defenseData={defenseData}
              offenseData={offenseData}
              selectedTeamA={teamA}
              selectedTeamB={teamB}
              selectedMetrics={selectedDefenseMetrics}
              isLoading={isLoadingDefense}
              onTeamAChange={onTeamAChange}
              onTeamBChange={onTeamBChange}
            />
          </ErrorBoundary>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-800/50 mb-safe-bottom">
          <p className="text-slate-500 text-sm">Stay Locked</p>
        </div>
      </div>
    </div>
  );
}
