/**
 * Leans — every lean threshold, in ONE place (Leans DECISIONS §6; plan
 * docs/plans/2026-10-14-leans-tab.md "Lean engine"). Change a number here, never
 * in the engine (`scripts/leans-gates.mjs l3` fails on numeric literals elsewhere).
 *
 * Rule of the whole engine: a lean shows only when ALL THREE signals agree.
 * Fewer than `minGames` games → "Not enough games yet"; anything else → "No lean".
 */

import type { MatchupTier, RatingWindow } from '@/lib/myteam/types';

export const LEAN_CONFIG = {
  /** Fewer games played than this (player for props, either team for game lines) → not-enough. */
  minGames: 4,
  /** The "last N" window (games actually played; byes skipped). */
  lastN: 4,
  /** Checks per line (DECISIONS §6: all of them must agree). */
  signalCount: 3,

  prop: {
    /** OVER: over the line in ≥ this many of the last N. */
    lastOverMin: 3,
    /** UNDER: over the line in ≤ this many of the last N (i.e. under in ≥ 3 of 4). */
    lastOverMaxForUnder: 1,
    /** OVER: over in ≥ this share of this season's games. */
    seasonOverMin: 0.6,
    /** UNDER: over in ≤ this share of this season's games. */
    seasonOverMaxForUnder: 0.4,
    /** Matchup tiers that back each side (rating.ts TIER_CUTOFFS decide the tier). */
    overTiers: ['good', 'great'] as readonly MatchupTier[],
    underTiers: ['tough', 'avoid'] as readonly MatchupTier[],
    /** Which FPA window the prop's matchup signal reads. */
    tierWindow: 'season' as RatingWindow,
    /** "Anytime TD" is scored as over/under this line (1+ TD = over). */
    anytimeTdLine: 0.5,
    /** Hit dots shown on a prop card (most recent games). */
    dotsShown: 6,
  },

  total: {
    /** OVER: both offenses rank ≤ this in points per game, last N. */
    topN: 10,
    /** UNDER: both offenses rank in the bottom this-many. */
    bottomN: 10,
    /** Over (under) hit in ≥ this many of the last N for BOTH teams. */
    hitsMin: 3,
  },

  spread: {
    /** Last-N average point margin must favor the side by ≥ this many points. */
    marginGap: 8,
    /** Season point-differential rank must be ≥ this many places better. */
    rankGap: 10,
    /** The side would have covered today's line in ≥ this many of its last N … */
    coverMin: 3,
    /** … and the other side in ≤ this many of its last N. */
    otherCoverMax: 1,
  },

  moneyline: {
    /** The side won ≥ this many of its last N … */
    winMin: 3,
    /** … and the other side won ≤ this many of its last N. Margin + rank signals = spread's. */
    otherWinMax: 1,
  },

  /** Not lean thresholds — data plumbing sizes, kept here so the engine files stay literal-free. */
  data: {
    /** Prop-eligible players per team and position, by season PPR points (picker size). */
    playersPerTeam: { QB: 2, RB: 3, WR: 5, TE: 3 },
    /** Shared server bundle + client copy freshness (same window as Compare stats). */
    cacheTtlMs: 10 * 60 * 1000,
    /** Most teams one /api/leans/data request may ask for. */
    maxTeams: 32,
    /** Weeks shown in the player screen's week cells, counting the game week. */
    weekCells: 5,
  },
} as const;

export type LeanConfig = typeof LEAN_CONFIG;
