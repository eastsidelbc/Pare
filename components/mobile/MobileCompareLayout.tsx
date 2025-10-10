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
    <div 
      className="min-h-screen text-white"
      style={{
        // PARE STYLING: Steel-blue gradient background
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
      }}
    >
      {/* Fixed Top Bar - Pare Branded */}
      <MobileTopBar />
      
      {/* Scrollable Content */}
      <div 
        className="overflow-y-auto"
        style={{
          // Account for top bar (56px) and safe area
          paddingTop: 'calc(56px + env(safe-area-inset-top))',
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
          minHeight: '100dvh'
        }}
      >
        {isLoading ? (
          <div className="h-[600px] flex items-center justify-center">
            <div className="text-slate-400">Loading NFL data...</div>
          </div>
        ) : (
          <div className="space-y-2 px-3 py-2">
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
            
            {/* Panel Separator - PARE STYLE (purple accent) */}
            <div 
              className="h-px mx-4"
              style={{ background: 'rgba(139, 92, 246, 0.2)' }}
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
      
      {/* Fixed Bottom Bar - Pare Branded */}
      <MobileBottomBar />
    </div>
  );
}

