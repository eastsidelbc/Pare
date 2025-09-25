/**
 * Custom hook for memoized bar calculation with rank-based amplification
 * Extracts heavy mathematical operations from DynamicComparisonRow to improve performance
 */

'use client';

import { useMemo } from 'react';
import { RankingResult } from '@/lib/useRanking';

interface BarCalculationProps {
  teamAValue: string;
  teamBValue: string;
  teamARanking: RankingResult | null;
  teamBRanking: RankingResult | null;
  panelType: 'offense' | 'defense';
  metricName?: string;
}

interface BarCalculationResult {
  teamAPercentage: number;
  teamBPercentage: number;
  amplificationFactor: number;
  amplificationLevel: string;
  debugInfo: {
    teamANum: number;
    teamBNum: number;
    totalValue: number;
    rankGap: number;
    baseRatios: { teamA: number; teamB: number };
    amplifiedRatios: { teamA: number; teamB: number };
  };
}

/**
 * Custom hook that memoizes complex bar calculation logic
 * Includes rank-based amplification, defense panel logic, and visual proportions
 */
export function useBarCalculation({
  teamAValue,
  teamBValue,
  teamARanking,
  teamBRanking,
  panelType,
  metricName
}: BarCalculationProps): BarCalculationResult {

  return useMemo(() => {
    // Parse values once
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
    
    let teamAPercentage: number;
    let teamBPercentage: number;
    let amplificationFactor = 1.2; // Default
    let amplificationLevel = 'SUBTLE';
    
    if (totalValue > 0) {
      // 🔥 RANK-BASED DRAMATIC AMPLIFICATION: Like theScore app!
      const baseRatioA = teamANum / totalValue;
      const baseRatioB = teamBNum / totalValue;
      
      // 🏆 CALCULATE RANK-BASED AMPLIFICATION FACTOR
      const teamARank = teamARanking?.rank || 999;
      const teamBRank = teamBRanking?.rank || 999;
      const rankGap = Math.abs(teamARank - teamBRank);
      
      // 📊 Determine amplification factor based on rank gap
      if (rankGap >= 20) {
        amplificationFactor = 2.5; // EXTREME difference
        amplificationLevel = 'EXTREME';
      } else if (rankGap >= 15) {
        amplificationFactor = 2.2; // HUGE difference  
        amplificationLevel = 'HUGE';
      } else if (rankGap >= 10) {
        amplificationFactor = 1.8; // BIG difference
        amplificationLevel = 'BIG';
      } else if (rankGap >= 5) {
        amplificationFactor = 1.5; // MODERATE difference
        amplificationLevel = 'MODERATE';
      } else {
        amplificationFactor = 1.2; // SUBTLE difference
        amplificationLevel = 'SUBTLE';
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
      
      return {
        teamAPercentage,
        teamBPercentage,
        amplificationFactor,
        amplificationLevel,
        debugInfo: {
          teamANum,
          teamBNum,
          totalValue,
          rankGap,
          baseRatios: { teamA: baseRatioA, teamB: baseRatioB },
          amplifiedRatios: { teamA: amplifiedRatioA, teamB: amplifiedRatioB }
        }
      };
    } else {
      // Handle zero/invalid values
      teamAPercentage = availableWidth / 2;
      teamBPercentage = availableWidth / 2;
      
      return {
        teamAPercentage,
        teamBPercentage,
        amplificationFactor: 1.0,
        amplificationLevel: 'NONE',
        debugInfo: {
          teamANum,
          teamBNum,
          totalValue,
          rankGap: 0,
          baseRatios: { teamA: 0.5, teamB: 0.5 },
          amplifiedRatios: { teamA: 0.5, teamB: 0.5 }
        }
      };
    }
  }, [teamAValue, teamBValue, teamARanking, teamBRanking, panelType]);
}
