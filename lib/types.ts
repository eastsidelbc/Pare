/**
 * Shared NFL stat row shapes for the data layer.
 *
 * Single source of truth for the types the ESPN seam (lib/espnStats.ts), the API
 * routes, and the client hooks all speak. (Previously duplicated across the now-
 * removed lib/pfr.ts and lib/pfrCsv.ts.)
 */

/** One team's stat row: team name plus arbitrary stat fields (string values). */
export interface TeamStats {
  team: string;
  [key: string]: string;
}

/** A team stat row enriched with per-metric ranks (client ranking output shape). */
export interface TeamStatsWithRanks {
  team: string;
  ranks: Record<string, number>;
  [key: string]: string | Record<string, number>;
}

/** Standard result from a stats fetch: when it was updated, plus the rows. */
export interface ParseResult {
  updatedAt: string;
  rows: TeamStats[];
}
