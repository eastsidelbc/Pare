# Dev Note — 2026-10-04 — Standings "Neon Frame" (C · Compact + seeds, R2)

**Status: merged to `main` at `56ddf86`** (branch `ui/standings-neon-frame`). Deploy + on-device check below.

Recipe: `docs/design-system.md` §9.2.

## How it was picked
Three rounds on the "Pare Standings Redesign" board (real 393×759 phones + iPad Pro 11" crops):
- Round 1 — row recipe A dense / B record-first / C compact + seeds; leader L0–L3; T1–T3; header Ha–Hc →
  **C with A's ESPN columns · L2 gold tint · T2 · Hc (Division / Conf / Playoffs)**.
- Round 2 — six full versions → **V5 Dense** with **V6 quiet points** (PF/PA grey).
- Round 3 — six refinements with a live standards scorecard → **R2 · Standards-fixed**.

## What changed
- `lib/standings.ts` — **one additive field**: `seed: number | null` from ESPN `playoffSeed` (0/missing → null).
  No fetch, sort or signature changes. ESPN's own tiebreakers decide seeds.
- `lib/standingsViews.ts` (new, pure) — `seedKind`, `leagueHasTies`, `conferenceBySeed`, `playoffPicture`.
- `lib/teamColors.ts` — `getListTeamColor(abbr)`: team `line` color lifted toward white only until it reaches
  4.5:1 on the deep card **and** on the 8% gold leader tint (the tint alone pushed 11 teams below 4.5:1).
- `components/standings/` — `StandingsScreen` (client: H1 header + view toggle + scroll region),
  `StandingsRow` (shared row/header/chip/card), `DivisionTable` (rewritten: no `TeamLogo`, no framer-motion
  stagger), `ConferenceTable` + `PlayoffPicture` (new views).
- `app/standings/page.tsx` — server fetch only, renders `StandingsScreen`.
- `app/globals.css` — tokens `--leader-tint`, `--seed-chip`, `--seed-edge`; `.pare-hit44` (invisible 44px hit area).
- Tests: `lib/__tests__/standingsViews.test.ts` (seed order, 7@2/6@3/5@4, hunt, empty seeds, league-wide T,
  all 32 list colors ≥ 4.5:1 on both surfaces).

## Standards decisions (Round 3 scorecard)
| Check | Standard | Result |
|---|---|---|
| Header toggle buttons | Apple 44pt · WCAG 2.2 AA 24px | 30px drawn, 44px hit area ✓ |
| Rows | 44pt only if tappable | 32px, read-only (deliberate dense table) |
| Small-text contrast | WCAG AA 4.5:1 | lowest 6.06:1 ✓ (`--subtext`, never `--muted`, for small data) |
| Team abbreviations | 4.5:1 | all 32 ✓ (lifted where needed) |
| Smallest text | Apple 11pt minimum | 10px column headers / chips — accepted for dense labels |

## Verification (cloud sandbox)
`npm run check` clean · `vitest run` 69 passed · production build (Inter mocked from @fontsource-variable/inter) ·
Playwright with a sandbox-only fixture page (`app/standings-fixture`, never mirrored): 393×759, 834×1194,
1194×834 × Division / Conf / Playoffs × normal week and a stress week (17-0 · 1.000 · 540/412 · W17, plus a tie
so T shows) → no clipped cell, no horizontal overflow, Division card 282px on iPad landscape, toggle hit area 44px.
Sandbox can't reach ESPN: real seeds and records need an on-device check.

## Ship (2026-10-04)
- PC: committed on `ui/standings-neon-frame`, pushed, merged into `main` → `56ddf86`.
- Mac mini deploy: `cd ~/Pare` → `git restore package-lock.json` → `git pull` → `npm install` → `npm run clean` →
  `npm run build` → `pm2 restart pare` → `pm2 logs pare --lines 30` (watch for ESPN 429/403).
- Post-deploy checks: `curl -s http://localhost:4000/api/health` (commit = 56ddf86, fresh `builtAt`) ·
  `curl -s http://localhost:4000/api/standings | grep -o '"seed":[0-9]*' | head -5` (real seeds; all `null`
  only means ESPN hasn't seeded yet — chips stay blank, nothing breaks).
- On-device (iPhone 14 Pro app mode + iPad Pro 11"): Division / Conf / Playoffs, real seeds, leader tint,
  toggle easy to hit. Self-hosted ISR note doesn't apply here (Standings is `force-dynamic`), but reload twice
  if the old page shows.

## Notes / follow-ups
- Conference order follows `getStandings()` (NFC first) — unchanged; the mockups showed AFC first.
- The view resets to Division on reload (plain `useState`); persisting it is a one-liner if wanted.
- Clinch letters (x / y / z) aren't in ESPN's feed yet; they'd sit next to the seed chip.
- Next: Leaders tab, same process.
