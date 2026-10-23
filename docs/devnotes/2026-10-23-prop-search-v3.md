# 2026-10-23 — Prop research v3: week-by-week history, new stats, the 14-million-rule search

Branch `feat/prop-search-v3`. Pre-registration: `docs/plans/2026-10-23-prop-search-v3/preregistration.md`.
Reports: `docs/devnotes/2026-10-23-prop-search-v3/search-report.md`, `…/holdout-2026.md`.
Builds on `2026-10-23-prop-engine-v2.md` (signals, tables, data rows) and ADR `docs/adr/2026-10-23-prop-engine-v2.md`.

## Why
Kobe: show history week by week ("week 5, week 6 and going on"), add more stats, and make the in-house formula
help more: "figure out the millions of possible ways possible and test them", with backtest + out-of-sample. He
picked the strict judge (shuffle bar + a 2026 holdout + paper trading) and the stats: air yards + aDOT, red-zone
looks, efficiency.

## What changed — app (info only, no new lean)
- **Prop screen → Matchup data → "Week by week"** (`components/leans/PropHistory.tsx`, `lib/leans/history.ts`):
  toggle between his weeks (W · Opp · stat with a dot vs tonight's line · Tgt / Car · Share · Snap · aDOT / RZ) and
  the defense's weeks (W · who it faced · stat allowed to his position · his role's player that week, by name).
- **More facts rows** (`lib/leans/matchupData.ts` `depthRows`): aDOT, air-yards share, catch rate · drops, YAC /
  catch, 1st downs / target, red-zone targets / carries · share, yds after contact, broken tackles; the defense's
  aDOT, YAC / catch and red-zone looks allowed, ranked.
- **Player screen game log**: Stats | Usage toggle (`components/leans/GameLog.tsx`, `ViewToggle.tsx`).
- Data: `PlayerGame` + Sleeper `rec_air_yd`, `rec_rz_tgt`, `rush_rz_att`, `rec_yar`, `rush_yac`, `rec_fd`,
  `rush_fd`, `rec_drop`, `rush_btkl`; `tables` + team air / red-zone per week, `allowWeeks`, role-log names
  (trimmed to the asked teams' opponents). Two-team bundle 14 → 19 KB gzipped (dev, ATL + SF).

## What changed — research
- `lib/leans/research/features.ts` — 73 features per prop (form vs the line over 1/2/3/5/8/all, usage, depth,
  efficiency, opponent ranks season + last 3, role history, game context, the 14 v2 signals).
- `lib/leans/research/search.ts` — bitset search per market × side: every single condition (deciles, ≥ / ≤),
  every pair, best 300 pairs → triples; score = Wilson 95% lower bound − break-even at real prices, above
  break-even in both seasons; shuffle null (wins reshuffled per unit per season, seeded).
- `scripts/prop-search.ts` — `--search`, `--holdout` (once; refuses on a dirty finalists file or an existing
  report), `--paper` (appends one finished week). Loader: `maxWeek` + unpriced lines for 2026
  (`scripts/leansBacktestData.ts`).

## Results
- **Search (2024 + 2025): 14,140,296 rules**, plus the same search on 200 shuffled copies (≈ 2.8 billion).
  Shuffle bar 0.1310 (best shuffled: median 0.1121, max 0.1506). **Real best 0.1507 — beats all 200 shuffles, by a
  hair.** All 40 survivors are one family: **WR receptions under** when he went under the line in each of his last
  3 games and tonight's defense isn't a big YAC-allowing one (+ a usage or form condition). Best: 158 bets, 76.6%
  (2024 76.3%, 2025 77.0%) vs 54.3% break-even. 2 non-overlapping versions frozen (`finalists.ts`, commit `b0e7d60`).
- **2026 holdout (weeks 1–6, −110): FAIL** — pooled 5–5, 50.0%, −4.5%, p 0.56.
- **My miss:** the 4-games-played minimum leaves only weeks 5–6 of 2026 (850 props), so the rule fired just 10
  times. That grade can neither confirm nor kill a rule that fires ~4–5 times a week; I should have counted eligible
  rows before pre-registering "weeks 1–6". Per the pre-registration the result stands as FAIL → nothing ships.
- Next: paper-trade each finished week (`--paper 2026 7`, …). ~10 more weeks ≈ 40–50 bets before it says anything.

## Verified
- `npm run check` clean; `npm run test:run` 579 pass (new: week-by-week + usage render tests,
  `researchSearch.test.ts` — Wilson bound, planted-rule recovery, shuffle keeps per-season counts, null drops).
- Dev (:4000) bundle carries the new fields (London W6: 10 tgt, 29 air yds, 2 RZ targets).
- Not run: `npm run build` (dev holds :4000). UI: Kobe to check a prop screen + player game log at 393px.

## Risks
- The surviving family beat shuffles only barely; 2024–25 overlap with v2's seen data; 2026 lines are unpriced
  (real under prices are often worse than −110).
