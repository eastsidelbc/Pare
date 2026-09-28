# Dev Note — 2026-09-28 — Leaderboards tab (ESPN player stats) · Home scroll-jump fix

> Rules & architecture live in `CLAUDE.md`; this note is implementation rationale only.
> State authority: `CHANGELOG.md` `[Unreleased]`.

## Fix A — Home schedule: first-touch scroll "refresh/jump"

**Symptom:** landing on Home (seeded to the current week only), the first
downward touch made the list lurch and the week label flip backward — felt like
a refresh fighting the scroll.

**Root cause** (`components/schedule/ScheduleScreen.tsx`, `onScroll`): the
top edge-loader fired on absolute position only —
`if (el.scrollTop < EDGE_PX) prependWeek()`. With a single seeded week we start
at `scrollTop ≈ 0` (always < the 700px `EDGE_PX`), so the very first scroll
prepended the *previous* week above the viewport; the prepend-anchor then shoved
`scrollTop` down by a 14-card skeleton's height and the active-week detector
relabelled to the newly-inserted week. Both edges could even trip at once on a
short week (prepend + append).

**Fix (surgical):** make the top loader direction-aware — only prepend while
actually scrolling **up**:
```
const scrollingUp = el.scrollTop < lastScrollTopRef.current;
...
if (scrollingUp && el.scrollTop < EDGE_PX) { anchor…; prependWeek(); }
```
Append (scroll down) and the arrow/dropdown jump path are untouched. First
downward touch from the seed no longer prepends or jumps.

## Fix B — new Leaderboards tab (offense / defense / special teams)

**Data source:** ESPN public `byathlete` statistics endpoint
`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byathlete`
— same free, CORS-open ESPN family the schedule already uses. One call per board,
`sort=<category>.<statKey>:desc`. Returns each athlete with name, `teamShortName`,
`teamLogos[0].href`, `headshot.href`, and per-category `values`/`totals`/`ranks`.

**Mapping gotcha (cost us a debug loop):** the *sort key* is camelCase
(`defensiveInterceptions.interceptions`, which sorts fine) but the returned
category `name` is **lowercased** (`defensiveinterceptions`). Every other
category is a single lowercase word so matched by luck; interceptions came back
empty until we matched the category **case-insensitively**. Value is pulled by
index: `respCat.names.indexOf(statKey)` → `athlete.categories[cat].values[idx]`
(and `.ranks[idx]` gives the league rank for free).

**12 boards, verified live vs the endpoint (2026 season):**
- Offense: passing yds, passing TD, rushing yds, rushing TD, receiving yds, receiving TD
- Defense: sacks, interceptions (`defensiveInterceptions.interceptions`), total tackles
- Special teams: field goals made, punting avg (`grossAvgPuntYards`), punt return yds

**Architecture (mirrors the schedule seam):**
- `lib/leaders.ts` — `server-only` seam. `BOARDS` config, `fetchBoard` (per-board
  ESPN fetch, `next.revalidate` 6h, degrades to an empty board on failure),
  `getAllLeaderboards()` fetches all in parallel. Types exported for the client card.
- `app/api/leaders/route.ts` — `GET /api/leaders` → `{ updatedAt, boards }` (for
  quick inspection; the page fetches server-side, not through this route).
- `app/leaderboards/page.tsx` — server component. Fixed-header + single-scroll
  shell (same as Home), sections Offense/Defense/Special Teams, `revalidate = 21600`.
- `components/BottomNav.tsx` — third **Leaders** tab (Trophy icon).
- `components/leaderboards/LeaderCard.tsx` — client card.

**Card behavior (iterated this session):**
- Top 5 preview; **tap anywhere on the card** toggles expand → full top 25
  (height-animated via framer-motion), tap again collapses. Cards with ≤5 don't
  toggle. A non-interactive "Show all N ⌄ / Show less ⌃" hint reflects state.
- Rows: rank · player headshot (falls back to team logo) · name · **team logo**
  (replaced the abbr text; abbr is the fallback) · value.
- **Tie-aware competition ranking** computed from values: `T-1, T-1, 3, 4, T-5, …`.
  Medals (🥇🥈🥉) only for a *clean, untied* podium spot; a tie shows `T-n`.
- Relative bars were prototyped then **removed** for a cleaner, denser list.
  Leader row keeps a gold tint + gold value.

**Verify (cheap, PowerShell — no browser):**
```
$r = Invoke-RestMethod http://localhost:4000/api/leaders
$r.boards.Count                 # 12
$r.boards | % { "{0,-18} {1} — {2}" -f $_.label, $_.leaders[0].name, $_.leaders[0].displayValue }
```
All 12 populate (e.g. Passing Yards → Bryce Young 939; Sacks → Greg Rousseau 8.0).

## Files changed
- `components/schedule/ScheduleScreen.tsx` — direction-aware top edge-loader.
- `lib/leaders.ts` — **new** ESPN byathlete data seam.
- `app/api/leaders/route.ts` — **new** GET route.
- `app/leaderboards/page.tsx` — **new** tab page (server component).
- `components/leaderboards/LeaderCard.tsx` — **new** client card.
- `components/BottomNav.tsx` — added Leaders tab.

## Notes / follow-ups
- Player boards are per-current-season (endpoint defaults to current). No new deps.
- Everything is confined to the new route + `lib/leaders.ts` + one BottomNav line;
  no existing stats/compare logic touched.
- Possible next: headshot skeleton/placeholder polish, weekly-leaders toggle,
  more boards (QBR, yards from scrimmage, TFL) — all just new `BOARDS` entries.
