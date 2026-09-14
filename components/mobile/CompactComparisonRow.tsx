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
  
  // Format ranking for display — correct ordinal (21st, 22nd, 23rd, not 21th)
  const formatRank = (rank: number | null): string => {
    if (!rank) return '';
    const lastTwo = rank % 100;
    const lastOne = rank % 10;
    let suffix = 'th';
    // 11, 12, 13 are exceptions — always "th"
    if (lastTwo < 11 || lastTwo > 13) {
      if (lastOne === 1) suffix = 'st';
      else if (lastOne === 2) suffix = 'nd';
      else if (lastOne === 3) suffix = 'rd';
    }
    return `${rank}${suffix}`;
  };
  
  return (
    <div className="relative">
      
      {/* LINE 1: Data + Ranks + Metric Name — 3-column grid, perfectly balanced */}
      <div className="px-3 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        
        {/* Team A: Value + Rank (left-aligned) */}
        <div className="flex items-baseline gap-1">
          <span className="text-[15px] font-semibold text-white tabular-nums">
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
            position="left"
          />
        </div>
        
        {/* Center: Metric Name — fixed-width, never stretches */}
        <div className="text-center px-1">
          <span className="uppercase whitespace-nowrap" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--subtext)' }}>
            {metricConfig.name}
          </span>
        </div>
        
        {/* Team B: Rank + Value (right-aligned) */}
        <div className="flex items-baseline gap-1 justify-end">
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
            position="right"
          />
          <span className="text-[15px] font-semibold text-white tabular-nums">
            {formattedB}
          </span>
        </div>
        
      </div>
      
      {/* LINE 2: Bars (NO PADDING - EDGE TO EDGE) */}
      <div className="h-[6px] flex">
        
        {/* Team A Bar — styleguide green */}
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ 
            width: `${teamAPercentage}%`,
            background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
          }}
        />
        
        {/* Team B Bar — styleguide fire/orange */}
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ 
            width: `${teamBPercentage}%`,
            background: 'linear-gradient(90deg, #ff6b35 0%, #ea580c 100%)'
          }}
        />
        
      </div>
      
    </div>
  );
}

