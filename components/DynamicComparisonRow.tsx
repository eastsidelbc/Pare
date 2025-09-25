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
}

export default function DynamicComparisonRow({ 
  metricKey, 
  teamAData, 
  teamBData, 
  type,
  allOffenseData,
  allDefenseData
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

  // Calculate proportional bar widths (theScore app style)
  const teamANum = parseFloat(teamAValue) || 0;
  const teamBNum = parseFloat(teamBValue) || 0;
  const totalValue = teamANum + teamBNum;
  
  // Calculate each team's percentage of the total with small gap for distinction
  const gapPercentage = 2; // 2% total gap (1% each side)
  const availableWidth = 100 - gapPercentage;
  
  const teamAPercentage = totalValue > 0 ? (teamANum / totalValue) * availableWidth : (availableWidth / 2);
  const teamBPercentage = totalValue > 0 ? (teamBNum / totalValue) * availableWidth : (availableWidth / 2);

  // 🗑️ OLD formatRank function removed - now using useRanking hook

  // Fixed colors: Left side = Green, Right side = Dark Blue
  const getTeamAColor = () => {
    return 'text-green-400'; // Always green for left side
  };

  const getTeamBColor = () => {
    return 'text-orange-400'; // Always orange text for right side
  };

  const getTeamABarColor = () => {
    return 'bg-green-400'; // Always green bar for left side
  };

  const getTeamBBarColor = () => {
    return 'bg-orange-500'; // Always orange bar for right side
  };

  return (
    <div className="py-4 bg-slate-900/90 rounded-xl border border-slate-700/50 shadow-lg mb-3 relative">
      {/* Removed heavy backdrop-blur, gradients, and motion for performance */}
      {/* Team Stats and Rankings */}
      <div className="flex justify-between items-center mb-4 px-4">
        {/* Team A Stats */}
        <div className="flex items-center gap-3">
          <div className={`font-semibold text-base ${getTeamAColor()}`}>
            {formattedTeamAValue}
          </div>
          <div className={`text-xs ${getTeamAColor()} opacity-60`}>
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
          <div className={`text-xs ${getTeamBColor()} opacity-60`}>
            ({teamBRanking?.formattedRank || 'N/A'})
          </div>
          <div className={`font-semibold text-base ${getTeamBColor()}`}>
            {formattedTeamBValue}
          </div>
        </div>
      </div>
      
      {/* Optimized theScore Style Bars */}
      <div className="px-4">
        <div className="relative w-full h-5 bg-slate-800 rounded-full overflow-hidden">
          {/* Team A Bar - Fully rounded green pill */}
          <div 
            className="absolute left-0 top-0 h-full bg-green-500 rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${teamAPercentage}%`,
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
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
            className="absolute right-0 top-0 h-full bg-orange-500 rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${teamBPercentage}%`,
              background: 'linear-gradient(90deg, #f97316, #ea580c)',
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
