/**
 * Prop research v3 — the FROZEN finalists. Written by `scripts/prop-search.ts --search`
 * (2024 + 2025 + the shuffle bar) and committed before the one 2026 holdout grade; never
 * hand-edited. `shippable` = at least one rule beat the shuffle bar (else information only).
 * Not wired into the app: a finalist can only become a lean after the holdout passes and Kobe
 * says so (pre-registration docs/plans/2026-10-23-prop-search-v3/preregistration.md §4).
 */

import type { Rule } from './search';

export interface Finalists {
  shippable: boolean;
  /** The shuffle bar the survivors beat. */
  bar: number;
  rules: Rule[];
}

// <finalists>
export const FINALISTS: Finalists = {
  "shippable": true,
  "bar": 0.13100401615239987,
  "rules": [
    {
      "market": "rec:WR",
      "side": "under",
      "conds": [
        {
          "feature": "form_hit3",
          "op": "<=",
          "threshold": 0
        },
        {
          "feature": "opp_yacAllowed",
          "op": "<=",
          "threshold": 0.612903
        },
        {
          "feature": "use_shareTrend",
          "op": ">=",
          "threshold": -0.0388109
        }
      ]
    },
    {
      "market": "rec:WR",
      "side": "under",
      "conds": [
        {
          "feature": "form_hit3",
          "op": "<=",
          "threshold": 0
        },
        {
          "feature": "opp_yacAllowed",
          "op": "<=",
          "threshold": 0.612903
        },
        {
          "feature": "form_mean5",
          "op": "<=",
          "threshold": 0.2
        }
      ]
    }
  ]
};
// </finalists>
