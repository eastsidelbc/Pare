/**
 * Mobile Compare Layout
 * 
 * Main mobile layout wrapper for comparison interface
 * LAYOUT: theScore compact structure
 * STYLE: Pare visual design (steel-blue gradient, purple accents)
 */

'use client';

import MobileTopBar from './MobileTopBar';
import MobileBottomBar from './MobileBottomBar';
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
}

export default function MobileCompareLayout({
  selectedTeamA,
  selectedTeamB,
  onTeamAChange,
  onTeamBChange,
  offenseData,
  defenseData,
  selectedOffenseMetrics,
  selectedDefenseMetrics,
  isLoading
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
  
  return (
    /* Root: full-viewport flex column. Top/bottom bars are flex siblings — no fixed positioning, no calc() hacks. */
    <div 
      className="flex flex-col text-white"
      style={{ height: '100dvh', background: 'var(--bg)' }}
    >
      {/* Top Bar — flex-none, sticks at top naturally */}
      <MobileTopBar teamA={selectedTeamA} teamB={selectedTeamB} />
      
      {/* Scrollable Content — flex-1 fills all remaining space between bars */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="px-3 py-3 space-y-3">
            <PanelSkeleton rows={offenseMetrics.length || 5} />
            <PanelSkeleton rows={defenseMetrics.length || 8} />
          </div>
        ) : (
          <div className="px-3 py-3 space-y-3">
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
        )}
      </div>
      
      {/* Bottom Bar — flex-none, sticks at bottom naturally */}
      <MobileBottomBar />
    </div>
  );
}

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

