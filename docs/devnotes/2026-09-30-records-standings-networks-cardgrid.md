# Dev note — Team records, Standings tab, broadcast networks, responsive CardGrid

**Date:** 2026-09-30
**Scope:** Home (schedule) + Compare + new Standings tab + Leaders, plus a shared responsive card layout.

All data comes from ESPN's free/public endpoints already in use — **no new external data sources** were added. Everything rides the existing ~1h caches.

---

## 1. Team records (W–L–T) on Home and Compare

Show each team's overall record, sports-site style.

**Home (schedule cards):** records are read straight out of the ESPN **scoreboard** payload we already fetch for the schedule — zero extra network calls.
- `lib/espnScoreboard.ts` — added `records` to the competitor shape; in `mapEspnScoreboard` pull `competitor.records.find(r => r.name === 'overall')?.summary`.
- `lib/schedule.ts` — added `awayRecord` / `homeRecord` to the `Matchup` type; fallback week sets them `null`.
- `components/schedule/ScheduleProvider.tsx` — carry the two record fields through the live-score merge (`patchLiveMatchups` + `differsLive`).
- `components/schedule/MatchupCard.tsx` — render the record under each team's nickname.

**Compare (panel headers):** record comes from the ESPN **standings** data we already fetch for defense.
- `lib/espnStats.ts` — `fetchDefenseStatsFromESPN` already reads wins/losses/ties; now also sets `row.record = "W-L(-T)"`.
- `utils/teamDataTransform.ts` — added `'record'` to the per-game skip list. **Gotcha:** `parseFloat("2-1") === 2`, so without this the PG/TOT toggle silently turned the record into a number.
- Rendered under each team logo in both panels: `components/mobile/MobileCompareLayout.tsx` → `CompactPanel.tsx` → `CompactPanelHeader.tsx`, and desktop `components/OffensePanel.tsx` / `DefensePanel.tsx` (record read from the raw `defenseData` row).

Verified: `/api/nfl-2025/defense` returns `record` for all 32 teams; records render on both tabs and match standings.

---

## 2. New Standings tab (4th nav tab)

AFC / NFC → four divisions each → a card per division with ESPN-style columns.

- `components/BottomNav.tsx` — added the **Standings** tab (`ListOrdered` icon) between Compare and Leaders.
- `lib/teams.ts` — added static `conference` ('AFC'|'NFC') and `division` ('North'|'South'|'East'|'West') to all 32 teams. ESPN groups standings by conference only (flat), so we group into divisions ourselves from this static map.
- `lib/standings.ts` (new, `server-only`) — fetches the ESPN standings endpoint, maps each entry to a `TeamStanding` (W, L, T, PCT, PF, PA, diff, streak, divRecord), groups by conference → division. Cached ~1h. **Last-good in-memory fallback** so a transient ESPN rate-limit doesn't blank the tab (mirrors the defense route's resilience).
- `app/api/standings/route.ts` (new) — returns the grouped JSON (parity with `/api/leaders`, iOS-ready).
- `app/standings/page.tsx` (new) — same fixed-header + single-scroll shell as Leaders. Sections ordered **NFC then AFC**; divisions ordered **North, South, East, West**.
- `components/standings/DivisionTable.tsx` (new) — ESPN-style columns `TEAM | W | L | T | PCT | PF | PA | STRK`, division leader tinted gold.

**Tiebreakers:** we do **not** hand-sort. ESPN already returns teams in official NFL tiebreaker order (head-to-head → division record → common games → conference record → strength of victory/schedule → …), so `lib/standings.ts` preserves ESPN's order rather than sorting by point differential (which was an early, wrong simplification).

---

## 3. Broadcast network on Home cards

Each upcoming game shows its network next to the kickoff time.

- Pulled from the **same scoreboard payload** (`competition.broadcasts[0].names[0]`) — no extra fetch. "Prime Video" is shortened to "Prime"; everything else (FOX/CBS/NBC/ABC/ESPN/NFL Net) passes through.
- `lib/espnScoreboard.ts` + `lib/schedule.ts` (`network` field on `Matchup`, null fallback) + `ScheduleProvider.tsx` (live merge) + `MatchupCard.tsx` (rendered inline next to the time, same font/size/color as the time: `DAY` / `time · NETWORK` / betting line).
- Pre-game only (ESPN drops it once a game is final), same as the betting line.
- **Decision:** text label, **not** logos — network logos are broadcaster trademarks; a styled text label avoids that and needs no assets.

---

## 4. Shared responsive card layout — `CardGrid`

House standard for any grid of cards. Replaces hand-set breakpoints.

- `components/ui/CardGrid.tsx` (new) — one rule: CSS `grid` with `repeat(auto-fit, minmax(minCard, maxCard))`. Fits as many cards per row as the width allows and reflows live on resize/rotate — no JS device detection, no per-page breakpoints.
  - `maxCols` caps columns (and the grid's `max-width`) so wide monitors look intentional.
  - `justify-content: center` + `margin-inline: auto` so a **partial** row (e.g. 2 cards on a portrait tablet) is centered, not left-packed with the gap dumped on the right.
  - `maxCard` keeps card internals tight (the earlier "numbers spread across the card" problem came from columns stretching; capping card width fixes it for good).
- **Standings** → `<CardGrid maxCols={4}>` — one clean row per conference on desktop; 3 / 2 / 1 as it narrows.
- **Leaders** (`app/leaderboards/page.tsx` + `components/leaderboards/FantasyBoards.tsx`) → `<CardGrid maxCols={5}>` with a smaller min — flows up to 5 across on wide screens instead of a fixed 2.
- Containers widened to `max-w-[1440px]` on both pages so the grids have room.

On an iPad Pro 11": Standings shows **2 cards portrait / 3 landscape** (4 on a wide desktop); Leaders shows more across. All from the single `auto-fit` rule.

**Going forward:** any new tab/card set should use `<CardGrid maxCols={N}>` — documented as the house pattern in `ways-of-working`.

---

## Environment gotcha (not a code bug)

The dev server (Next 15 / Turbopack) sometimes **misses file writes made from outside the editor** (our edits land on disk via the device bridge). Symptoms this session: a change not showing up after a commit, and once a *partial* module (new constant name + old JSX) that threw `COLS is not defined`. The files on disk were correct each time; re-committing forced a fresh compile. Fix: restart `npm run dev`, or set `WATCHPACK_POLLING=true` so Next polls for changes instead of relying on FS events.

Also harmless and seen this session: `LF will be replaced by CRLF` warnings (Git line-ending normalization on Windows) and `Unlink of .idx failed` on push (OneDrive/AV locking old pack files under `Documents` — press `n`, the push already completed).

---

## Files touched

**New:** `lib/standings.ts`, `app/api/standings/route.ts`, `app/standings/page.tsx`, `components/standings/DivisionTable.tsx`, `components/ui/CardGrid.tsx`

**Changed:** `lib/teams.ts`, `lib/schedule.ts`, `lib/espnScoreboard.ts`, `lib/espnStats.ts`, `utils/teamDataTransform.ts`, `components/BottomNav.tsx`, `components/schedule/MatchupCard.tsx`, `components/schedule/ScheduleProvider.tsx`, `components/mobile/MobileCompareLayout.tsx`, `components/mobile/CompactPanel.tsx`, `components/mobile/CompactPanelHeader.tsx`, `components/OffensePanel.tsx`, `components/DefensePanel.tsx`, `app/leaderboards/page.tsx`, `components/leaderboards/FantasyBoards.tsx`
