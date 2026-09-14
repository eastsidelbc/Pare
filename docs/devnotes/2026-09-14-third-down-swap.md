# Dev Note — 2026-09-14 — Replace Sc% with 3rd-down % (offense direct, defense aggregated)

> Rules & architecture live in `CLAUDE.md`; this note is implementation rationale only.
> State authority: `CHANGELOG.md` `[Unreleased]`.

## Context
Step 5 of the ESPN migration. `score_pct` (Sc%) has no clean ESPN source, so
swap it out of the default views for `third_down_pct` (already a defined metric)
and populate it live for 2026 — offense directly, defense via opponent
aggregation. Schedule and the Steps 2–4 points/yards stay intact.

## Config swap (`lib/metricsConfig.ts`)
- `DEFAULT_OFFENSE_METRICS` and `DEFAULT_DEFENSE_METRICS`: `score_pct` →
  `third_down_pct`. `score_pct` remains defined/available (just not defaulted).
- Ranking context unchanged: `third_down_pct.higherIsBetter = true` (offense);
  the defense panels already invert (`!higherIsBetter`) → lower opponent 3rd-down
  % ranks better. No ranking-math changes.

## Offense (direct)
- `lib/espnStats.ts` `ESPN_FIELD_MAP`: `third_down_pct ← thirdDownConvPct` (from
  the Step-2 team-statistics feed, "miscellaneous" category). It's already a
  percentage, and per-game transform skips `*pct*` fields, so no division.

## Defense (aggregated — different source than points/yards)
- Third-down is NOT in the points (standings) or yards (competitor stats) feeds.
  It lives in the game SUMMARY box score: `boxscore.teams[].statistics` →
  `thirdDownEff`, `displayValue` like `"5-12"` (conversions-attempts).
- Reused the Step-4 completed-games loop + summaries (no extra fetches):
  `getGameYards()` now also parses `thirdDownEff` per team; the aggregation sums
  each team's OPPONENTS' conversions & attempts.
- **Attempts-weighted** (not a mean of per-game %):
  `third_down_pct = Σ opp conv / Σ opp att × 100`, merged in
  `app/api/nfl-2025/defense/route.ts` (only when `Σ att > 0`). Same 6h cache,
  same concurrency cap, same skip-and-log resilience.

## Files changed
- `lib/metricsConfig.ts` — default metric swap.
- `lib/espnStats.ts` — offense `third_down_pct` mapping; `thirdDownEff` parse +
  `td3Conv`/`td3Att` accumulation in the defense aggregation.
- `app/api/nfl-2025/defense/route.ts` — merge attempts-weighted `third_down_pct`.
- `CHANGELOG.md` — `[Unreleased]` entry.

## Acceptance gate (live 2026 — PASSED)
- **MIN OFFENSE** `third_down_pct` = **53.333%** (≈53.3 ✓; box score 8/15).
- **MIN DEFENSE** `third_down_pct` = **25%** (✓). Raw summed opponent third-down:
  Minnesota's only completed game was vs **GB**, who went **3/12** → 3÷12×100 = 25%.

## Cheap verify
1. `GET /api/nfl-2025/offense` → `third_down_pct` populated **32/32**;
   `GET /api/nfl-2025/defense` → **30/32** (DEN/KC unplayed → "—"). `score_pct`
   no longer in either default list.
2. Gate above, with raw conv/att printed.
3. `npx eslint` on the three changed files → clean.

## Follow-ups
- Net-vs-gross passing/total reconciliation across panels (from Step 4).
- `score_pct` remains available but unmapped for 2026 (renders "—" if selected).
- `nfl-2025` route rename (cosmetic).
