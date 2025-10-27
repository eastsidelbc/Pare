/**
 * Dynamic Comparison Row Component
 * 
 * Displays a comparison between two teams for any given metric.
 * Automatically handles formatting, ranking, and visual comparison bars.
 */

'use client';

import { AVAILABLE_METRICS, formatMetricValue } from '@/lib/metricsConfig';
import { TeamData } from '@/lib/useNflStats';
import { useRanking } from '@/lib/useRanking';
import { useTheme } from '@/lib/useTheme';
import { useBarCalculation } from '@/lib/useBarCalculation';
import RankingDropdown from './RankingDropdown';
// Removed Framer Motion for better scroll performance
// import { motion } from 'framer-motion';

interface DynamicComparisonRowProps {
  metricKey: string;
  teamAData: TeamData;
  teamBData: TeamData;
  type: 'offense' | 'defense';
  allOffenseData: TeamData[]; // For ranking calculations
  allDefenseData: TeamData[]; // For ranking calculations
  panelType: 'offense' | 'defense';
  onTeamAChange?: (teamName: string) => void; // NEW: Team A selection callback
  onTeamBChange?: (teamName: string) => void; // NEW: Team B selection callback
  swapVisual?: boolean; // Phase 3: flip visual columns only
}

export default function DynamicComparisonRow({ 
  metricKey, 
  teamAData, 
  teamBData, 
  type,
  allOffenseData,
  allDefenseData,
  panelType,
  onTeamAChange,
  onTeamBChange,
  swapVisual = false
}: DynamicComparisonRowProps) {
  // 🚀 PERFORMANCE: Move all hooks to top to fix React Hook violations
  const metric = AVAILABLE_METRICS[metricKey];
  
  // 🚀 NEW RANKING SYSTEM: Use client-side ranking instead of API ranks
  const isDefenseMetric = type === 'defense';
  const allData = isDefenseMetric ? allDefenseData : allOffenseData;
  const higherIsBetter = isDefenseMetric ? !metric?.higherIsBetter : metric?.higherIsBetter;
  
  // Always call hooks - use conditional values instead of conditional calls
  const teamARanking = useRanking(allData, metricKey, teamAData?.team || '', { 
    higherIsBetter,
    excludeSpecialTeams: true 
  });
  
  const teamBRanking = useRanking(allData, metricKey, teamBData?.team || '', { 
    higherIsBetter,
    excludeSpecialTeams: true 
  });

  // 🎨 THEME SYSTEM: Move to top to fix React Hook violations
  const {
    getTeamAColor,
    getTeamBColor,
    getTeamAGradient,
    getTeamBGradient,
    getPanelClasses,
    getBarContainerClasses,
    theme
  } = useTheme();

  // 🚀 PERFORMANCE: Use memoized bar calculation hook (moved to top to fix React Hook violations)
  // 🔒 TYPE SAFETY: Improved type-safe value extraction
  const aRaw = teamAData?.[metricKey as keyof typeof teamAData];
  const bRaw = teamBData?.[metricKey as keyof typeof teamBData];
  const aMissing = aRaw === undefined || aRaw === null;
  const bMissing = bRaw === undefined || bRaw === null;
  const teamAValue = String(aMissing ? '0' : aRaw);
  const teamBValue = String(bMissing ? '0' : bRaw);
  
  const barCalculation = useBarCalculation({
    teamAValue,
    teamBValue,
    teamARanking,
    teamBRanking,
    panelType,
    metricName: metric?.name
  });
  
  const { teamAPercentage, teamBPercentage, amplificationFactor, amplificationLevel } = barCalculation;

  // Early return for invalid data AFTER hooks
  if (!metric) {
    console.warn(`Unknown metric: ${metricKey}`);
    return null;
  }

  // 🐛 DEBUGGING: Log new ranking system results
  if (metricKey === 'points' && (
    (teamAData?.team === 'Pittsburgh Steelers' || teamAData?.team === 'Tampa Bay Buccaneers') ||
    (teamBData?.team === 'Pittsburgh Steelers' || teamBData?.team === 'Tampa Bay Buccaneers')
  )) {
    console.log(`🚀 [NEW-RANKING] ${metricKey} ranks for comparison:`);
    console.log(`   Team A (${teamAData?.team}): value=${teamAValue}, ranking=`, teamARanking);
    console.log(`   Team B (${teamBData?.team}): value=${teamBValue}, ranking=`, teamBRanking);
  }

  // Format values for display
  const formattedTeamAValue = aMissing ? '—' : formatMetricValue(teamAValue, metric.format);
  const formattedTeamBValue = bMissing ? '—' : formatMetricValue(teamBValue, metric.format);

  // teamABetter, teamBBetter, and higherIsBetterForComparison removed as they were unused
  
  // 📊 Debug: Show the rank-based amplification effect (development only for performance)
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔥 RANK-BASED BARS [${metric?.name}]:`, {
      ranks: `${teamARanking?.rank || 999} vs ${teamBRanking?.rank || 999} (gap: ${barCalculation.debugInfo.rankGap})`,
      amplification: `${amplificationFactor.toFixed(1)}x (${amplificationLevel})`,
      original: `${(barCalculation.debugInfo.baseRatios.teamA * 100).toFixed(1)}% vs ${(barCalculation.debugInfo.baseRatios.teamB * 100).toFixed(1)}%`,
      final: `${teamAPercentage.toFixed(1)}% vs ${teamBPercentage.toFixed(1)}%`,
      dramaticEffect: `${teamAPercentage > teamBPercentage ? '🟢 TEAM A DOMINANCE' : '🟠 TEAM B DOMINANCE'}`
    });
  }

  // 🔧 FALLBACK: Original styling if theme fails
  const fallbackPanelClasses = "py-2 bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg mb-3 relative";
  const fallbackBarClasses = "relative w-full h-5 bg-slate-800 rounded-full overflow-hidden";

  const rankPill = (rank?: number | null, colorClass?: string) => (
    <span className={`text-[10px] ${colorClass || ''} bg-slate-800/70 border border-slate-700/60 rounded-full px-1.5 py-0.5`}>#{rank ?? '—'}</span>
  );

  // Visual bar widths (flip sides if swapVisual)
  const leftWidth = swapVisual ? teamBPercentage : teamAPercentage;
  const rightWidth = swapVisual ? teamAPercentage : teamBPercentage;

  // Compose left/right blocks (flip values/controls visually only)
  const LeftBlock = () => (
    <div className="flex items-center gap-3">
      <div className={`font-semibold text-base font-mono ${getTeamAColor ? getTeamAColor() : 'text-green-400'}`}>
        {swapVisual ? formattedTeamBValue : formattedTeamAValue}
      </div>
      {onTeamAChange ? (
        <RankingDropdown
          allData={allData}
          metricKey={metricKey}
          currentTeam={(swapVisual ? teamBData?.team : teamAData?.team) || ''}
          type={type}
          side="teamA"
          onTeamChange={onTeamAChange}
          className="ml-1"
        />
      ) : (
        rankPill(swapVisual ? teamBRanking?.rank : teamARanking?.rank, getTeamAColor ? getTeamAColor() : 'text-green-400')
      )}
    </div>
  );

  const RightBlock = () => (
    <div className="flex items-center gap-3">
      {onTeamBChange ? (
        <RankingDropdown
          allData={allData}
          metricKey={metricKey}
          currentTeam={(swapVisual ? teamAData?.team : teamBData?.team) || ''}
          type={type}
          side="teamB"
          onTeamChange={onTeamBChange}
          className="mr-1"
        />
      ) : (
        rankPill(swapVisual ? teamARanking?.rank : teamBRanking?.rank, getTeamBColor ? getTeamBColor() : 'text-orange-400')
      )}
      <div className={`font-semibold text-base font-mono ${getTeamBColor ? getTeamBColor() : 'text-orange-400'}`}>
        {swapVisual ? formattedTeamAValue : formattedTeamBValue}
      </div>
    </div>
  );

  return (
    <div className={getPanelClasses ? `py-2 mb-3 relative ${getPanelClasses()}` : fallbackPanelClasses}>
      {/* Removed heavy backdrop-blur, gradients, and motion for performance */}
      {/* Team Stats and Rankings */}
      <div className="flex justify-between items-center mb-2 px-4">
        <LeftBlock />
        
        {/* Metric Name (Center) */}
        <div className="text-center">
          <div className="text-slate-300 font-medium text-sm">
            {metric.name}
          </div>
        </div>
        
        <RightBlock />
      </div>
      
      {/* Optimized theScore Style Bars */}
      <div className="px-4">
        <div 
          className={getBarContainerClasses ? getBarContainerClasses() : fallbackBarClasses}
          role="progressbar"
          aria-label={`${metric?.name || 'Metric'} comparison: ${teamAData?.team || 'Team A'} ${formattedTeamAValue} vs ${teamBData?.team || 'Team B'} ${formattedTeamBValue}`}
          aria-valuenow={teamAPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-describedby={`comparison-${metricKey}`}
        >
          {/* Team A Bar - Fully rounded green pill */}
          <div 
            className={`absolute left-0 top-0 h-full rounded-full ${theme?.animations ? 'transition-all duration-300 ease-out' : 'transition-all duration-300 ease-out'}`}
            style={{ 
              width: `${leftWidth}%`,
              background: getTeamAGradient ? getTeamAGradient() : 'linear-gradient(90deg, #22c55e, #16a34a)',
              willChange: 'width'
            }}
          />
          
          {/* Center gap/separator - invisible background match */}
          <div 
            className="absolute top-0 h-full w-0.5 bg-slate-800 z-10"
            style={{ left: `${leftWidth}%` }}
          />
          
          {/* Team B Bar - Fully rounded orange pill */}
          <div 
            className={`absolute right-0 top-0 h-full rounded-full ${theme?.animations ? 'transition-all duration-300 ease-out' : 'transition-all duration-300 ease-out'}`}
            style={{ 
              width: `${rightWidth}%`,
              background: getTeamBGradient ? getTeamBGradient() : 'linear-gradient(90deg, #f97316, #ea580c)',
              willChange: 'width'
            }}
          />
        </div>
      </div>

      {/* Hidden description for screen readers */}
      <div 
        id={`comparison-${metricKey}`}
        className="sr-only"
      >
        {teamAData?.team || 'Team A'} has {formattedTeamAValue} {metric?.name || 'metric'}, 
        ranked {teamARanking?.formattedRank || 'unranked'} out of {allData.length} teams. 
        {teamBData?.team || 'Team B'} has {formattedTeamBValue} {metric?.name || 'metric'}, 
        ranked {teamBRanking?.formattedRank || 'unranked'} out of {allData.length} teams.
        {teamAPercentage > teamBPercentage 
          ? `${teamAData?.team || 'Team A'} performs better in this metric.`
          : `${teamBData?.team || 'Team B'} performs better in this metric.`
        }
      </div>
      
    </div>
  );
}
