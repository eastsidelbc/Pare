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
// Removed Framer Motion for better scroll performance
// import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DynamicComparisonRowProps {
  metricKey: string;
  teamAData: TeamData;
  teamBData: TeamData;
  type: 'offense' | 'defense';
  allOffenseData: TeamData[]; // For ranking calculations
  allDefenseData: TeamData[]; // For ranking calculations
  panelType: 'offense' | 'defense';
}

export default function DynamicComparisonRow({ 
  metricKey, 
  teamAData, 
  teamBData, 
  type,
  allOffenseData,
  allDefenseData,
  panelType
}: DynamicComparisonRowProps) {
  const metric = AVAILABLE_METRICS[metricKey];
  
  if (!metric) {
    console.warn(`Unknown metric: ${metricKey}`);
    return null;
  }

  // Get values and ranks
  const teamAValue = String((teamAData as Record<string, unknown>)[metricKey] || '0');
  const teamBValue = String((teamBData as Record<string, unknown>)[metricKey] || '0');
  // 🚀 NEW RANKING SYSTEM: Use client-side ranking instead of API ranks
  const isDefenseMetric = type === 'defense';
  const allData = isDefenseMetric ? allDefenseData : allOffenseData;
  const higherIsBetter = isDefenseMetric ? !metric.higherIsBetter : metric.higherIsBetter;
  
  const teamARanking = useRanking(allData, metricKey, teamAData?.team, { 
    higherIsBetter,
    excludeSpecialTeams: true 
  });
  
  const teamBRanking = useRanking(allData, metricKey, teamBData?.team, { 
    higherIsBetter,
    excludeSpecialTeams: true 
  });

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
  const formattedTeamAValue = formatMetricValue(teamAValue, metric.format);
  const formattedTeamBValue = formatMetricValue(teamBValue, metric.format);

  // Determine which team is better based on the metric and type (for visual comparison)
  const isOffense = type === 'offense';
  const higherIsBetterForComparison = isOffense ? metric.higherIsBetter : !metric.higherIsBetter;
  
  const teamABetter = higherIsBetterForComparison 
    ? parseFloat(teamAValue) > parseFloat(teamBValue)
    : parseFloat(teamAValue) < parseFloat(teamBValue);
  
  const teamBBetter = !teamABetter && parseFloat(teamAValue) !== parseFloat(teamBValue);

  // Calculate proportional bar widths with STRONGER visual emphasis
  let teamANum = parseFloat(teamAValue) || 0;
  let teamBNum = parseFloat(teamBValue) || 0;
  
  // 🛡️ DEFENSE LOGIC: For defense panels, flip values so lower is better gets larger bars
  if (panelType === 'defense') {
    [teamANum, teamBNum] = [teamBNum, teamANum];
  }
  
  const totalValue = teamANum + teamBNum;
  
  // Calculate each team's percentage of the total with small gap for distinction
  const gapPercentage = 2; // 2% total gap (1% each side)
  const availableWidth = 100 - gapPercentage;
  
  let teamAPercentage, teamBPercentage;
  
  if (totalValue > 0) {
    // 🔥 RANK-BASED DRAMATIC AMPLIFICATION: Like theScore app!
    const baseRatioA = teamANum / totalValue;
    const baseRatioB = teamBNum / totalValue;
    
    // 🏆 CALCULATE RANK-BASED AMPLIFICATION FACTOR
    const teamARank = teamARanking?.rank || 999;
    const teamBRank = teamBRanking?.rank || 999;
    const rankGap = Math.abs(teamARank - teamBRank);
    
    // 📊 Determine amplification factor based on rank gap
    let amplificationFactor = 1.2; // Base factor for small gaps
    
    if (rankGap >= 20) {
      amplificationFactor = 2.5; // EXTREME difference
    } else if (rankGap >= 15) {
      amplificationFactor = 2.2; // HUGE difference  
    } else if (rankGap >= 10) {
      amplificationFactor = 1.8; // BIG difference
    } else if (rankGap >= 5) {
      amplificationFactor = 1.5; // MODERATE difference
    } else {
      amplificationFactor = 1.2; // SUBTLE difference
    }
    
    // 🎖️ ELITE vs POOR BONUS: If one team is Top 5 AND other is Bottom 10
    const teamAIsElite = teamARank <= 5;
    const teamBIsElite = teamBRank <= 5;
    const teamAIsPoor = teamARank >= 23; // Bottom 10 in 32-team league
    const teamBIsPoor = teamBRank >= 23;
    
    const eliteVsPoorBonus = (teamAIsElite && teamBIsPoor) || (teamBIsElite && teamAIsPoor) ? 0.5 : 0;
    amplificationFactor += eliteVsPoorBonus;
    
    // Apply exponential scaling with dynamic amplification
    const amplifiedRatioA = Math.pow(baseRatioA, amplificationFactor);
    const amplifiedRatioB = Math.pow(baseRatioB, amplificationFactor);
    const amplifiedTotal = amplifiedRatioA + amplifiedRatioB;
    
    // Normalize back to 100% and apply to available width
    teamAPercentage = (amplifiedRatioA / amplifiedTotal) * availableWidth;
    teamBPercentage = (amplifiedRatioB / amplifiedTotal) * availableWidth;
    
    // 📊 Debug: Show the rank-based amplification effect
    const amplificationLevel = rankGap >= 20 ? 'EXTREME' : 
                              rankGap >= 15 ? 'HUGE' : 
                              rankGap >= 10 ? 'BIG' : 
                              rankGap >= 5 ? 'MODERATE' : 'SUBTLE';
    
    console.log(`🔥 RANK-BASED BARS [${metric?.name}]:`, {
      ranks: `${teamARank} vs ${teamBRank} (gap: ${rankGap})`,
      amplification: `${amplificationFactor.toFixed(1)}x (${amplificationLevel})`,
      eliteBonus: eliteVsPoorBonus > 0 ? '🎖️ ELITE vs POOR BONUS!' : '',
      original: `${(baseRatioA * 100).toFixed(1)}% vs ${(baseRatioB * 100).toFixed(1)}%`,
      final: `${teamAPercentage.toFixed(1)}% vs ${teamBPercentage.toFixed(1)}%`,
      dramaticEffect: `${teamAPercentage > teamBPercentage ? '🟢 TEAM A DOMINANCE' : '🟠 TEAM B DOMINANCE'}`
    });
  } else {
    // Fallback for zero totals
    teamAPercentage = availableWidth / 2;
    teamBPercentage = availableWidth / 2;
  }

  // 🎨 THEME SYSTEM: Dynamic colors with fallback to original styling
  const {
    getTeamAColor,
    getTeamBColor,
    getTeamABarColor,
    getTeamBBarColor,
    getTeamAGradient,
    getTeamBGradient,
    getPanelClasses,
    getBarContainerClasses,
    theme
  } = useTheme();

  // 🔧 FALLBACK: Original styling if theme fails
  const fallbackPanelClasses = "py-4 bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg mb-3 relative";
  const fallbackBarClasses = "relative w-full h-5 bg-slate-800 rounded-full overflow-hidden";

  return (
    <div className={getPanelClasses ? `py-4 mb-3 relative ${getPanelClasses()}` : fallbackPanelClasses}>
      {/* Removed heavy backdrop-blur, gradients, and motion for performance */}
      {/* Team Stats and Rankings */}
      <div className="flex justify-between items-center mb-4 px-4">
        {/* Team A Stats */}
        <div className="flex items-center gap-3">
              <div className={`font-semibold text-base ${getTeamAColor ? getTeamAColor() : 'text-green-400'}`}>
            {formattedTeamAValue}
          </div>
              <div className={`text-xs ${getTeamAColor ? getTeamAColor() : 'text-green-400'} opacity-60`}>
            ({teamARanking?.formattedRank || 'N/A'})
          </div>
        </div>
        
        {/* Metric Name (Center) */}
        <div className="text-center">
          <div className="text-slate-300 font-medium text-sm">
            {metric.name}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            ({metric.field})
          </div>
        </div>
        
        {/* Team B Stats */}
        <div className="flex items-center gap-3">
              <div className={`text-xs ${getTeamBColor ? getTeamBColor() : 'text-orange-400'} opacity-60`}>
            ({teamBRanking?.formattedRank || 'N/A'})
          </div>
              <div className={`font-semibold text-base ${getTeamBColor ? getTeamBColor() : 'text-orange-400'}`}>
            {formattedTeamBValue}
          </div>
        </div>
      </div>
      
      {/* Optimized theScore Style Bars */}
      <div className="px-4">
        <div className={getBarContainerClasses ? getBarContainerClasses() : fallbackBarClasses}>
          {/* Team A Bar - Fully rounded green pill */}
          <div 
            className={`absolute left-0 top-0 h-full rounded-full ${theme?.animations ? 'transition-all duration-300 ease-out' : 'transition-all duration-300 ease-out'}`}
            style={{ 
              width: `${teamAPercentage}%`,
              background: getTeamAGradient ? getTeamAGradient() : 'linear-gradient(90deg, #22c55e, #16a34a)',
              willChange: 'width'
            }}
          />
          
          {/* Center gap/separator - invisible background match */}
          <div 
            className="absolute top-0 h-full w-0.5 bg-slate-800 z-10"
            style={{ left: `${teamAPercentage}%` }}
          />
          
          {/* Team B Bar - Fully rounded orange pill */}
          <div 
            className={`absolute right-0 top-0 h-full rounded-full ${theme?.animations ? 'transition-all duration-300 ease-out' : 'transition-all duration-300 ease-out'}`}
            style={{ 
              width: `${teamBPercentage}%`,
              background: getTeamBGradient ? getTeamBGradient() : 'linear-gradient(90deg, #f97316, #ea580c)',
              willChange: 'width'
            }}
          />
        </div>
      </div>
      
      {/* Optional: Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-slate-500 mt-3 text-center px-6 opacity-60">
          {teamANum} + {teamBNum} = {totalValue} | {teamAPercentage.toFixed(1)}% + {teamBPercentage.toFixed(1)}% + {gapPercentage}% gap = {(teamAPercentage + teamBPercentage + gapPercentage).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
