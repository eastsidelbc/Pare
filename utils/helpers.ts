/**
 * Shared utility functions
 */

import { APP_CONSTANTS } from '@/config/constants';

/**
 * Generate a unique request ID for API calls
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Calculate cache age in minutes from timestamp
 */
export function getCacheAgeMinutes(timestamp: number): number {
  return Math.round((Date.now() - timestamp) / APP_CONSTANTS.TIME.MS_TO_MINUTES);
}

/**
 * Check if a team name is a special team (avg, total, etc.)
 */
export function isSpecialTeam(teamName: string): boolean {
  return (APP_CONSTANTS.SPECIAL_TEAMS as readonly string[]).includes(teamName);
}
