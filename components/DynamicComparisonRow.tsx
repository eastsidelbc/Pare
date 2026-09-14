/**
 * Dynamic Comparison Row Component
 * 
 * Displays a comparison between two teams for any given metric.
 * Automatically handles formatting, ranking, and visual comparison bars.
 */

'use client';

import { memo } from 'react';
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
}

function DynamicComparisonRow({ 
  metricKey, 
  teamAData, 
  teamBData, 
  type,
  allOffenseData,
  allDefenseData,
  panelType,
  onTeamAChange,
  onTeamBChange
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
  const teamAValue = String(teamAData?.[metricKey as keyof typeof teamAData] ?? '0');
  const teamBValue = String(teamBData?.[metricKey as keyof typeof teamBData] ?? '0');
  
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
    if (process.env.NODE_ENV !== 'production') console.warn(`Unknown metric: ${metricKey}`);
    return null;
  }

  // 🐛 DEBUGGING: Log new ranking system results (dev only)
  if (process.env.NODE_ENV !== 'production' && metricKey === 'points' && (
    (teamAData?.team === 'Pittsburgh Steelers' || teamAData?.team === 'Tampa Bay Buccaneers') ||
    (teamBData?.team === 'Pittsburgh Steelers' || teamBData?.team === 'Tampa Bay Buccaneers')
  )) {
    console.log(`🚀 [NEW-RANKING] ${metricKey} ranks for comparison:`);
    console.log(`   Team A (${teamAData?.team}): value=${teamAValue}, ranking=`, teamARanking);
    console.log(`   Team B (${teamBData?.team}): value=${teamBValue}, ranking=`, teamBRanking);
  }

  // Detect presence — intentionally-unpopulated metrics (e.g. defense
  // yards-allowed in 2026) render as "—" instead of a fake 0.
  const isPresent = (v: unknown): boolean =>
    v !== undefined && v !== null && String(v).trim() !== '';
  const hasA = isPresent(teamAData?.[metricKey as keyof typeof teamAData]);
  const hasB = isPresent(teamBData?.[metricKey as keyof typeof teamBData]);
  const barsVisible = hasA && hasB;

  // Format values for display
  const formattedTeamAValue = hasA ? formatMetricValue(teamAValue, metric.format) : '—';
  const formattedTeamBValue = hasB ? formatMetricValue(teamBValue, metric.format) : '—';

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

  return (
    <div className={getPanelClasses ? `py-2 mb-3 relative ${getPanelClasses()}` : fallbackPanelClasses}>
      {/* Removed heavy backdrop-blur, gradients, and motion for performance */}
      {/* Team Stats and Rankings */}
      <div className="flex justify-between items-center mb-2 px-4">
        {/* Team A Stats */}
        <div className="flex items-center gap-3">
          <div className={`font-semibold text-base ${getTeamAColor ? getTeamAColor() : 'text-green-400'}`}>
            {formattedTeamAValue}
          </div>
          {/* Interactive Ranking Dropdown for Team A (shows "Avg" badge when average selected) */}
          {onTeamAChange ? (
            <RankingDropdown
              allData={allData}
              metricKey={metricKey}
              currentTeam={teamAData?.team || ''}
              type={type}
              side="teamA"
              onTeamChange={onTeamAChange}
              className="ml-1"
            />
          ) : (
            <div className={`text-xs ${getTeamAColor ? getTeamAColor() : 'text-green-400'} opacity-60`}>
              ({teamARanking?.formattedRank || 'N/A'})
            </div>
          )}
        </div>
        
        {/* Metric Name (Center) */}
        <div className="text-center">
          <div className="text-slate-300 font-medium text-sm">
            {metric.name}
          </div>
        </div>
        
        {/* Team B Stats */}
        <div className="flex items-center gap-3">
          {/* Interactive Ranking Dropdown for Team B (shows "Avg" badge when average selected) */}
          {onTeamBChange ? (
            <RankingDropdown
              allData={allData}
              metricKey={metricKey}
              currentTeam={teamBData?.team || ''}
              type={type}
              side="teamB"
              onTeamChange={onTeamBChange}
              className="mr-1"
            />
          ) : (
            <div className={`text-xs ${getTeamBColor ? getTeamBColor() : 'text-orange-400'} opacity-60`}>
              ({teamBRanking?.formattedRank || 'N/A'})
            </div>
          )}
          <div className={`font-semibold text-base ${getTeamBColor ? getTeamBColor() : 'text-orange-400'}`}>
            {formattedTeamBValue}
          </div>
        </div>
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
          {/* Team A Bar - Fully rounded green pill (hidden when no live data) */}
          <div 
            className={`absolute left-0 top-0 h-full rounded-full ${theme?.animations ? 'transition-all duration-300 ease-out' : 'transition-all duration-300 ease-out'}`}
            style={{ 
              width: `${barsVisible ? teamAPercentage : 0}%`,
              background: getTeamAGradient ? getTeamAGradient() : 'linear-gradient(90deg, #22c55e, #16a34a)',
              willChange: 'width'
            }}
          />
          
          {/* Center gap/separator - invisible background match */}
          {barsVisible && (
            <div 
              className="absolute top-0 h-full w-0.5 bg-slate-800 z-10"
              style={{ left: `${teamAPercentage}%` }}
            />
          )}
          
          {/* Team B Bar - Fully rounded orange pill (hidden when no live data) */}
          <div 
            className={`absolute right-0 top-0 h-full rounded-full ${theme?.animations ? 'transition-all duration-300 ease-out' : 'transition-all duration-300 ease-out'}`}
            style={{ 
              width: `${barsVisible ? teamBPercentage : 0}%`,
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

export default memo(DynamicComparisonRow);
