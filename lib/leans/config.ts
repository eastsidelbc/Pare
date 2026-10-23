/**
 * Leans — every lean threshold, in ONE place (Leans DECISIONS §6; plan
 * docs/plans/2026-10-14-leans-tab.md "Lean engine"). Change a number here, never
 * in the engine (`scripts/leans-gates.mjs l3` fails on numeric literals elsewhere).
 *
 * Rule of the whole engine: a lean shows only when ALL THREE signals agree.
 * Fewer than `minGames` games → "Not enough games yet"; anything else → "No lean".
 */

import type { MatchupTier, RatingWindow } from '@/lib/myteam/types';
import type { FrozenParams, ShipTable } from './combine';

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

  /**
   * Prop engine v2 (plan docs/plans/pasted-content-id-fcbb-the-prop-deep-crescent.md, A1–A4):
   * data sizes + signal plumbing. Which rule each market runs (and its thresholds) lives in
   * `propV2.markets`, frozen from the 2024 tune before the one 2025 grade.
   */
  propV2: {
    /** Halves (rank centring, implied team total = total / 2 ± spread / 2). */
    half: 0.5,
    /** Teams in the league (rank → −1…+1 scale). */
    teams: 32,
    /** Role slots per position, ranked by share going into the week (RBs by touches). */
    roleSlots: { WR: 3, TE: 1, RB: 2 } as const,
    /** Share shrink: games of 0% blended in, so a 1-game 30% share doesn't outrank a 6-game 25%. */
    roleShrinkGames: 1,
    /** "This defense vs WR1s": its last N games, and at least this many to show / vote. */
    roleLastN: 6,
    roleMinCells: 4,
    /** Recent window for usage / snap trends and the projection blend. */
    recentGames: 3,
    /** "Vs defenses like this": at least this many of his games against that bucket. */
    similarMinGames: 3,
    /** Allowance rank buckets (#1 = allows the least): ≤ stingy, ≥ generous, between = mid. */
    bucket: { stingyMaxRank: 10, generousMinRank: 23 },
    /** A defense / team needs this many games before its allowance or volume counts. */
    minTeamGames: 2,
    /** Player rates (catch %, yds / target, yds / carry) shrink toward his position's league rate. */
    rateShrinkGames: 4,
    /** Team volume (targets, carries per game) shrinks toward the league. */
    volumeShrinkGames: 2,
    /** Projection share = season share × w + last-N share × (1 − w). */
    seasonShareWeight: 0.5,
    /**
     * Yardage spread as a share of the projected mean (σ = cv × μ): median week-to-week CV of
     * 2024 players with 8+ games averaging 20+ yds (measured on 2024 only — 2025 stays held out).
     */
    cv: { rec_yd: 0.7, rush_yd: 0.64, rush_rec_yd: 0.56 },
    /** A lean needs at least this many signals with data. */
    minSignals: 6,
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

/*
 * Prop engine v2 — FROZEN rules. Written by `scripts/leans-backtest-v2.ts --tune 2024` (2024
 * only) and committed BEFORE the one `--grade 2025`; never hand-edited. Pre-registration:
 * docs/plans/2026-10-23-prop-engine-v2/preregistration.md.
 */
// <prop-v2-frozen>
export const PROP_V2_FROZEN: FrozenParams = {
  "kofn": {
    "rec:WR:over": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.2,
        "medianEdge": 0.1,
        "projEdge": 0.15,
        "usageTrend": 0.3,
        "snapTrend": 0.05,
        "impliedTotal": 1.5,
        "oppAllow": 0.65,
        "oppEff": 0.35,
        "defVsRole": 0.33,
        "similarDef": 0.25,
        "passRate": 0.65,
        "spreadScript": 6,
        "fpaTier": 0.65
      },
      "k": 0.4,
      "veto": false
    },
    "rec:WR:under": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 2,
        "seasonHit": 0.1,
        "medianEdge": 0.1,
        "projEdge": 0.05,
        "usageTrend": 0.3,
        "snapTrend": 0.1,
        "impliedTotal": 3,
        "oppAllow": 0.35,
        "oppEff": 0.65,
        "defVsRole": 0.17,
        "similarDef": 0.17,
        "passRate": 0.5,
        "spreadScript": 3,
        "fpaTier": 0.35
      },
      "k": 0.5,
      "veto": false
    },
    "rec:TE:over": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.05,
        "medianEdge": 0.1,
        "projEdge": 0.05,
        "usageTrend": 0.1,
        "snapTrend": 0.05,
        "impliedTotal": 1.5,
        "oppAllow": 0.5,
        "oppEff": 0.65,
        "passRate": 0.65,
        "spreadScript": 3,
        "fpaTier": 0.65
      },
      "k": 0.3,
      "veto": false
    },
    "rec:TE:under": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.15,
        "medianEdge": 0.1,
        "projEdge": 0.1,
        "usageTrend": 0.1,
        "impliedTotal": 1.5,
        "oppAllow": 0.35,
        "oppEff": 0.65,
        "similarDef": 0.17,
        "passRate": 0.5,
        "spreadScript": 3,
        "fpaTier": 0.65
      },
      "k": 0.5,
      "veto": false
    },
    "rec:RB:over": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.15,
        "medianEdge": 0.15,
        "projEdge": 0.08,
        "usageTrend": 0.1,
        "snapTrend": 0.05,
        "impliedTotal": 1.5,
        "oppAllow": 0.65,
        "oppEff": 0.5,
        "passRate": 0.65,
        "spreadScript": 3,
        "fpaTier": 0.35
      },
      "k": 0.4,
      "veto": false
    },
    "rec:RB:under": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.2,
        "medianEdge": 0.05,
        "projEdge": 0.15,
        "usageTrend": 0.1,
        "snapTrend": 0.05,
        "impliedTotal": 1.5,
        "oppAllow": 0.65,
        "oppEff": 0.35,
        "defVsRole": 0.17,
        "similarDef": 0.17,
        "passRate": 0.5,
        "spreadScript": 3,
        "fpaTier": 0.35
      },
      "k": 0.3,
      "veto": false
    },
    "rec_yd:WR:over": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.05,
        "medianEdge": 0.1,
        "projEdge": 0.08,
        "usageTrend": 0.3,
        "snapTrend": 0.05,
        "impliedTotal": 1.5,
        "oppAllow": 0.35,
        "oppEff": 0.5,
        "defVsRole": 0.33,
        "similarDef": 0.25,
        "passRate": 0.5,
        "spreadScript": 6,
        "fpaTier": 0.65
      },
      "k": 0.5,
      "veto": false
    },
    "rec_yd:WR:under": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.05,
        "medianEdge": 0.15,
        "projEdge": 0.15,
        "usageTrend": 0.2,
        "snapTrend": 0.05,
        "impliedTotal": 3,
        "oppAllow": 0.35,
        "oppEff": 0.65,
        "defVsRole": 0.17,
        "similarDef": 0.25,
        "passRate": 0.65,
        "spreadScript": 3,
        "fpaTier": 0.35
      },
      "k": 0.3,
      "veto": false
    },
    "rec_yd:TE:over": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.05,
        "medianEdge": 0.1,
        "projEdge": 0.1,
        "usageTrend": 0.1,
        "snapTrend": 0.05,
        "impliedTotal": 1.5,
        "oppAllow": 0.5,
        "oppEff": 0.65,
        "spreadScript": 3,
        "fpaTier": 0.35
      },
      "k": 0.4,
      "veto": false
    },
    "rec_yd:TE:under": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.05,
        "medianEdge": 0.2,
        "projEdge": 0.08,
        "impliedTotal": 1.5,
        "oppAllow": 0.35,
        "oppEff": 0.5,
        "passRate": 0.5,
        "spreadScript": 3,
        "fpaTier": 0.35
      },
      "k": 0.4,
      "veto": false
    },
    "rec_yd:RB:over": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.1,
        "medianEdge": 0.05,
        "projEdge": 0.08,
        "usageTrend": 0.1,
        "impliedTotal": 1.5,
        "oppAllow": 0.35,
        "oppEff": 0.35,
        "spreadScript": 3,
        "fpaTier": 0.35
      },
      "k": 0.5,
      "veto": false
    },
    "rec_yd:RB:under": {
      "combiner": "kofn",
      "theta": {
        "seasonHit": 0.05,
        "medianEdge": 0.15,
        "usageTrend": 0.1,
        "oppAllow": 0.35,
        "oppEff": 0.35,
        "defVsRole": 0.17,
        "spreadScript": 3,
        "fpaTier": 0.35
      },
      "k": 0.4,
      "veto": false
    },
    "rush_yd:RB:over": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.1,
        "medianEdge": 0.2,
        "projEdge": 0.05,
        "usageTrend": 0.1,
        "snapTrend": 0.05,
        "impliedTotal": 1.5,
        "oppAllow": 0.5,
        "oppEff": 0.65,
        "passRate": 0.65,
        "spreadScript": 3,
        "fpaTier": 0.65
      },
      "k": 0.4,
      "veto": false
    },
    "rush_yd:RB:under": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.15,
        "medianEdge": 0.15,
        "projEdge": 0.1,
        "usageTrend": 0.1,
        "snapTrend": 0.05,
        "impliedTotal": 1.5,
        "oppAllow": 0.65,
        "oppEff": 0.5,
        "defVsRole": 0.17,
        "passRate": 0.65,
        "spreadScript": 6,
        "fpaTier": 0.35
      },
      "k": 0.3,
      "veto": false
    },
    "rush_rec_yd:RB:over": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.1,
        "medianEdge": 0.1,
        "projEdge": 0.05,
        "usageTrend": 0.1,
        "snapTrend": 0.05,
        "impliedTotal": 1.5,
        "oppAllow": 0.35,
        "oppEff": 0.35,
        "passRate": 0.5,
        "spreadScript": 3,
        "fpaTier": 0.35
      },
      "k": 0.3,
      "veto": false
    },
    "rush_rec_yd:RB:under": {
      "combiner": "kofn",
      "theta": {
        "l4Hits": 1,
        "seasonHit": 0.1,
        "medianEdge": 0.05,
        "projEdge": 0.1,
        "usageTrend": 0.2,
        "snapTrend": 0.05,
        "impliedTotal": 3,
        "oppAllow": 0.65,
        "oppEff": 0.65,
        "defVsRole": 0.33,
        "passRate": 0.5,
        "spreadScript": 6,
        "fpaTier": 0.65
      },
      "k": 0.3,
      "veto": false
    }
  },
  "logit": {
    "rec:WR:over": {
      "combiner": "logit",
      "cut": 0.56
    },
    "rec:WR:under": {
      "combiner": "logit",
      "cut": 0.54
    },
    "rec:TE:over": {
      "combiner": "logit",
      "cut": 0.54
    },
    "rec:TE:under": {
      "combiner": "logit",
      "cut": 0.56
    },
    "rec:RB:under": {
      "combiner": "logit",
      "cut": 0.6
    },
    "rec_yd:WR:over": {
      "combiner": "logit",
      "cut": 0.6
    },
    "rec_yd:WR:under": {
      "combiner": "logit",
      "cut": 0.58
    },
    "rec_yd:TE:over": {
      "combiner": "logit",
      "cut": 0.56
    },
    "rec_yd:RB:over": {
      "combiner": "logit",
      "cut": 0.54
    },
    "rec_yd:RB:under": {
      "combiner": "logit",
      "cut": 0.54
    },
    "rush_yd:RB:over": {
      "combiner": "logit",
      "cut": 0.56
    },
    "rush_yd:RB:under": {
      "combiner": "logit",
      "cut": 0.58
    },
    "rush_rec_yd:RB:over": {
      "combiner": "logit",
      "cut": 0.54
    },
    "rush_rec_yd:RB:under": {
      "combiner": "logit",
      "cut": 0.54
    }
  },
  "models": {
    "rec": {
      "features": [
        "l4Hits",
        "seasonHit",
        "medianEdge",
        "projEdge",
        "usageTrend",
        "snapTrend",
        "impliedTotal",
        "oppAllow",
        "oppEff",
        "defVsRole",
        "similarDef",
        "passRate",
        "spreadScript",
        "fpaTier"
      ],
      "mean": [
        -0.130154,
        -0.0606361,
        -0.0546975,
        -0.0506784,
        0.0607425,
        0.0215491,
        -0.203583,
        -0.0212009,
        -0.0216816,
        -0.0589668,
        -0.0734799,
        -0.00860536,
        -0.140089,
        -0.00556063
      ],
      "sd": [
        1.00047,
        0.193589,
        0.472544,
        0.17301,
        0.355584,
        0.0887508,
        2.48047,
        0.595549,
        0.598968,
        0.264275,
        0.272622,
        0.598594,
        5.81193,
        0.599069
      ],
      "positions": [
        "WR",
        "TE",
        "RB"
      ],
      "weights": [
        0.0808632,
        0.0573372,
        -0.0514629,
        0.151335,
        -0.0565774,
        0.123235,
        -0.039295,
        -0.0143136,
        -0.0225634,
        0.105692,
        0.122087,
        -0.0210216,
        -0.0327487,
        0.0454521,
        0.0798335,
        -0.118322
      ],
      "intercept": -0.112995,
      "l2": 10
    },
    "rec_yd": {
      "features": [
        "l4Hits",
        "seasonHit",
        "medianEdge",
        "projEdge",
        "usageTrend",
        "snapTrend",
        "impliedTotal",
        "oppAllow",
        "oppEff",
        "defVsRole",
        "similarDef",
        "passRate",
        "spreadScript",
        "fpaTier"
      ],
      "mean": [
        0.0100819,
        -0.0382551,
        -0.0403158,
        0.00456908,
        0.0648048,
        0.0227538,
        -0.122916,
        0.0126634,
        0.00733785,
        -0.0573256,
        -0.0514293,
        0.00335386,
        -0.155955,
        0.0118097
      ],
      "sd": [
        0.985979,
        0.188435,
        0.394854,
        0.156821,
        0.294358,
        0.0832461,
        2.53294,
        0.599432,
        0.601217,
        0.251931,
        0.264852,
        0.597821,
        5.75493,
        0.599012
      ],
      "positions": [
        "WR",
        "TE",
        "RB"
      ],
      "weights": [
        0.00603232,
        0.0196964,
        -0.0968139,
        0.154959,
        -0.0681988,
        0.0524117,
        0.0234687,
        -0.112772,
        -0.020219,
        0.230663,
        0.114259,
        -0.0606515,
        -0.00299026,
        0.0588334,
        0.165939,
        -0.00637446
      ],
      "intercept": -0.00969744,
      "l2": 10
    },
    "rush_yd": {
      "features": [
        "l4Hits",
        "seasonHit",
        "medianEdge",
        "projEdge",
        "usageTrend",
        "snapTrend",
        "impliedTotal",
        "oppAllow",
        "oppEff",
        "defVsRole",
        "similarDef",
        "passRate",
        "spreadScript",
        "fpaTier"
      ],
      "mean": [
        0.003003,
        -0.00294672,
        0.0102041,
        0.0114838,
        0.0504409,
        0.0121757,
        -0.164771,
        -0.0209241,
        -0.0290613,
        -0.0527536,
        -0.00680926,
        0.0316768,
        0.26952,
        -0.0252833
      ],
      "sd": [
        0.977948,
        0.194701,
        0.400577,
        0.161154,
        0.241514,
        0.0741662,
        2.50343,
        0.593468,
        0.591826,
        0.263104,
        0.289477,
        0.592537,
        5.65152,
        0.603663
      ],
      "positions": [
        "RB",
        "QB"
      ],
      "weights": [
        -0.0141135,
        0.01582,
        -0.0042611,
        0.170615,
        -0.187899,
        0.0781641,
        -0.12822,
        0.239951,
        -0.0126694,
        -0.0458498,
        -0.167971,
        0.0611492,
        0.039414,
        0.0320333,
        -0.104746
      ],
      "intercept": -0.0398279,
      "l2": 10
    },
    "rush_rec_yd": {
      "features": [
        "l4Hits",
        "seasonHit",
        "medianEdge",
        "projEdge",
        "usageTrend",
        "snapTrend",
        "impliedTotal",
        "oppAllow",
        "oppEff",
        "defVsRole",
        "similarDef",
        "passRate",
        "spreadScript",
        "fpaTier"
      ],
      "mean": [
        0.0140598,
        0.012386,
        0.0205452,
        0.0129476,
        0.0284273,
        0.0104529,
        -0.228954,
        -0.0174046,
        -0.0264754,
        -0.0479207,
        0.00856104,
        -0.00946766,
        0.056239,
        -0.026362
      ],
      "sd": [
        0.983927,
        0.212234,
        0.35048,
        0.159479,
        0.267854,
        0.0780996,
        2.55499,
        0.599612,
        0.596436,
        0.250895,
        0.286922,
        0.607318,
        5.6053,
        0.605658
      ],
      "positions": [
        "RB"
      ],
      "weights": [
        -0.0770852,
        0.280619,
        0.0994536,
        -0.222998,
        0.0647506,
        0.0889109,
        -0.111261,
        0.153546,
        -0.147088,
        -0.0400051,
        -0.0861713,
        0.0399827,
        0.116858,
        0.134692
      ],
      "intercept": -0.0610142,
      "l2": 10
    }
  }
};
// </prop-v2-frozen>

/*
 * Prop engine v2 — what the pre-registered gate would ship, per market + side: written by
 * `scripts/leans-backtest-v2.ts --grade 2025` (≥ 50 decided bets, hit % above the average
 * break-even, ROI > 0, walk-forward ROI ≥ 0). NOT WIRED into the app — Kobe 2026-10-23: 5 of 36
 * tests passed vs ≈ 9.9 from luck alone, so v2 ships as data rows only (ADR
 * docs/adr/2026-10-23-prop-engine-v2.md). Kept as the grade's record.
 */
// <prop-v2-ship>
export const PROP_V2_SHIP: ShipTable = {
  "rec:WR:under": {
    "method": "logit",
    "season": 2025,
    "wins": 170,
    "losses": 115,
    "roi": 0.0629,
    "beatsBlanket": true
  },
  "rec:TE:under": {
    "method": "logit",
    "season": 2025,
    "wins": 40,
    "losses": 23,
    "roi": 0.1019,
    "beatsBlanket": true
  },
  "rec_yd:WR:under": {
    "method": "logit",
    "season": 2025,
    "wins": 41,
    "losses": 30,
    "roi": 0.0443,
    "beatsBlanket": true
  }
};
// </prop-v2-ship>
