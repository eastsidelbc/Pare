/**
 * Consolidated Team Data Transformation Utilities
 * 
 * Eliminates duplication between useNflStats and useDisplayMode transformations
 */

import { NflApiResponse, TeamData } from '@/lib/useNflStats';

export type DisplayMode = 'per-game' | 'total';

/**
 * Transform API response data to UI-friendly format
 * Consolidates logic from useNflStats.transformApiData
 */
export function transformApiResponseToTeamData(apiData: NflApiResponse): TeamData[] {
  return apiData.rows.map(team => {
    const transformedTeam: TeamData = {
      team: team.team,
    };
    
    // Dynamically map all available metrics from PFR
    Object.keys(team).forEach(key => {
      if (key !== 'team' && key !== 'ranks') {
        // Convert to appropriate type (string or number)
        const value = team[key];
        transformedTeam[key] = typeof value === 'string' || typeof value === 'number' ? value : String(value);
      }
    });
    
    return transformedTeam;
  });
}

/**
 * Transform team data based on display mode (per-game vs total)
 * Consolidates logic from useDisplayMode.transformTeamData
 */
export function transformTeamDataByMode(
  teamData: TeamData | null, 
  mode: DisplayMode
): TeamData | null {
  if (!teamData) return null;
  if (mode === 'total') return teamData; // No transformation needed for total mode
  
  // Per-game transformation
  const games = parseFloat(String(teamData.g)) || 1; // Games played, default to 1 to avoid division by zero
  
  const transformedData: TeamData = { ...teamData };
  
  // Convert specific metrics to per-game values
  Object.keys(teamData).forEach(key => {
    if (shouldConvertFieldToPerGame(key, teamData[key])) {
      const numericValue = parseFloat(String(teamData[key])) || 0;
      transformedData[key] = (numericValue / games).toFixed(1);
    }
  });
  
  return transformedData;
}

/**
 * Transform array of team data by display mode
 */
export function transformAllTeamDataByMode(
  allData: TeamData[], 
  mode: DisplayMode
): TeamData[] {
  return allData
    .map(teamData => transformTeamDataByMode(teamData, mode))
    .filter(Boolean) as TeamData[];
}

/**
 * Combined transformation: API response → UI format → display mode
 */
export function transformApiResponseWithMode(
  apiData: NflApiResponse,
  mode: DisplayMode
): TeamData[] {
  const teamData = transformApiResponseToTeamData(apiData);
  return transformAllTeamDataByMode(teamData, mode);
}

/**
 * Check if a field should be converted for per-game calculation
 * Consolidates logic from useDisplayMode.shouldConvertField
 */
function shouldConvertFieldToPerGame(key: string, value: unknown): boolean {
  // Skip non-numeric values
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  if (isNaN(parseFloat(String(value)))) return false;
  
  // Skip these fields (rates, percentages, per-attempt stats)
  const skipFields = [
    'g',                    // Games (don't divide games by games!)
    'rk',                   // Rank
    'team',                 // Team name
    'third_down_pct',       // Already a percentage
    'score_pct',            // Already a percentage  
    'turnover_pct',         // Already a percentage
    'pass_net_yds_per_att', // Already per-attempt
    'yds_per_play_offense', // Already per-play
    'rush_yds_per_att',     // Already per-attempt
    'pass_yds_per_att',     // Already per-attempt
  ];
  
  // Skip percentage fields (containing 'pct')
  if (key.includes('pct') || key.includes('per')) return false;
  
  // Skip if in skip list
  if (skipFields.includes(key)) return false;
  
  // Convert counting stats (points, yards, attempts, etc.)
  return true;
}
