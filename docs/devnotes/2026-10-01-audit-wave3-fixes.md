# Audit Wave 3 — fixes (2026-10-01)

Rationale-only note; see `CLAUDE.md` for architecture and `docs/audits/2026-10-01-audit.md`
for the full audit this implements. Scope = the audit's **Wave 3** (Medium + quick Low).
**Excluded on purpose:** iOS H2/M4 (ATS + prod URL) — being reworked separately; and the
M3 bar-math change itself (currently latent — see below).

## What changed and why

- **M1 — ordinal bug (correctness + a11y).** `useRanking`/`calculateBulkRanking` printed
  "21th/22th/23th/31th". New single source `utils/ordinal.ts` (`ordinalSuffix`, `formatRank`)
  now used by `useRanking`, `calculateBulkRanking`, and `RankBadge` (its correct copy was the
  template). Killed 3 divergent impls.

- **M2 — prod logging.** Removed the ungated `console.log('🎨 … theme', theme)` in
  `useTheme` (ran on every comparison row render in prod). Gated `RankingDropdown`'s
  `[Diag]` effect and `handleTeamSelect` logs behind `NODE_ENV !== 'production'`.

- **M6 — metric config hygiene.** `availableInOffense/Defense` now reflect what the data
  layer actually fills (see the new AVAILABILITY CONVENTION comment in `metricsConfig.ts`,
  kept in sync with `lib/espnStats.ts`). Dead-but-selectable metrics are hidden; removed the
  duplicate `penalties_yds` and the ghost `penalty_first_down`. Defaults are unaffected
  (all 5 are data-backed). A stale persisted metric key is harmless — `DynamicComparisonRow`
  already guards `if (!metric) return null`.

- **M3 — latent defense bar inversion (comment only).** `useBarCalculation` swaps values
  for defense assuming lower=better. That's correct for every metric now exposed on defense.
  Added a comment there documenting the assumption; M6 removes the only way to reach the bug
  (no higher-is-better metric is selectable on defense). Revisit the swap (key off the
  metric's `higherIsBetter`, not `panelType`) only if a "forced/made" defense metric + data
  source is added.

- **Quick lows.** L1: `/api/nfl-2025/*` stop leaking `message`/`errorType` to the client
  (still logged server-side). L5: `tailwind.config` typography plugin `require(...)` (the
  `import(...)` returned a Promise and never loaded). L7: `substr`→`slice`. L3: manifest
  copy "2025 stats"→"NFL stats".

- **M5 — tests + CI (new).** Added Vitest (`vitest.config.ts` with the `@` alias so source
  `@/...` imports resolve; node env, pure-logic only). Tests: `utils/__tests__/ordinal`,
  `teamHelpers` (rewritten from the old assertion-less console-log file), `teamDataTransform`;
  `lib/comparisons/__tests__/store`; `lib/__tests__/useRanking` (`calculateBulkRanking` —
  ordinals incl. the 21st/31st regression, ties, lower-is-better, special-team exclusion).
  `.github/workflows/ci.yml` runs `npm run check` + `npm run test:run`.

## One-time setup required (Kobe)

`vitest` was added to `package.json` but the lockfile isn't updated from here. Run once:

```bash
npm install          # adds vitest, syncs package-lock.json
npm run test:run     # should be all green
npm run check        # tsc + eslint
git add -A && git commit   # include the updated package-lock.json (CI uses `npm ci`)
```

## Verification done in this session (and its limits)

This was edited through the filesystem bridge — **no build/tsc/lint/test was executed here.**
Self-check was by re-reading every edited region: edits applied cleanly (git-style diffs
confirmed), no orphaned code left behind, imports added where needed, removed metric keys are
unreferenced except via the guarded dynamic lookup. **Please run `npm run check` +
`npm run test:run` locally to confirm** before committing — that's exactly what M5/CI is for.
