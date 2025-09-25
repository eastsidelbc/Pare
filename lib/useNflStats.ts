/**
 * Custom hook for fetching and managing NFL team statistics
 * 
 * Provides seamless integration between API endpoints and UI components
 * for the dual-section comparison interface.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { TeamStatsWithRanks } from './pfr';

// API Response structure
export interface NflApiResponse {
  season: number;
  type: 'offense' | 'defense';
  updatedAt: string;
  rankBasis: Record<string, 'asc' | 'desc'>;
  rows: TeamStatsWithRanks[];
  stale?: boolean;
  error?: string;
}

// UI-friendly team data structure (now dynamic!)
export interface TeamData {
  team: string;
  
  // Dynamic properties - any metric from PFR can be here
  [metricKey: string]: string | number;
}

// Hook return structure
export interface UseNflStatsReturn {
  // Data
  offenseData: TeamData[];
  defenseData: TeamData[];
  
  // Loading states
  isLoadingOffense: boolean;
  isLoadingDefense: boolean;
  isLoading: boolean;
  
  // Error states
  offenseError: string | null;
  defenseError: string | null;
  
  // Metadata
  lastUpdated: string | null;
  
  // Utility functions
  getTeamOffenseData: (teamName: string) => TeamData | null;
  getTeamDefenseData: (teamName: string) => TeamData | null;
  refreshData: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage NFL statistics for dual-section UI
 */
export function useNflStats(): UseNflStatsReturn {
  // State management
  const [offenseData, setOffenseData] = useState<TeamData[]>([]);
  const [defenseData, setDefenseData] = useState<TeamData[]>([]);
  const [isLoadingOffense, setIsLoadingOffense] = useState(true);
  const [isLoadingDefense, setIsLoadingDefense] = useState(true);
  const [offenseError, setOffenseError] = useState<string | null>(null);
  const [defenseError, setDefenseError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  /**
   * Transforms API response data to UI-friendly format
   * Now dynamically maps ALL available metrics from PFR!
   */
  const transformApiData = useCallback((apiData: NflApiResponse): TeamData[] => {
    return apiData.rows.map(team => {
      const transformedTeam: TeamData = {
        team: team.team,
      };
      
      // Dynamically map all available fields from the API response
      Object.keys(team).forEach(key => {
        if (key !== 'team' && key !== 'ranks') {
          // Store the raw value as string
          transformedTeam[key] = String(team[key] || '0');
          
          // Store the rank if available
          if (team.ranks && team.ranks[key] !== undefined) {
            transformedTeam[`${key}Rank`] = team.ranks[key];
            
            // 🐛 DEBUGGING: Log rank assignment for debug teams
            if ((team.team === 'Pittsburgh Steelers' || team.team === 'Tampa Bay Buccaneers') && key === 'points') {
              console.log(`🐛 [UI-TRANSFORM] ${team.team} - ${key}:`);
              console.log(`   Raw value: ${team[key]}`);
              console.log(`   Rank from API: ${team.ranks[key]}`);
              console.log(`   Assigned to UI as: ${transformedTeam[`${key}Rank`]}`);
            }
          }
        }
      });
      
      return transformedTeam;
    });
  }, []);

  /**
   * Fetches offense data from API
   */
  const fetchOffenseData = useCallback(async () => {
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`🏈 [HOOK-${requestId}] Fetching offense data...`);
    
    try {
      setIsLoadingOffense(true);
      setOffenseError(null);
      
      const response = await fetch('/api/nfl-2025/offense');
      
      console.log(`🏈 [HOOK-${requestId}] Response status: ${response.status}`, {
        ok: response.ok,
        headers: {
          'content-type': response.headers.get('content-type'),
          'x-cache': response.headers.get('x-cache'),
          'x-request-id': response.headers.get('x-request-id')
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🏈 [HOOK-${requestId}] API error response:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const apiData: NflApiResponse = await response.json();
      console.log(`🏈 [HOOK-${requestId}] API response:`, {
        type: apiData.type,
        season: apiData.season,
        updatedAt: apiData.updatedAt,
        teamsCount: apiData.rows?.length || 0,
        isStale: apiData.stale || false,
        error: apiData.error || null
      });
      
      const transformedData = transformApiData(apiData);
      
      setOffenseData(transformedData);
      setLastUpdated(apiData.updatedAt);
      
      console.log(`✅ [HOOK-${requestId}] Successfully loaded offense data for ${transformedData.length} teams`);
      
      if (apiData.stale) {
        console.warn(`⚠️ [HOOK-${requestId}] Data is stale: ${apiData.error}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch offense data';
      console.error(`❌ [HOOK-${requestId}] Error fetching offense data:`, {
        error: errorMessage,
        type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      setOffenseError(errorMessage);
    } finally {
      setIsLoadingOffense(false);
    }
  }, [transformApiData]);

  /**
   * Fetches defense data from API
   */
  const fetchDefenseData = useCallback(async () => {
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`🛡️ [HOOK-${requestId}] Fetching defense data...`);
    
    try {
      setIsLoadingDefense(true);
      setDefenseError(null);
      
      const response = await fetch('/api/nfl-2025/defense');
      
      console.log(`🛡️ [HOOK-${requestId}] Response status: ${response.status}`, {
        ok: response.ok,
        headers: {
          'content-type': response.headers.get('content-type'),
          'x-cache': response.headers.get('x-cache'),
          'x-request-id': response.headers.get('x-request-id')
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🛡️ [HOOK-${requestId}] API error response:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const apiData: NflApiResponse = await response.json();
      console.log(`🛡️ [HOOK-${requestId}] API response:`, {
        type: apiData.type,
        season: apiData.season,
        updatedAt: apiData.updatedAt,
        teamsCount: apiData.rows?.length || 0,
        isStale: apiData.stale || false,
        error: apiData.error || null
      });
      
      const transformedData = transformApiData(apiData);
      
      setDefenseData(transformedData);
      
      console.log(`✅ [HOOK-${requestId}] Successfully loaded defense data for ${transformedData.length} teams`);
      
      if (apiData.stale) {
        console.warn(`⚠️ [HOOK-${requestId}] Data is stale: ${apiData.error}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch defense data';
      console.error(`❌ [HOOK-${requestId}] Error fetching defense data:`, {
        error: errorMessage,
        type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      setDefenseError(errorMessage);
    } finally {
      setIsLoadingDefense(false);
    }
  }, [transformApiData]);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    await Promise.all([fetchOffenseData(), fetchDefenseData()]);
  }, [fetchOffenseData, fetchDefenseData]);

  /**
   * Get offense data for specific team
   */
  const getTeamOffenseData = useCallback((teamName: string): TeamData | null => {
    return offenseData.find(team => 
      team.team.toLowerCase().includes(teamName.toLowerCase())
    ) || null;
  }, [offenseData]);

  /**
   * Get defense data for specific team
   */
  const getTeamDefenseData = useCallback((teamName: string): TeamData | null => {
    return defenseData.find(team => 
      team.team.toLowerCase().includes(teamName.toLowerCase())
    ) || null;
  }, [defenseData]);

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Computed loading state
  const isLoading = isLoadingOffense || isLoadingDefense;

  return {
    // Data
    offenseData,
    defenseData,
    
    // Loading states
    isLoadingOffense,
    isLoadingDefense,
    isLoading,
    
    // Error states
    offenseError,
    defenseError,
    
    // Metadata
    lastUpdated,
    
    // Utility functions
    getTeamOffenseData,
    getTeamDefenseData,
    refreshData,
  };
}
