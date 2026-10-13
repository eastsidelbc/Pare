# Plan — Home box-score fantasy points = Sleeper PPR + yardage bonuses ("Pare points")

Branch `feat/home-sleeper-ppr` · plan date 2026-10-12 · status: proposed

**Runs AFTER `docs/plans/2026-10-12-live-scores-proxy.md` is finished (P5) and merged to `main`.** This plan builds on what that plan creates: `lib/gameSummary.ts` (the box-score parser on the server) and `GET /api/live/summary`. If `lib/gameSummary.ts` or `app/api/live/summary/route.ts` does not exist on `main`, **stop and tell Kobe**.

## Context

Home → tap a finished game → `PostGameBox` shows each player's gold fantasy number. It's computed by our own formula in `parseSummary` (`PPR` constant, today in `lib/hooks/useGameSummary.ts`, moved to `lib/gameSummary.ts` by the proxy plan). It does not match Sleeper. Example: Dak Prescott, Week 5 (Thu Oct 8) shows **12.6** on Home.

**Kobe's decision (fixed, revised 2026-10-12 during P0):** one global standard **everywhere** (Home box score **and** the Leaders Fantasy tab) = the number Sleeper shows Kobe for a player: **"Pare points" = Sleeper `pts_ppr` + 3 per yardage bonus Sleeper flags on that game.** No league-specific scoring, no settings.

**Pare points rule** (single function `parePoints(stats)` in `lib/fantasyPoints.ts`):

```
parePoints = pts_ppr + 3 × (bonus_pass_yd_300 + bonus_pass_yd_400 + bonus_rush_yd_200 + bonus_rec_yd_200)
```

- Why: Kobe's Sleeper app shows **Dak W5 = 17.64**. Sleeper `pts_ppr` = 14.64 (no bonuses). Dak threw 316 yd → Sleeper sets `bonus_pass_yd_300: 1` → +3 = **17.64**.
- Sleeper's yardage flags are **exclusive tiers**: 300–399 pass yd sets `bonus_pass_yd_300`, 400+ sets `bonus_pass_yd_400` instead (verified on the W4 fixture: 412 and 428 yd passers have only `_400`). Kobe chose: **400+ also gets +3** (both flags count, no cliff); 200+ rush or rec yd +3; no 100-yd bonuses (`bonus_rush_yd_100` / `bonus_rec_yd_100` are ignored).
- Every input is a Sleeper field (`pts_ppr` + flags) — Sleeper stat corrections flow through; Pare adds a constant per flag, it never scores yards/TDs itself.
- Sleeper **season** stats sum the flags as counts (verified 2026-10-12: Dak season `bonus_pass_yd_300: 2`, `pts_ppr: 96.84` → 102.84), so the Leaders tab uses the same function on season totals — no extra Sleeper calls.
- Risk: `bonus_rush_yd_200` / `bonus_rec_yd_200` not yet observed in live data (no 200-yd rush/rec game in 2026 W1–5; season totals show only `_100` flags). Names follow Sleeper's `scoring_settings` keys and the observed `_300`/`_400` pattern; P3 notes it, and the human gate checks the first 200-yd game.
- My Team (league view) keeps **league** scoring — out of scope.

### Why the numbers differ (verified 2026-10-12 against `lib/myteam/__fixtures__/sleeper-com-stats-w4.json`)

Sleeper `pts_ppr` = pass 0.04/yd, 4/TD, **−1/INT**, 2/2-pt · rush 0.1/yd, 6/TD, 2/2-pt · rec 1/catch, 0.1/yd, 6/TD, 2/2-pt · fumble lost −2 (+ rare return/recovery TDs). This reproduced `pts_ppr` for 280 of 281 QB/RB/WR/TE lines in the week-4 fixture (the 1 miss is a special-teams point).
Example: Deshaun Watson W4 — 268 pass yd, 1 TD, 1 INT, 22 rush yd, 1 fumble lost → Sleeper 13.92. Our formula: 12.92 (it uses −2/INT).

Our formula's gaps: INT −2 (Sleeper −1), no 2-pt conversions, no return/recovery TDs, and it scores ESPN's stats instead of Sleeper's (Sleeper stat corrections never reach Home).

