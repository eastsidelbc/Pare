# 2026-10-23 — Prop engine v2: signals, backtest, held-out grade (A1–A5)

Branch `feat/prop-engine-v2`. Plan: `docs/plans/pasted-content-id-fcbb-the-prop-deep-crescent.md`.
Pre-registration: `docs/plans/2026-10-23-prop-engine-v2/preregistration.md`. Report:
`docs/devnotes/2026-10-23-prop-engine-v2/report-2025.md`. Data fixes that came first: `2026-10-23-leans-data-fixes.md`.

## Why
Kobe wanted prop leans tailored to the stat, the position and the opponent: more formulas than v1's "3 signals,
all agree", what a defense allows to each role (WR1 / WR2 / RB1 …), a "mock" of the prop against defenses like
tonight's, and a real backtest with an out-of-sample test before anything goes live.

## What was built (nothing user-visible yet — the live engine still runs v1)
- `lib/leans/roles.ts` — role going into a week: WR1–3 / TE1 by target share, RB1–2 by touch share, over the
  games he played for that team before the week, shrunk; candidates passed in (who played / healthy roster).
- `lib/leans/tables.ts` — `buildPropTables(lines, week)`: defense allowance per position, league averages, team
  volume per week, each defense's last 6 opponents per role, roles going in. Built only from earlier weeks, so the
  live app (one build per week) and the backtest (one per week) share the same no-look-ahead code.
- `lib/leans/propSignals.ts` — 14 signals as one number each (+ = over): last-4 hits, season hit share, median
  vs line, projection (team volume × his share × his rate × the defense's rate factor), usage + snap trends, implied
  team total, stat-specific allowance rank, efficiency-allowed rank, defense vs his role, his record vs similar
  defenses, team pass rate, spread script, v1's PPR tier. Plus the two mock rows (`defenseVsRoleMock`,
  `similarDefenseMock`).
- `lib/leans/combine.ts` — checklist (K of N votes, optional veto) and logistic score; `lib/formulas/logistic.ts`
  — hand-rolled ridge logistic regression (IRLS, no new dependency).
- `lib/leans/backtestV2.ts` + `scripts/leans-backtest-v2.ts` — tune (2024 only, writes `PROP_V2_FROZEN` into
  `config.ts`), grade (2025 once, refuses on an uncommitted config, stamps commit + params hash, writes the report
  and `PROP_V2_SHIP`), walk-forward. `scripts/leansBacktestData.ts` = the cached loaders, shared with the v1 report
  (which reproduces exactly).
- `PlayerGame` carries team / targets / carries / snaps (optional fields); `LEAN_CONFIG.propV2` holds every new
  constant; the l3 gate now scans the new engine files for stray numbers.

## Result (2025, held out — frozen at commit `4a27577`, params hash `c627f492785a`)
- **5 of 36 tests passed the pre-registered gate; ≈ 9.9 would pass from luck alone.** No evidence that v2 beats
  the market overall.
- The gate ships 3 units (all logistic, all unders, all beat "always under" on the same props):
  WR receptions under 170–115 (+6.3%, but "always under" was +5.9%), TE receptions under 40–23 (+10.2%, p 0.19),
  WR rec yds under 41–30 (+4.4%, p 0.37). Watch: RB rush under (checklist), RB rush + rec under (both).
- Overs lose in every market for every method (−0.2% to −30%); RB rush-yd overs are the worst.
- v1 on the same rows: receptions under (WR +10.9%, TE +26.4%) did better than v2's checklist — on 78 and 34 bets.

## Verified
- `npm run check` clean; `npm run test:run` 561 pass (new: roles + tables + signals + no-look-ahead test
  `propSignals.test.ts`, logistic tests).
- `node scripts/leans-gates.mjs l3` 5/5 with the widened literal scan.

## Open — needs Kobe's call before A6 (wiring into the app)
- Ship the 3 units as live leans (labelled with their held-out record + "beat always-under"), or keep v2 as data
  rows only. Mock rows + signal rows can ship either way.

## Risks
- 2025 isn't perfectly unseen (v1's 2025 results were looked at while designing); opening lines only; live
  shows current lines.
- Small samples: 63–285 bets per shipped unit; p-values 0.13–0.37.
