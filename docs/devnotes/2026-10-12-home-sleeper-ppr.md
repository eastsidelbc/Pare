# 2026-10-12 — Fantasy points = what the Sleeper app shows ("Pare points")

Branch `feat/home-sleeper-ppr` · plan `docs/plans/2026-10-12-home-sleeper-ppr.md` · proof `docs/plans/2026-10-12-home-sleeper-ppr/p0-check.json`, `p3-smoke.json`

## Why

Home → finished game → the gold fantasy number per player came from our own formula in `lib/gameSummary.ts`. It didn't match Sleeper. Dak Prescott W5 (TB @ DAL) showed **12.6**; Kobe's Sleeper app shows **17.64**.

Kobe's decision: one number everywhere (Home box score **and** Leaders Fantasy) = what Sleeper shows. No settings, no league scoring outside My Team.

## The rule

```
parePoints = pts_ppr + 3 × (bonus_pass_yd_300 + bonus_pass_yd_400 + bonus_rush_yd_200 + bonus_rec_yd_200)
```

`lib/fantasyPoints.ts`. Every input is a Sleeper field, so Sleeper's scoring and stat corrections flow through. Pare only adds a flat 3 per Sleeper flag; it never scores yards or TDs.

- Sleeper's yardage flags are **exclusive tiers**: 300–399 pass yd sets `_300`, 400+ sets `_400` instead (W4 fixture: 412 and 428 yd passers have only `_400`). Kobe chose +3 for both, so a better game never scores less.
- 100-yd rush/rec flags (`bonus_rush_yd_100` / `bonus_rec_yd_100`) are ignored.
- Sleeper's **season** stats sum the flags as counts, so Leaders uses the same function on season totals (Dak through W5: 96.84 + 2 × 3 = 102.84).

## Why the numbers differed

| | Our old formula | Sleeper `pts_ppr` | Pare points |
|---|---|---|---|
| INT | −2 | −1 | −1 |
| 2-pt conversions | none | +2 | +2 |
| Return / recovery TDs | none | +6 | +6 |
| 300+ pass / 200+ rush / 200+ rec yd bonus | none | none | +3 each |
| Source of stats | ESPN box score | Sleeper (stat corrections included) | Sleeper |

- **Deshaun Watson W4:** 268 pass yd, 1 TD, 1 INT, 22 rush yd, 1 fumble lost → old 12.92 · Sleeper `pts_ppr` 13.92 · Pare 13.92 (no bonus).
- **Dak Prescott W5:** 316 pass yd, 1 TD, 2 INT → old 12.64 (Home 12.6) · Sleeper `pts_ppr` 14.64 · Pare **17.64** (`bonus_pass_yd_300`). Home now shows 17.6.

## How Home gets them

- `lib/gameSummary.ts` parses the ESPN box score into the passer + **every** skill candidate, `ppr: null`, with server-only join fields (`BoxLine`: `espnId`, `fullName`, `isPasser`, `scrimmageYds`).
- `/api/live/summary` → `summaryWithPoints` (`lib/espnLive.ts`) **per response**, not inside the 6h summary cache: season/week from ESPN `header`, Sleeper week lines (`getWeekLines`, 24h completed / 30 min current week) + player map → `buildPprIndex` → `applySleeperPoints` (passer first, top 3 skill by points; by scrimmage yards before Sleeper posts) → `toWireSummary` (drops the join fields: +75% payload otherwise, now +1%).
- Join: ESPN athlete id via the player map's `espnId` (kept for all players, map key v5), else normalized name + team (`rookieKey`; handles Jr./III).
- Sleeper step capped at **3s**: a cold server's ~20MB player-map download must not hold the box score. Down/slow/no match → `ppr: null` → PostGameBox shows "—". Never a homemade fallback.

## Proof

- P0: Dak W5 live from ESPN + Sleeper → `pts_ppr` 14.64, `bonus_pass_yd_300: 1`, Pare 17.64.
- P1: `lib/__tests__/fantasyPoints.test.ts` — W4 fixtures: every ESPN player in PIT @ CLE joins (100%), standard-PPR rules reproduce `pts_ppr` on ≥99% of lines.
- P2: `lib/__tests__/liveRoutes.test.ts` (points attached, Sleeper down → 200 + "—", points appear on a cached summary), `lib/__tests__/fantasyBoards.test.ts` (Leaders ranks by Pare points).
- P3: local `next start` vs real ESPN + Sleeper → Dak 17.64 on the first response; PHI @ JAX 8/8 lines with points.

## Open risk

`bonus_rush_yd_200` / `bonus_rec_yd_200` haven't appeared in live data yet (no 200-yd rush/rec game in 2026 W1–5). The names follow Sleeper's `scoring_settings` keys and the observed `_300`/`_400` pattern. Check the first 200-yd game against the Sleeper app (human gate in the plan).
