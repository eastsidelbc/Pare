/**
 * Compact Comparison Row
 * 
 * Two-line layout: Data line (padded) + Bar line (edge-to-edge)
 * LAYOUT: theScore compact structure (~52px total height)
 * STYLE: Pare visual design (green/orange gradients, NO borders)
 * INTERACTION: Tap rank text (30th) to open dropdown
 */

'use client';

import { AVAILABLE_METRICS } from '@/lib/metricsConfig';
import { useRanking } from '@/lib/useRanking';
import { useBarCalculation } from '@/lib/useBarCalculation';
import { isAverageTeam, getTeamEmoji } from '@/utils/teamHelpers';
import type { TeamData } from '@/lib/useNflStats';
import CompactRankingDropdown from './CompactRankingDropdown';

interface CompactComparisonRowProps {
  metricField: string;
  teamA: string;
  teamB: string;
  teamAData: TeamData | null;
  teamBData: TeamData | null;
  allData: TeamData[];
  panelType: 'offense' | 'defense';
  displayMode: 'per-game' | 'total';
  activeDropdownTeam?: 'A' | 'B' | null;  // Which dropdown is open
  onTeamAChange?: (team: string) => void;  // Team change handler
  onTeamBChange?: (team: string) => void;  // Team change handler
  onDropdownToggle?: (team: 'A' | 'B') => void;  // Toggle dropdown
}

export default function CompactComparisonRow({
  metricField,
  teamA,
  teamB,
  teamAData,
  teamBData,
  allData,
  panelType,
  displayMode,
  activeDropdownTeam,
  onTeamAChange,
  onTeamBChange,
  onDropdownToggle
}: CompactComparisonRowProps) {
  
  const metricConfig = AVAILABLE_METRICS[metricField];
  
  if (!metricConfig || !teamAData || !teamBData) {
    return null;
  }
  
  // Get raw values (ensure string type)
  const teamAValue = String(teamAData[metricField] || '0');
  const teamBValue = String(teamBData[metricField] || '0');
  
  // Format values
  const formatValue = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    switch (metricConfig.format) {
      case 'percentage':
        return `${num.toFixed(1)}%`;
      case 'decimal':
        return num.toFixed(1);
      case 'time':
        return value; // Time format (MM:SS)
      case 'number':
      default:
        return num.toFixed(0);
    }
  };
  
  const formattedA = formatValue(teamAValue);
  const formattedB = formatValue(teamBValue);
  
  // Get rankings
  const teamARanking = useRanking(allData, metricField, teamA, {
    higherIsBetter: panelType === 'defense' ? !metricConfig.higherIsBetter : metricConfig.higherIsBetter,
    excludeSpecialTeams: true
  });
  
  const teamBRanking = useRanking(allData, metricField, teamB, {
    higherIsBetter: panelType === 'defense' ? !metricConfig.higherIsBetter : metricConfig.higherIsBetter,
    excludeSpecialTeams: true
  });
  
  // Calculate bar widths with amplification
  const { teamAPercentage, teamBPercentage } = useBarCalculation({
    teamAValue,
    teamBValue,
    teamARanking,
    teamBRanking,
    panelType,
    metricName: metricConfig.name
  });
  
  // Format ranking for display
  const formatRank = (rank: number | null): string => {
    if (!rank) return '';
    const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
    return `${rank}${suffix}`;
  };
  
  return (
    <div className="relative mb-2">
      
      {/* LINE 1: Data + Ranks + Metric Name (WITH PADDING) */}
      <div className="px-3 py-2 flex items-center justify-between">
        
        {/* Team A: Value + Rank Dropdown */}
        <div className="flex items-baseline gap-1">
          <span className="text-[15px] font-semibold text-white">
            {formattedA}
          </span>
          <CompactRankingDropdown
            allData={allData}
            metricKey={metricField}
            currentTeam={teamA}
            panelType={panelType}
            onTeamChange={onTeamAChange || (() => {})}
            isOpen={activeDropdownTeam === 'A'}
            onToggle={() => onDropdownToggle?.('A')}
            ranking={teamARanking ? { 
              rank: teamARanking.rank, 
              formattedRank: formatRank(teamARanking.rank),
              isTied: teamARanking.isTied
            } : null}
            position="left" // Team A on left → dropdown appears RIGHT
          />
        </div>
        
        {/* Center: Metric Name */}
        <div className="flex-1 text-center px-2">
          <span className="text-[13px] font-medium text-slate-300 uppercase tracking-wide">
            {metricConfig.name}
          </span>
        </div>
        
        {/* Team B: Rank Dropdown + Value */}
        <div className="flex items-baseline gap-1">
          <CompactRankingDropdown
            allData={allData}
            metricKey={metricField}
            currentTeam={teamB}
            panelType={panelType}
            onTeamChange={onTeamBChange || (() => {})}
            isOpen={activeDropdownTeam === 'B'}
            onToggle={() => onDropdownToggle?.('B')}
            ranking={teamBRanking ? { 
              rank: teamBRanking.rank, 
              formattedRank: formatRank(teamBRanking.rank),
              isTied: teamBRanking.isTied
            } : null}
            position="right" // Team B on right → dropdown appears LEFT
          />
          <span className="text-[15px] font-semibold text-white">
            {formattedB}
          </span>
        </div>
        
      </div>
      
      {/* LINE 2: Bars (NO PADDING - EDGE TO EDGE) */}
      <div className="h-[6px] flex">
        
        {/* Team A Bar - GREEN (Pare Style) */}
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ 
            width: `${teamAPercentage}%`,
            background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
          }}
        />
        
        {/* Team B Bar - ORANGE (Pare Style) */}
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ 
            width: `${teamBPercentage}%`,
            background: 'linear-gradient(90deg, #F97316 0%, #EA580C 100%)',
            boxShadow: '0 0 10px rgba(249, 115, 22, 0.3)'
          }}
        />
        
      </div>
      
    </div>
  );
}

