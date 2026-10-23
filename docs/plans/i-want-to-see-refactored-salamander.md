# Plan — ESPN + Sleeper data catalog ("everything possible vs what Pare uses")

## Context

Kobe wants to see every stat and endpoint ESPN and Sleeper expose, side by side with what Pare
already uses, so he can pick the next stats to build. The research is done (read-only, 2026-10-23):
three agents covered (1) the code, (2) live ESPN probes and (3) live Sleeper probes. This plan turns
that research into something he can browse, and fixes the stale parts of `DATA_SOURCES.md`.
No app code changes.

## What the research found (headline)

| | Endpoints that work | Stat / field names | Pare uses today |
|---|---|---|---|
| ESPN | ~60 (site, core, web) | ~288 team stats (core) + ~310 per-game + ~166 per player + FPI/QBR/EPA | 8 endpoints, 16 team stats + ~13 box-score fields + 12 leader boards |
| Sleeper | ~30 (v1 + undocumented api.sleeper.com) | 260 stat keys, 96 projection keys, 53 player fields | 7 endpoints, ~10 stat keys (`pts_ppr`, bonus flags, a few yards/TD keys) + league-scoring keys |

**Biggest unused wins:**
1. **Defense done properly, from one source.** ESPN core `…/teams/{id}/statistics/900` = the opponent
   split ("allowed" side of all 288 stats). WEB `statistics/byteam` returns **all 32 teams, own + opponent,
   with league ranks, in one call**. Today defense is stitched together from standings + summing box scores.
2. **9 hidden Compare metrics have clean sources:** yards/play, net yds/att (`netYardsPerPassAttempt`),
   pass 1st downs, rush yds/att, rush 1st downs, penalties, penalty yds, penalty 1st downs, turnover %.
3. **New team metrics:** red-zone TD %, 4th-down %, time of possession, takeaways, TO differential,
   sacks made/taken, explosive plays (`passingBigPlays` / `rushingBigPlays`), YAC.
4. **Game page extras:** win-probability per play, drives, scoring plays, matchup predictor, officials,
   venue, pregame weather, last-5 games, odds from 3 books (open/close/current).
5. **Analytics:** ESPN FPI (team EPA off/def/ST, playoff odds), QBR + EPA per QB.
6. **Sleeper (fantasy):** snaps, target share inputs, air yards, red-zone targets, drops, projections
   (rotowire), trending adds/drops, roster %, fantasy points allowed by position, 3-and-outs.

**Traps found:** ESPN `/statistics/0` and `?opponent=true` return the team's *own* stats (use `/900`).
Always-zero fields: `yardsAllowed`, `pointsAllowed`, season `totalDrives`, `offensiveSnapPct`,
`targetSharePct`, `hurries`. Garbage fields: `avgGain`, `ESPN*Rating`, `twoPointRecConvs`. Junk responses:
`ats` / `odds-records`. Sleeper season totals sum `*_lng` and rate fields (compute from weekly
data instead). Sleeper `/stats` and `/projections` are undocumented and could change without notice.
Licensing is unchanged (ESPN unofficial, Sleeper non-commercial).

## Deliverables

### 1. Browsable catalog page (Artifact — recommended main deliverable)
One HTML page, dark, mobile-first, searchable:
- One section per endpoint family (ESPN Site / Core / Web / Sleeper v1 / Sleeper undocumented).
- Each endpoint shows the URL template, whether it works, cache notes, and every field/stat as a chip
  tagged **Used** (with the Pare feature + file) · **Available** · **Broken/zero**.
- Filter: "show only unused", search box, and a summary at the top (the table above + the win list).
- Built per the `artifact-design` skill (run `Artifact quickstart` first). Private link; Kobe shares it if he wants.

### 2. Fix `DATA_SOURCES.md` (stale docs get corrected right away, per CLAUDE.md)
- Add the endpoints the app already uses but the doc doesn't list: ESPN `statistics/byathlete` (Leaders)
  and core per-event `odds` (closing-line fallback).
- Rewrite stale §4 (still says `getCurrentWeekMatchups()` is a mock and points to `lib/pfrCsv.ts`).
- Add a short "Unused but available" appendix: `/statistics/900`, `byteam`, per-game core stats,
  FPI/QBR, Sleeper undocumented stats/projections/research, with the traps above. Link to the page;
  don't copy the full key lists.

### Not in scope (list as follow-ups; each needs Kobe's OK, since it touches the data layer)
- Fix 3 stale code comments: `app/api/leaders/route.ts:6` (says 6h, really 30 min),
  `app/api/schedule/route.ts:16` (says 15s, really 5s), `lib/espnStats.ts:11-12` (mentions CSV).
- Turn on the 9 hidden metrics and move defense to `/900` or `byteam` — a later feature with its own plan.

## Files
- New: Artifact page source in the scratchpad (not the repo).
- Edit: `DATA_SOURCES.md`.
- Doc-only change, so no CHANGELOG bullet or dev note (per the global rule).

## Verification
- Before publishing, spot-check 3–4 URLs with `curl.exe -s` (core `/statistics/900`, `byteam`,
  Sleeper `api.sleeper.com/stats/nfl/2025/8`) so every "works" tag is real.
- Cross-check every "Used" tag against the file:line from the code inventory (`ESPN_FIELD_MAP`
  `lib/espnStats.ts:52-72`, `lib/espnBoxscore.ts`, `lib/gameSummary.ts`, `lib/leaders.ts:106-122`,
  `lib/fantasyPoints.ts`, `lib/leans/players.ts`, `lib/myteam/sleeper/*`).
- Open the page at 393px width: no horizontal scroll, search and filter work.
