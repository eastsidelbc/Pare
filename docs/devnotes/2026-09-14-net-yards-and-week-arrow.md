# Dev Note — 2026-09-14 — Fix A: NET offense yards · Fix B: week-boundary arrows

> Rules & architecture live in `CLAUDE.md`; this note is implementation rationale only.
> State authority: `CHANGELOG.md` `[Unreleased]`.

## Fix A — offense yards must be NET (match defense-allowed)
**Symptom:** a team's offense yards didn't equal its opponent's defense-allowed.
GB defense-allowed (via Vikings) showed 419/353/66, but GB offense showed
453/387/66 — passing & total each off by 34 (sack yardage); rushing matched.

**Confirmed hypothesis** (GB, id 9, 2026 team-statistics feed):
- `passingYards` 387 − `netPassingYards` 353 = **34**
- `totalYards` 453 − `netTotalYards` 419 = **34** = `sackYardsLost`
So Step 2 mapped GROSS yards; the defense aggregation (box scores) uses NET
(official). 

**Fix** (`lib/espnStats.ts` `ESPN_FIELD_MAP`, offense only):
- `total_yards ← netTotalYards` (was `totalYards`)
- `pass_yds ← netPassingYards` (was `passingYards`)
- `rush_yds` unchanged. Defense untouched.
`DATA_SOURCES.md` core-metric mapping table updated to NET (with a note).

**Re-verify (cheap):**
- GB offense → **419 / 353 / 66** = Vikings allowed. Spot-checks: HOU offense
  381/257/124 = BUF allowed; NE offense 277/168/109 = SEA allowed.
- League-wide offense-gained vs defense-allowed:
  total **10094/10094**, pass **6524/6524**, rush **3570/3570** — all MATCH.

## Fix B — disable week arrows at the boundaries
`components/schedule/ScheduleBoard.tsx` already computed `atMin = week <= 1` /
`atMax = week >= 18` and passed `disabled` to `StepButton`. Hardened it so it's
unambiguously non-tappable (not just a no-op):
- native `disabled`, `aria-disabled`, `onClick` gated to `undefined` when disabled
- `pointer-events: none`, `cursor: not-allowed`, greyed (opacity 0.35), and the
  `active:opacity-60` tap feedback removed while disabled.

**Verify (code-level, no browser):** at Week 1 `atMin` → `‹` disabled; at Week 18
`atMax` → `›` disabled. `loadWeek` also bounds-guards (`< MIN_WEEK || > MAX_WEEK`).

## Files changed
- `lib/espnStats.ts` — NET offense yard mapping.
- `DATA_SOURCES.md` — mapping table → NET + note.
- `components/schedule/ScheduleBoard.tsx` — hardened disabled arrows.
- `CHANGELOG.md` — `[Unreleased]` entry.

Lint: `npx eslint lib/espnStats.ts components/schedule/ScheduleBoard.tsx` clean.
