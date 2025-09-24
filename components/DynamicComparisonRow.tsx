/**
 * Dynamic Comparison Row Component
 * 
 * Displays a comparison between two teams for any given metric.
 * Automatically handles formatting, ranking, and visual comparison bars.
 */

'use client';

import { AVAILABLE_METRICS, formatMetricValue } from '@/lib/metricsConfig';
import { TeamData } from '@/lib/useNflStats';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DynamicComparisonRowProps {
  metricKey: string;
  teamAData: TeamData;
  teamBData: TeamData;
  type: 'offense' | 'defense';
}

export default function DynamicComparisonRow({ 
  metricKey, 
  teamAData, 
  teamBData, 
  type 
}: DynamicComparisonRowProps) {
  const metric = AVAILABLE_METRICS[metricKey];
  
  if (!metric) {
    console.warn(`Unknown metric: ${metricKey}`);
    return null;
  }

  // Get values and ranks
  const teamAValue = String((teamAData as Record<string, unknown>)[metricKey] || '0');
  const teamBValue = String((teamBData as Record<string, unknown>)[metricKey] || '0');
  const teamARank = Number((teamAData as Record<string, unknown>)[`${metricKey}Rank`] || 999);
  const teamBRank = Number((teamBData as Record<string, unknown>)[`${metricKey}Rank`] || 999);

  // Format values for display
  const formattedTeamAValue = formatMetricValue(teamAValue, metric.format);
  const formattedTeamBValue = formatMetricValue(teamBValue, metric.format);

  // Determine which team is better based on the metric and type
  const isOffense = type === 'offense';
  const higherIsBetter = isOffense ? metric.higherIsBetter : !metric.higherIsBetter;
  
  const teamABetter = higherIsBetter 
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

  // Format rank display
  const formatRank = (rank: number): string => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    if (rank <= 32) return `${rank}th`;
    return 'N/A';
  };

  // Fixed colors: Left side = Green, Right side = Dark Blue
  const getTeamAColor = () => {
    return 'text-green-400'; // Always green for left side
  };

  const getTeamBColor = () => {
    return 'text-blue-400'; // Always dark blue for right side
  };

  const getTeamABarColor = () => {
    return 'bg-green-400'; // Always green bar for left side
  };

  const getTeamBBarColor = () => {
    return 'bg-blue-400'; // Always dark blue bar for right side
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
      className="py-4 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/40 shadow-xl shadow-black/40 mb-3 relative overflow-hidden"
    >
      {/* Sleek inner gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-800/10 via-transparent to-slate-800/10 pointer-events-none" />
      {/* Team Stats and Rankings */}
      <div className="flex justify-between items-center mb-4 px-4 relative z-10">
        {/* Team A Stats */}
        <div className="flex items-center gap-3">
          <div className={`font-semibold text-base ${getTeamAColor()}`}>
            {formattedTeamAValue}
          </div>
          <div className={`text-xs ${getTeamAColor()} opacity-60`}>
            ({formatRank(teamARank)})
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
            ({formatRank(teamBRank)})
          </div>
          <div className={`font-semibold text-base ${getTeamBColor()}`}>
            {formattedTeamBValue}
          </div>
        </div>
      </div>
      
      {/* Ultra-Sleek theScore Style Bars */}
      <div className="px-4 relative z-10">
        <div className="relative w-full h-5 bg-slate-800/90 rounded-full overflow-hidden shadow-inner shadow-black/60">
          {/* Team A Bar - Sleek green with rounded left edge */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${teamAPercentage}%` }}
            transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
            className="absolute left-0 top-0 h-full bg-green-500 rounded-l-full"
            style={{ 
              background: 'linear-gradient(90deg, #22c55e, #16a34a)'
            }}
          />
          
          {/* Center gap/separator - sharp edges where bars meet */}
          <div 
            className="absolute top-0 h-full w-0.5 bg-slate-900 z-10"
            style={{ left: `${teamAPercentage}%` }}
          />
          
          {/* Team B Bar - Sleek blue with rounded right edge */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${teamBPercentage}%` }}
            transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1], delay: 0.05 }}
            className="absolute right-0 top-0 h-full bg-blue-500 rounded-r-full"
            style={{ 
              background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
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
    </motion.div>
  );
}
