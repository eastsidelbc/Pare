/**
 * Application Constants
 * Central registry for all magic numbers, strings, and configuration values
 */

export const APP_CONSTANTS = {
  // Active NFL season year (single source of truth — don't scatter literals)
  SEASON: 2026,

  // Max number of open comparisons (tabs) in the Compare workspace (Vision v1).
  MAX_COMPARISONS: 8,

  // Cache configuration
  CACHE: {
    STALE_THRESHOLD: 24 * 60 * 60 * 1000, // 24 hours before cache is considered stale
    /** Next.js Data Cache / unstable_cache revalidation window (seconds) for the
     *  Compare team stats (offense totals + defense standings/yards-allowed).
     *  10 min = a finished game shows up in Compare within ~10 min. Kept cheap
     *  by FINAL_BOXSCORE_REVALIDATE_SECONDS below. The offense/defense route
     *  files hold a literal `revalidate = 600` — keep them in sync. */
    REVALIDATE_SECONDS: 600, // 10 minutes
    /** Box scores of FINISHED games barely change, so the yards-allowed
     *  aggregation re-downloads each one at most once a day (still catches the
     *  NFL's midweek stat corrections) instead of every refresh. */
    FINAL_BOXSCORE_REVALIDATE_SECONDS: 24 * 60 * 60, // 24 hours
    /** Shorter window (5 min) for the server-side scoreboard/schedule fetch
     *  (home page + /api/schedule). Standings are fully live (no-store). Keeps those fresh without hammering ESPN
     *  (team stats use REVALIDATE_SECONDS above). */
    LIVE_REVALIDATE_SECONDS: 300, // 5 minutes
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
