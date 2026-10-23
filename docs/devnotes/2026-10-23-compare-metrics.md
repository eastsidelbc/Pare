# 2026-10-23 — Compare: more metrics + metric picker (Wave B3)

Branch `feat/data-rollout` · rollout plan [`docs/plans/check-datacatalog-md-and-come-vivid-bunny.md`](../plans/check-datacatalog-md-and-come-vivid-bunny.md)
· catalog "What we could build next" #1–#3

## Why

ESPN Core's team statistics (already fetched for Compare offense) carry ~288 stats; Compare used 16. Eight more metrics
were defined in `metricsConfig` but hidden for lack of a source, and defense showed only 5 stats. Compare also had no
way to choose metrics, so availability alone never reached the screen.

## B3a — data (commit "feat(compare): …data")

- `lib/espnStats.ts`: `ESPN_FIELD_MAP` + 14 fields; `derivedFields` (yds/play, explosive plays, possession minutes);
  pure `mapCoreStats(lookup, fields?)` + exported `flattenStats`; `fetchDefenseOpponentStats()` over `/statistics/900`
  (32 teams, same 10-min fetch cache, best-effort) returning only `DEFENSE_OPPONENT_FIELDS`.
- Defense route: third best-effort enrichment step; merges only fields not already set (points / yards / 3rd-down keep
  their sources).
- `lib/metricsConfig.ts`: 8 hidden metrics turned on; 9 new definitions; defense flags only for allowed stats whose
  offense direction is higher-is-better. **Why that rule:** `useBarCalculation` swaps A/B for every defense metric
  (lower is better). Sacks made / takeaways / opponent penalties are higher-is-better for a defense → left off defense
  instead of changing the bar math. A test asserts the invariant.
- `utils/teamDataTransform.ts`: `passer_rating` skips the per-game divide (no "pct"/"per" in its name).
- Ranking snapshot regenerated: its synthetic fixture is generated per metric index, so any metric-list change reshuffles
  it. `lib/ranking.ts`, `useRanking`, `useBarCalculation`, `useDisplayMode`, `usePowerSurge` have **no diff vs main**.

### Verification

- `lib/__tests__/espnStatsMap.test.ts` (5) on real DAL 2026 Core responses (own + /900): 1:1 fields, first-occurrence
  sacks = taken (7), derived yds/play 2059/375, explosive 15+2, possession 9945 s → 165.75 min; defense = allowed fields
  only; per-game transform divides counts, not rates/rating.
- Live :4000: `/api/nfl-2025/offense` and `/defense` → 32 rows, every new field 32/32; defense has no takeaways /
  sacks / penalties (as designed). Offense 33 metrics available (was 16), defense 20 (was 6).

## B3b — metric picker

- `components/compare/MetricPickerSheet.tsx`: `BottomSheet` (grab = header), `getAvailableMetrics(type)` minus `g`,
  grouped by category, 44px checkbox rows (`role="checkbox"`), 1–`MAX_PANEL_METRICS` (8), picked order kept,
  Reset → defaults, live "N of 8 picked". Rendered via `createPortal` to `<body>` — the Compare pager moves panels
  with transforms, which would trap a `position: fixed` sheet.
- `CompactPanelHeader`: STATS button (10/800, `pare-hit44` = 44px hit area in the 28px bar) when `onEditMetrics`.
- `MobileCompareLayout` now forwards `onOffense/DefenseMetricsChange` to the panels (props existed, were unused).
  Persistence is the hosts' existing behavior: Compare tabs (`settings.offenseMetrics`, localStorage), Home accordion
  + Leans game screen (local state).

### Verification

- `lib/__tests__/metricPicker.test.ts` (toggle order, min 1, max 8).
- Playwright at 393px on /compare (real data, MIN vs DET): STATS opens the sheet, Red Zone TD % → "6 of 8", the row
  appears with ranks (MIN 50.0% T-24th, DET 77.3% T-3rd), no horizontal scroll; screenshots reviewed.

## Risks / open

- 32 more ESPN calls per 10-min window for the opponent split (cached fetches, like offense).
- ~~L4 rows don't have the new fields~~ — done, see the L4 addendum. Red-zone TD %, passer rating, explosive plays remain "—" in L4.

## Addendum (same day) — L4 for the new metrics

- `parseGameBox` reads `firstDownsPassing/Rushing/Penalty`, `totalPenaltiesYards` ("6-45"), `fourthDownEff`, `possessionTime`
  ("29:06" → `clockSeconds`); `TeamGameLine` carries them. `buildLast4Rows` adds `sharedB3` (offense = own lines, defense =
  opponents' lines): 1st downs, TDs, yds/play, NY/A (sacks count as attempts), rush Y/A, completion %, 4th-down %, possession
  minutes; offense also penalties, penalty yds, penalty 1st downs, sacks taken, takeaways (= opponents' turnovers), diff.
- Cache key `final-boxscore-v3` → `v5` (v4 briefly cached a broken possession regex in dev; never shipped).
- Self-check: a regex lost its escapes when written through a shell string (possession = 0 for all) — caught by the live
  check, fixed, `clockSeconds` unit test added. Live :4000 L4: 32/32 rows for every new field; DAL possession 28.5 min/game,
  own + allowed = 240.0 min over 4 games (= 4 × 60, sanity check).
