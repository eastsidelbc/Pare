/**
 * Mobile Compare Layout
 * 
 * Main mobile layout wrapper for comparison interface
 * LAYOUT: theScore compact structure
 * STYLE: Pare visual design (steel-blue gradient, purple accents)
 */

'use client';

import { memo } from 'react';
import CompactPanel from './CompactPanel';
import { DEFAULT_OFFENSE_METRICS, DEFAULT_DEFENSE_METRICS } from '@/lib/metricsConfig';
import type { TeamData } from '@/lib/useNflStats';

interface MobileCompareLayoutProps {
  selectedTeamA: string;
  selectedTeamB: string;
  onTeamAChange: (team: string) => void;
  onTeamBChange: (team: string) => void;
  offenseData: TeamData[];
  defenseData: TeamData[];
  selectedOffenseMetrics: string[];
  selectedDefenseMetrics: string[];
  onOffenseMetricsChange: (metrics: string[]) => void;
  onDefenseMetricsChange: (metrics: string[]) => void;
  isLoading?: boolean;
  /**
   * 'full' (default) = standalone viewport layout with top/bottom bars, used by
   * the Compare workspace. 'inline' = just the panels (no chrome, auto height)
   * for the Home accordion peek. Same compare UI either way — no duplication.
   */
  variant?: 'full' | 'inline';
}

function MobileCompareLayout({
  selectedTeamA,
  selectedTeamB,
  onTeamAChange,
  onTeamBChange,
  offenseData,
  defenseData,
  selectedOffenseMetrics,
  selectedDefenseMetrics,
  isLoading,
  variant = 'full',
}: MobileCompareLayoutProps) {
  
  // Use default 5 metrics if none selected
  const offenseMetrics = selectedOffenseMetrics.length > 0 
    ? selectedOffenseMetrics 
    : DEFAULT_OFFENSE_METRICS;
    
  const defenseMetrics = selectedDefenseMetrics.length > 0 
    ? selectedDefenseMetrics 
    : DEFAULT_DEFENSE_METRICS;
  
  // Find team data
  const teamAOffense = offenseData.find(t => t.team === selectedTeamA) || null;
  const teamBOffense = offenseData.find(t => t.team === selectedTeamB) || null;
  const teamADefense = defenseData.find(t => t.team === selectedTeamA) || null;
  const teamBDefense = defenseData.find(t => t.team === selectedTeamB) || null;

  // Shared body: skeleton while loading, else the two compact panels.
  const body = isLoading ? (
    <div
      className="px-3 py-3 space-y-3"
      style={{ paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)' }}
    >
      <PanelSkeleton rows={offenseMetrics.length || 5} />
      <PanelSkeleton rows={defenseMetrics.length || 8} />
    </div>
  ) : (
    <div
      className="px-3 py-3 space-y-3"
      style={{ paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)' }}
    >
      {/* Offense Panel */}
      <CompactPanel
        type="offense"
        teamA={selectedTeamA}
        teamB={selectedTeamB}
        teamAData={teamAOffense}
        teamBData={teamBOffense}
        selectedMetrics={offenseMetrics}
        allOffenseData={offenseData}
        allDefenseData={defenseData}
        onTeamAChange={onTeamAChange}
        onTeamBChange={onTeamBChange}
      />

      {/* Defense Panel */}
      <CompactPanel
        type="defense"
        teamA={selectedTeamA}
        teamB={selectedTeamB}
        teamAData={teamADefense}
        teamBData={teamBDefense}
        selectedMetrics={defenseMetrics}
        allOffenseData={offenseData}
        allDefenseData={defenseData}
        onTeamAChange={onTeamAChange}
        onTeamBChange={onTeamBChange}
      />
    </div>
  );

  // Inline (Home accordion peek): just the panels, no chrome, natural height.
  if (variant === 'inline') {
    return <div className="text-white" style={{ background: 'var(--bg)' }}>{body}</div>;
  }

  return (
    /* Root: fills its container (the workspace pager cell) as a flex column.
       The shared title row + tabs pill live at the workspace level now, so this
       is just the scrollable cards area. height:100% (not 100dvh) so it slots
       under the workspace header/tab bar. */
    <div
      className="flex flex-col text-white"
      style={{ height: '100%', background: 'var(--bg)' }}
    >
      {/* Scrollable Content — flex-1 fills remaining space. The persistent app
          BottomNav lives at the shell level now; the workspace root reserves its
          height so this content clears it.
          touch-action:pan-y lets the browser own vertical scroll; the pager's
          dragDirectionLock owns horizontal. overscroll:contain prevents any
          leftover scroll momentum from leaking to the document. */}
      <div
        className="flex-1 overflow-y-auto min-h-0"
        style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
      >
        {body}
      </div>
    </div>
  );
}

export default memo(MobileCompareLayout);

/** Skeleton mirroring a CompactPanel's header + rows to avoid layout shift. */
function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="h-[70px] px-3 grid grid-cols-[44px_1fr_44px] items-center gap-2">
        <div className="skeleton rounded-lg" style={{ width: 40, height: 40 }} />
        <div className="flex flex-col items-center gap-1.5">
          <div className="skeleton rounded" style={{ width: 56, height: 10 }} />
          <div className="skeleton rounded" style={{ width: 40, height: 8 }} />
        </div>
        <div className="skeleton justify-self-end rounded-lg" style={{ width: 40, height: 40 }} />
      </div>
      {/* Rows */}
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-3 py-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
              <div className="skeleton rounded" style={{ width: 44, height: 14 }} />
              <div className="skeleton mx-auto rounded" style={{ width: 60, height: 8 }} />
              <div className="skeleton justify-self-end rounded" style={{ width: 44, height: 14 }} />
            </div>
            <div className="skeleton mt-2 rounded-full" style={{ height: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

