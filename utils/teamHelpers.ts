/**
 * Utility functions for identifying special team types
 * 
 * Supports the "Avg Tm/G" row from PFR CSV data that represents
 * league-wide per-game averages.
 */

/**
 * Checks if a team name represents the league average special row
 * 
 * @param teamName - The team name to check
 * @returns true if this is the average team row
 * 
 * @example
 * isAverageTeam('Avg Tm/G') // true
 * isAverageTeam('Buffalo Bills') // false
 */
export function isAverageTeam(teamName: string | undefined): boolean {
  if (!teamName) return false;
  
  // Handle various formats from PFR CSV
  return teamName === 'Avg Tm/G' || 
         teamName === 'Avg/TmG' || 
         teamName === 'Average team/G';
}

/**
 * Checks if a team is a special non-selectable team (excludes average)
 * These teams should never appear in any dropdown.
 * 
 * @param teamName - The team name to check
 * @returns true if this is a non-selectable special team
 * 
 * @example
 * isNonSelectableSpecialTeam('League Total') // true
 * isNonSelectableSpecialTeam('Avg Tm/G') // false (average IS selectable)
 */
export function isNonSelectableSpecialTeam(teamName: string | undefined): boolean {
  if (!teamName) return false;
  
  return teamName === 'Avg Team' || 
         teamName === 'League Total';
}

/**
 * Checks if team should be excluded from ranking calculations
 * All special teams (including average) should be excluded from rank computation.
 * 
 * @param teamName - The team name to check
 * @returns true if this team should not participate in rankings
 * 
 * @example
 * shouldExcludeFromRanking('Avg Tm/G') // true (no rank for average)
 * shouldExcludeFromRanking('League Total') // true
 * shouldExcludeFromRanking('Buffalo Bills') // false (real team, gets ranked)
 */
export function shouldExcludeFromRanking(teamName: string | undefined): boolean {
  if (!teamName) return false;
  
  return teamName === 'Avg Team' || 
         teamName === 'League Total' || 
         teamName === 'Avg Tm/G' || 
         teamName === 'Avg/TmG' || 
         teamName === 'Average team/G';
}

/**
 * Gets the display label for a team name
 * Returns a user-friendly label for special teams, or the original name.
 * 
 * @param teamName - The team name to format
 * @returns Formatted display label
 * 
 * @example
 * getTeamDisplayLabel('Avg Tm/G') // 'Avg (per game)'
 * getTeamDisplayLabel('Buffalo Bills') // 'Buffalo Bills'
 */
export function getTeamDisplayLabel(teamName: string): string {
  if (isAverageTeam(teamName)) {
    return 'Avg (per game)';
  }
  
  return teamName;
}

/**
 * Gets the emoji icon for a special team
 * 
 * @param teamName - The team name
 * @returns Emoji string or null for regular teams
 * 
 * @example
 * getTeamEmoji('Avg Tm/G') // '📊'
 * getTeamEmoji('Buffalo Bills') // null
 */
export function getTeamEmoji(teamName: string): string | null {
  if (isAverageTeam(teamName)) {
    return '📊';
  }
  
  return null;
}