**Fix = stop calculating yards/TDs. Read Sleeper's `pts_ppr` + Sleeper's bonus flags (`parePoints`) and show it.** No yard/TD scoring weights of our own anywhere.

## What exists (reuse, don't rebuild)

| Piece | Where | Use |
|---|---|---|
| `getWeekLines(season, week, completed)` | `lib/myteam/sleeper/statLines.ts` | Sleeper weekly lines, already cached (24h completed / 30 min current week), last-good on failure. Lines keep `pts_ppr` in `stats` (the `NON_SCORING` filter doesn't drop it). **No new Sleeper call.** |
| `getPlayerMap()` / `SlimPlayer` | `lib/fantasy.ts` | Sleeper id → name/team. Today `espn_id` is kept for rookies only. |
| `normalizePlayerName`, `rookieKey(name, team)` | `lib/rookieMatch.ts` | Name + team match key (accents, punctuation, Jr/III handled). |
| `parseSummary` + `PlayerLine`/`TeamBox`/`GameSummary` | `lib/gameSummary.ts` (after proxy plan) | ESPN box-score parser. |
| `getLiveSummary(eventId)` + `/api/live/summary` | `lib/espnLive.ts`, `app/api/live/summary/route.ts` | Server box-score route the browser already calls. |
| Fixtures (same game week!) | `lib/myteam/__fixtures__/espn-summary-boxscore.json` (event 401872964, 2026-10-02 = Week 4 TNF), `sleeper-com-stats-w4.json`, `sleeper-players-slim.json` | Offline join + points tests. |

## Design

**Where the points get attached: at response time in `/api/live/summary`, NOT inside the cached summary.** The summary for a final game is cached 6h; Sleeper posts stats a few minutes after the final. Attaching at response time means Home picks up Sleeper's numbers (and stat corrections) as soon as `getWeekLines` has them, without waiting for the summary cache to expire. Merging is an in-memory lookup per request (cheap).

**Season + week of the game:** from the raw ESPN summary `header.season.year` (verified present in the fixture) and `header.week` (P0 verifies). If `header.week` is missing, P0 records that and the fallback is: match `header.competitions[0].date` to the week via the existing season schedule helper (`lib/myteam/seasonSchedule.ts`). `completed` for `getWeekLines` = `week < current week` (`getCurrentWeekInfo()`).

**Matching ESPN player → Sleeper player** (pure, `lib/fantasyPoints.ts`):
1. ESPN athlete id → Sleeper id, via `espn_id` from the player map. `lib/fantasy.ts` keeps `espnId` for **all** players (not only rookies); cache key `sleeper-player-map-v4` → `v5`.
2. Fallback: `rookieKey(fullName, team)` (ESPN `displayName` + team abbr vs Sleeper `name` + line `team`).
3. No match, or Sleeper hasn't posted that game yet → `ppr: null` → Home shows **"—"**. Never fall back to a homemade formula.

**Parser change (`lib/gameSummary.ts`):** delete the `PPR` constant and `pprOf`. `parseTeam` returns the QB + **all** skill candidates (not top 3), each with `espnId` and `fullName`, `ppr: null`. `PlayerLine.ppr` becomes `number | null`.

**Enrichment (`applySleeperPoints(summary, index)`, pure):** fill `ppr` from the index, then per team: QB pinned first, then top 3 skill players by `ppr` desc. If nobody in a team has points yet, order skill by scrimmage yards (rush + rec) desc, top 3. Strip `espnId`/`fullName` from the response only if the payload grows > 20% vs before (measure in P2; otherwise keep, they're tiny). **P2 measured: +75% (870 → 1521 bytes on the TB @ DAL fixture) → stripped.** Server-only `BoxLine` (join fields) vs wire `PlayerLine` (`role/name/stat/ppr`); `toWireSummary` drops them → +1% (875 bytes).

**UI (`components/schedule/PostGameBox.tsx`):** one change — `line.ppr === null ? '—' : line.ppr.toFixed(1)`. Nothing else.

---

## Execution rules (every phase)

1. **Proof = command output in the transcript.** Allowed: `npm run check`, `npm run test:run`, `npx vitest run …`, `npm run build`, curl to `localhost`, `git` read commands, grep, `node scripts/home-ppr-gates.mjs`, and in P0/P3 only the dev scripts listed there (sequential calls, ≥300 ms apart). No "should pass" claims.
2. **Machine gate per phase** = `node scripts/home-ppr-gates.mjs pN` exits 0. **Human gate** at the end only (needs Kobe's phone).
3. **Three strikes:** same check fails 3× with the same error → stop, explain the root cause.
4. **Port 4000 before any build** (`netstat -ano | findstr :4000` [PowerShell]). If Kobe's dev server is listening, **stop and tell Kobe, don't kill it.** Builds run `npm run clean` first (Windows `.next` ENOENT); on ENOENT rerun the gate once.
5. **Commits:** local only, Conventional Commits, ending with the `Co-Authored-By` line. After each phase commit, `git status --porcelain -uno` is empty. **Never push, merge or deploy.**
6. **Shells:** [PowerShell] use `curl.exe`, one command per line, no `&&`. [Git Bash] no `jq` — parse with `node -e`. Don't install tools.
7. **Scope fence:** only the files listed per phase change. `git diff --name-only main` is checked by every gate.
8. **No real Sleeper usernames / league names in the repo.** (This plan doesn't need any.)

---

## P0: Verify + gate tooling (no app code changes)

**Changes**
- `scripts/home-ppr-gates.mjs <p0|p1|p2|p3|all>`: runs every check for the phase, prints a PASS/FAIL table, exits 1 on any failure. Build checks confirm port 4000 is free first (`net.createServer().listen(4000)`).
- `scripts/home-ppr-check.mjs` (dev script, ≤3 outbound calls, sequential):
  1. ESPN scoreboard `seasontype=2&week=5` → find the DAL game event id.
  2. `api.sleeper.com/stats/nfl/2026/5?season_type=regular&position[]=QB` → Dak Prescott's `pts_ppr`, bonus flags, raw stats, and `pare.points` (`parePoints`).
  3. ESPN `summary?event=<id>` → confirm `header.week === 5` and `header.season.year === 2026`.
  Writes `docs/plans/2026-10-12-home-sleeper-ppr/p0-check.json` and fills the table below.
- Read `lib/myteam/__fixtures__/espn-summary-boxscore.json` → record whether `header.week` exists (expect 4).
- Fill the P0 table; replace every `TBD-P0`.

**P0 results** (filled by the run)

| Check | Result |
|---|---|
| Dak W5 on Home today (our formula) | 12.6 |
| Dak W5 Sleeper `pts_ppr` | **14.64** (Sleeper id 3294, ESPN event 401872980 TB @ DAL, final) |
| Dak W5 raw (pass yd/TD/INT, rush yd/TD, fum lost, 2-pt) | 316 / 1 / 2 · 0 / 0 · 0 · 0 |
| **Dak W5 Pare points (`parePoints`) — what Kobe's Sleeper app shows** | **17.64** = 14.64 + 3 (`bonus_pass_yd_300: 1`). Confirmed by Kobe |
| Explained by the formula gaps above? | **Yes** — ours 12.64 (−2/INT) vs Sleeper 14.64 (−1/INT): 2 INTs = exactly the 2.0 gap. Sleeper rules reproduce 14.64 exactly |
| ESPN summary `header.week` present (fixture / live) | Yes / yes — fixture `4` (season 2026), live `5` (season 2026) |
| Week source used in P2 (`header.week` or schedule fallback) | `header.week` + `header.season.year` (schedule fallback only if missing) |

**Gate `p0`:** `p0-check.json` exists with a numeric Dak `pts_ppr` and `pare.points === 17.64` · plan has no `TBD-P0` · `git diff --name-only main` ⊆ `scripts/home-ppr-*.mjs`, `docs/plans/2026-10-12-home-sleeper-ppr*` · `npm run check` + `npm run test:run` pass.

```
/goal P0 of docs/plans/2026-10-12-home-sleeper-ppr.md — write scripts/home-ppr-gates.mjs + scripts/home-ppr-check.mjs, run the check (Dak W5 Sleeper pts_ppr + Pare points 17.64, ESPN header.week), fill the P0 table. Done when `node scripts/home-ppr-gates.mjs p0` exits 0, then commit "test(fantasy): P0 Sleeper PPR check + gate scripts" and `git status --porcelain -uno` prints nothing.
```

## P1: Pure points module + tests (no wiring yet)

**Changes**
- `lib/fantasyPoints.ts` (pure, client-safe, no `server-only`):
  - `buildPprIndex(lines: PlayerGameLine[], players: Record<string, { name: string; espnId?: string }>)` → `{ byEspnId: Map<string, number>, byNameTeam: Map<string, number> }` from `parePoints(stats)` (QB/RB/WR/TE/K only).
  - `parePoints(stats)` → `number | null`: `null` when `pts_ppr` is missing; else the rule above. Exports `PARE_BONUS_FLAGS` (the 4 flag names) and `PARE_BONUS_POINTS = 3`.
  - `pprFor(index, { espnId, fullName, team })` → `number | null` (espnId first, then `rookieKey(fullName, team)`).
  - `applySleeperPoints(summary, index)` → new `GameSummary` (design above). Pure, doesn't mutate input.
- `lib/__tests__/fantasyPoints.test.ts` (names must contain these phrases; the gate greps them):
  1. `pts_ppr is the source`: for every fixture line with `pts_ppr`, `pprFor` returns exactly `pts_ppr + 3 × flags` (equal to `pts_ppr` on lines with no flags).
  8. `bonus rule`: Dak W5 stats from `p0-check.json` (14.64 + `bonus_pass_yd_300: 1`) → **17.64**; a 412-yd line with only `bonus_pass_yd_400` → +3; `bonus_rush_yd_200` / `bonus_rec_yd_200` → +3 each; `bonus_rec_yd_100` / `bonus_rush_yd_100` / `bonus_fd_qb` / `bonus_pass_cmp_25` → +0; missing `pts_ppr` → `null`.
  2. `formula proof`: standard-PPR rules (above) through `scoreLine` (`lib/myteam/fpa.ts`) equal `pts_ppr` on ≥99% of week-4 QB/RB/WR/TE lines (documents the formula; nothing in the app uses it).
  3. `join hit rate`: every QB/RB/WR/TE in `espn-summary-boxscore.json` with ≥1 stat gets a non-null `ppr` from the week-4 Sleeper fixture (100%; any exception is listed in the test with a reason and capped at 1).
  4. `qb pinned`: QB first, then top 3 skill by `ppr` desc.
  5. `no points yet`: empty index → all `ppr: null`, skill ordered by scrimmage yards.
  6. `name fallback`: a player with no `espnId` still matches by name + team (incl. a `Jr.`/`III` case).
  7. `no homemade formula`: `lib/fantasyPoints.ts` source contains no `0.04` / `0.1` / yard or TD scoring weights (the flat `3` per Sleeper bonus flag is the only constant).

**Gate `p1`:** `npx vitest run lib/__tests__/fantasyPoints.test.ts --reporter=json` → ≥8 passed, 0 failed · all 8 phrases present · `git diff --name-only main` ⊆ P0 files + `lib/fantasyPoints.ts`, `lib/__tests__/fantasyPoints.test.ts` · `git diff --exit-code main -- package.json package-lock.json` · `npm run check` + `npm run test:run` pass.

```
/goal P1 of docs/plans/2026-10-12-home-sleeper-ppr.md — add pure lib/fantasyPoints.ts (parePoints, buildPprIndex, pprFor, applySleeperPoints) reading Sleeper pts_ppr + bonus flags only, with tests on the week-4 ESPN + Sleeper fixtures. Done when `node scripts/home-ppr-gates.mjs p1` exits 0, then commit "feat(fantasy): Sleeper PPR lookup for box-score players" and `git status --porcelain -uno` prints nothing.
```

## P2: Wire it in (parser, player map, route, one UI line)

**Changes**
- `lib/gameSummary.ts`: remove `PPR` + `pprOf`; `PlayerLine` gains `espnId`, `fullName`, `isPasser`, `scrimmageYds` (the `PointsLine` shape `applySleeperPoints` takes — P1); `ppr: number | null`; `parseTeam` returns QB + all skill candidates. Update the header comment ("Full-PPR scoring…" → "points come from Sleeper `pts_ppr`, attached by /api/live/summary").
- `lib/fantasy.ts`: `SlimPlayer.espnId` for all players with an `espn_id` (keep `rookieEspnId` behavior for `getRookieIndex`); cache key → `sleeper-player-map-v5`.
- `lib/fantasy.ts` (Leaders Fantasy tab, "everywhere"): the slim season stats keep the 4 `PARE_BONUS_FLAGS`; board points = `parePoints(s) ?? s.pts_std ?? 0` for skill/K rows (D/ST unchanged: no yardage flags). Season-stats cache key `sleeper-season-stats-v1` → `v2` (shape changed). Leaders UI unchanged.
- `app/api/live/summary/route.ts` (or a helper in `lib/espnLive.ts`): after `getLiveSummary`, resolve season/week (P0 result), `getWeekLines(season, week, completed)` + `getPlayerMap()`, `buildPprIndex`, `applySleeperPoints`. If Sleeper fails → serve the summary with `ppr: null` (never fail the route because of Sleeper). Caching headers unchanged.
- `components/schedule/PostGameBox.tsx`: `—` when `ppr === null`. No other UI change.
- `lib/__tests__/liveParity.test.ts` + `lib/__fixtures__/espn/parity/summary-final.json`: snapshot regenerated **once, intentionally** (parser now returns all candidates with `ppr: null`). Commit message says so.
- `lib/__tests__/liveRoutes.test.ts`: new cases, names containing:
  - `sleeper points attached`: mocked Sleeper week lines → every displayed `ppr` equals `parePoints` of the fixture line.
- `lib/__tests__/fantasyBoards.test.ts` (or the existing fantasy test file if one exists): `leaders pare points` — a season row with `pts_ppr: 96.84, bonus_pass_yd_300: 2` ranks with 102.84.
  - `sleeper down`: Sleeper fetch rejects → 200, all `ppr: null`, ESPN data intact.
  - `points after cache`: summary cached (HIT), Sleeper lines change → next response shows the new points (proves response-time attach).

**Gate `p2`:**
- `git grep -n "passYd: 0.04\|PPR = {" -- lib components app` → no matches (homemade formula gone).
- `git grep -c "sleeper-player-map-v5" -- lib/fantasy.ts` = 1 · `sleeper-season-stats-v2` = 1 · `lib/fantasy.ts` calls `parePoints`.
- `git diff --name-only main` ⊆ P0/P1 files + the files listed above. `git diff main -- components` touches only `PostGameBox.tsx`, ≤ 3 changed lines.
- `npx vitest run lib/__tests__/fantasyBoards.test.ts lib/__tests__/liveRoutes.test.ts lib/__tests__/liveParity.test.ts lib/__tests__/fantasyPoints.test.ts --reporter=json` → 0 failed, includes the 4 new phrases.
- `npm run check` + `npm run test:run` pass · port 4000 free → clean + build passes.

```
/goal P2 of docs/plans/2026-10-12-home-sleeper-ppr.md — remove the homemade PPR formula from lib/gameSummary.ts, keep espnId for all players in the Sleeper player map (v5), attach Pare points (Sleeper pts_ppr + bonus flags) in /api/live/summary at response time, use parePoints on the Leaders Fantasy tab, show "—" when missing in PostGameBox. Done when `node scripts/home-ppr-gates.mjs p2` exits 0, then commit "feat(home): box-score fantasy points from Sleeper PPR (parity snapshot updated intentionally)" and `git status --porcelain -uno` prints nothing.
```

## P3: Real-data smoke + docs

**Changes**
- `scripts/home-ppr-smoke.mjs`: requires port 4000 free + a fresh build. Spawns `next start -p 4000`, waits for `/api/health` 200 (60s max). Then:
  1. `/api/live/summary?event=<Dak W5 event from p0-check.json>` → Dak's `ppr` **=== 17.64** (`pare.points` from `p0-check.json`; UI shows 17.6).
  2. Every non-null `ppr` in that response is a number; QB first per team.
  3. One more final game from week 5 → ≥90% of displayed lines have non-null `ppr`.
  Writes `docs/plans/2026-10-12-home-sleeper-ppr/p3-smoke.json` (`pass`, Dak before/after). Kills the server (Windows fallback `taskkill /pid <pid> /T /F`). ≤4 outbound calls.
- Docs: `CHANGELOG.md` `[Unreleased]` one bullet · `DATA_SOURCES.md` one line ("Fantasy points everywhere (Home box score + Leaders Fantasy) = Sleeper `pts_ppr` + 3 per Sleeper yardage-bonus flag (`bonus_pass_yd_300/_400`, `bonus_rush_yd_200`, `bonus_rec_yd_200`) — `parePoints` in `lib/fantasyPoints.ts`; Pare never scores yards/TDs itself") · `CLAUDE.md` one line in the data section · `docs/devnotes/2026-10-12-home-sleeper-ppr.md` (why, the formula-gap table, Watson + Dak examples).

**Gate `p3`:** `node scripts/home-ppr-smoke.mjs` exits 0 · `p3-smoke.json` `pass: true` with Dak `after === 17.64` · port 4000 free afterward · `CHANGELOG.md` and `DATA_SOURCES.md` contain `pts_ppr` · devnote exists · `npm run check` + `npm run test:run` pass.

```
/goal P3 of docs/plans/2026-10-12-home-sleeper-ppr.md — smoke the local production build against real ESPN + Sleeper (Dak W5 Home number === 17.64 Pare points), then update CHANGELOG, DATA_SOURCES, CLAUDE.md and a devnote. Done when `node scripts/home-ppr-gates.mjs p3` exits 0, then commit "test(home): Sleeper PPR smoke + docs" and `git status --porcelain -uno` prints nothing.
```

## Run all

```
/goal run P0→P3 of docs/plans/2026-10-12-home-sleeper-ppr.md in order on branch feat/home-sleeper-ppr (off main, after the live-scores proxy is merged): for each phase do its Changes, run `node scripts/home-ppr-gates.mjs pN`, commit with the phase's message; stop at the first gate that exits non-zero and report its FAIL rows. Done when `node scripts/home-ppr-gates.mjs all` exits 0, HEAD is the P3 commit, and nothing was pushed.
```

**Final report after the run (for Kobe):** files changed per phase · the P0 table + Dak before/after · key code snippets, each with a short "micro learning" and a small analogy · one PowerShell box (push branch, merge to main — one command per line, no `&&`) · one Mac mini deploy box (CLAUDE.md deploy steps) · the human gate below.

## Human gate (Kobe, after deploy)

- [ ] pare.gg → Home → Week 5 → DAL game → Dak's gold number = **17.6** (Sleeper app: 17.64).
- [ ] Leaders → Fantasy → QB → Dak's season points include the +3 per 300-yd game (= Sleeper app season total).
- [ ] First 200-yd rush or rec game of the season: the player's number on Home = Sleeper app (proves the `_200` flag names).
- [ ] Two more players from different games match Sleeper.
- [ ] A game that just went final shows "—" for a few minutes, then numbers (≤30 min for the current week — the `getWeekLines` cache).

## Risks + handling

| Risk | Handling |
|---|---|
| Sleeper hasn't posted a just-finished game | `ppr: null` → "—"; current-week lines refresh every 30 min. |
| Sleeper down | Route still 200 with ESPN data, `ppr: null` (tested). `getWeekLines` serves last-good when it has one. |
| Name mismatch (nicknames, suffixes) | ESPN id first; name fallback uses `normalizePlayerName`; P1 hit-rate test + P3 ≥90% check. |
| Player map v5 key = one fresh ~20MB Sleeper download | Once per 24h anyway; same as any key bump (v3→v4 precedent). |
| Fantasy tab (My Team) shows *league* scoring | Out of scope. Home + Leaders use Pare points by decision. |
| `bonus_rush_yd_200` / `bonus_rec_yd_200` names unobserved in live data | Named after Sleeper `scoring_settings` keys + observed `_300`/`_400` pattern; unit-tested on synthetic lines; human gate checks the first 200-yd game. |
| Sleeper changes which flags it emits | Points silently fall back to plain `pts_ppr` (never wrong by more than the bonus); P1 `bonus rule` test documents the contract. |
| Live (in-game) points on Home | Out of scope — finished games only, same as today. |

## This /plan run (after approval)

1. Confirm the live-scores proxy plan is merged to `main` (`git log main --oneline | findstr live`); if not, stop.
2. `git switch main`, `git pull`, `git switch -c feat/home-sleeper-ppr`.
3. Commit this plan: `git add docs/plans/2026-10-12-home-sleeper-ppr.md`, `git commit -m "docs(plans): Home box-score fantasy points from Sleeper PPR"` (with the Co-Authored-By line). Local only; then stop.
