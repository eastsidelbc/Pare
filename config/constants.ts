/**
 * Application Constants
 * Central registry for all magic numbers, strings, and configuration values
 */

export const APP_CONSTANTS = {
  // Cache configuration
  CACHE: {
    PRODUCTION_MAX_AGE: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
    DEBUG_MAX_AGE: 10 * 1000, // 10 seconds for debugging
    STALE_THRESHOLD: 24 * 60 * 60 * 1000, // 24 hours before cache is considered stale
  },

  // API endpoints
  API: {
    BASE_URL: '/api/nfl-2025',
    ENDPOINTS: {
      OFFENSE: '/api/nfl-2025/offense',
      DEFENSE: '/api/nfl-2025/defense',
      HEALTH: '/api/health',
    },
    PORT: 4000, // iOS development port
  },

  // Special team identifiers
  SPECIAL_TEAMS: ['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'] as const,

  // Time conversion
  TIME: {
    MS_TO_MINUTES: 1000 * 60,
    MS_TO_SECONDS: 1000,
  },
} as const;
