/**
 * Client-side ranking system for NFL metrics
 * 
 * This hook provides real-time ranking calculations for any metric,
 * with proper tie handling and league-wide context.
 * 
 * Completely independent of API ranking logic - uses raw data only.
 */

'use client';

import { useMemo } from 'react';

export interface RankingResult {
  rank: number;
  formattedRank: string; // "T-12th", "1st", etc.
  isTied: boolean;
  totalTeams: number;
  teamsWithSameValue: number;
}

export interface RankingOptions {
  higherIsBetter?: boolean; // true for offense stats, false for defense stats
  excludeSpecialTeams?: boolean; // exclude "Avg Team", "League Total", etc.
}

/**
 * Calculate rankings for a specific metric across all NFL teams
 */
export function useRanking(
  allData: any[], 
  metricKey: string, 
  targetTeamName: string,
  options: RankingOptions = {}
): RankingResult | null {
  
  return useMemo(() => {
    if (!allData || allData.length === 0 || !metricKey || !targetTeamName) {
      return null;
    }

    console.log(`🏆 [USE-RANKING] Computing rank for ${targetTeamName} - ${metricKey}`);

    // Filter out special teams if requested
    const { higherIsBetter = true, excludeSpecialTeams = true } = options;
    
    let filteredData = allData;
    if (excludeSpecialTeams) {
      filteredData = allData.filter(team => 
        !['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'].includes(team.team)
      );
    }

    console.log(`🏆 [USE-RANKING] Filtered data: ${filteredData.length} teams`);

    // Get the target team's value
    const targetTeam = filteredData.find(team => team.team === targetTeamName);
    if (!targetTeam) {
      console.log(`🏆 [USE-RANKING] Target team not found: ${targetTeamName}`);
      return null;
    }

    // Get numeric value for the metric
    const targetValue = parseFloat(targetTeam[metricKey] || '0');
    if (isNaN(targetValue)) {
      console.log(`🏆 [USE-RANKING] Invalid metric value for ${targetTeamName}: ${targetTeam[metricKey]}`);
      return null;
    }

    console.log(`🏆 [USE-RANKING] Target value: ${targetValue}`);

    // Count teams with better values
    let betterTeamsCount = 0;
    let teamsWithSameValue = 0;

    filteredData.forEach(team => {
      const teamValue = parseFloat(team[metricKey] || '0');
      if (isNaN(teamValue)) return;

      if (teamValue === targetValue) {
        teamsWithSameValue++;
      } else if (higherIsBetter && teamValue > targetValue) {
        betterTeamsCount++;
      } else if (!higherIsBetter && teamValue < targetValue) {
        betterTeamsCount++;
      }
    });

    // Calculate rank: number of better teams + 1
    const rank = betterTeamsCount + 1;
    const isTied = teamsWithSameValue > 1;

    console.log(`🏆 [USE-RANKING] Results:`, {
      betterTeamsCount,
      rank,
      isTied,
      teamsWithSameValue,
      higherIsBetter
    });

    // Format rank with tie prefix if needed
    const formatRank = (rankNum: number, tied: boolean): string => {
      const prefix = tied ? 'T-' : '';
      
      if (rankNum === 1) return `${prefix}1st`;
      if (rankNum === 2) return `${prefix}2nd`;
      if (rankNum === 3) return `${prefix}3rd`;
      return `${prefix}${rankNum}th`;
    };

    const formattedRank = formatRank(rank, isTied);

    return {
      rank,
      formattedRank,
      isTied,
      totalTeams: filteredData.length,
      teamsWithSameValue
    };

  }, [allData, metricKey, targetTeamName, options.higherIsBetter, options.excludeSpecialTeams]);
}

/**
 * Bulk ranking function for getting ranks of multiple teams at once
 * Note: This is a utility function, not a hook
 */
export function calculateBulkRanking(
  allData: any[],
  metricKey: string,
  teamNames: string[],
  options: RankingOptions = {}
): Record<string, RankingResult | null> {
  const results: Record<string, RankingResult | null> = {};
  
  if (!allData || allData.length === 0 || !metricKey) {
    return results;
  }

  const { higherIsBetter = true, excludeSpecialTeams = true } = options;
  
  let filteredData = allData;
  if (excludeSpecialTeams) {
    filteredData = allData.filter(team => 
      !['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'].includes(team.team)
    );
  }

  teamNames.forEach(teamName => {
    const targetTeam = filteredData.find(team => team.team === teamName);
    if (!targetTeam) {
      results[teamName] = null;
      return;
    }

    const targetValue = parseFloat(targetTeam[metricKey] || '0');
    if (isNaN(targetValue)) {
      results[teamName] = null;
      return;
    }

    let betterTeamsCount = 0;
    let teamsWithSameValue = 0;

    filteredData.forEach(team => {
      const teamValue = parseFloat(team[metricKey] || '0');
      if (isNaN(teamValue)) return;

      if (teamValue === targetValue) {
        teamsWithSameValue++;
      } else if (higherIsBetter && teamValue > targetValue) {
        betterTeamsCount++;
      } else if (!higherIsBetter && teamValue < targetValue) {
        betterTeamsCount++;
      }
    });

    const rank = betterTeamsCount + 1;
    const isTied = teamsWithSameValue > 1;

    const formatRank = (rankNum: number, tied: boolean): string => {
      const prefix = tied ? 'T-' : '';
      
      if (rankNum === 1) return `${prefix}1st`;
      if (rankNum === 2) return `${prefix}2nd`;
      if (rankNum === 3) return `${prefix}3rd`;
      return `${prefix}${rankNum}th`;
    };

    results[teamName] = {
      rank,
      formattedRank: formatRank(rank, isTied),
      isTied,
      totalTeams: filteredData.length,
      teamsWithSameValue
    };
  });
  
  return results;
}

/**
 * Get league-wide ranking statistics for a metric
 */
export function useMetricStats(
  allData: any[],
  metricKey: string,
  options: RankingOptions = {}
): {
  min: number;
  max: number;
  average: number;
  median: number;
  totalTeams: number;
} | null {
  
  return useMemo(() => {
    if (!allData || allData.length === 0 || !metricKey) {
      return null;
    }

    const { excludeSpecialTeams = true } = options;
    
    let filteredData = allData;
    if (excludeSpecialTeams) {
      filteredData = allData.filter(team => 
        !['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'].includes(team.team)
      );
    }

    const values = filteredData
      .map(team => parseFloat(team[metricKey] || '0'))
      .filter(val => !isNaN(val))
      .sort((a, b) => a - b);

    if (values.length === 0) return null;

    const min = values[0];
    const max = values[values.length - 1];
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = values.length % 2 === 0 
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];

    return {
      min,
      max,
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      totalTeams: values.length
    };

  }, [allData, metricKey, options.excludeSpecialTeams]);
}
