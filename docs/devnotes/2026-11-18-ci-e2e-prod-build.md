# 2026-11-18 — CI: Playwright e2e against a production build

Branch `ci/e2e-prod-build`. Part of the 2026-11-18 security hardening.

## Why

- The Playwright suite (`e2e/myteam.spec.ts`, 25 tests × iPhone 393 + iPad 834 = 50) only ran by
  hand on Kobe's dev box, against `npm run dev`.
- On the Mac mini, `localhost:4000` is **production**. With `reuseExistingServer: true` the
  suite silently tested the live site. If prod were down, it would start `npm run dev` on
  :4000, which the Cloudflare tunnel publishes, putting a dev server on the internet. Never run
  Playwright on the Mac mini.
- Standard practice: browser-test every push on a throwaway machine, on the real production
  build, before it can be deployed. This was also on the plan as "Q10: e2e in CI before App Store".

## What changed

- `playwright.config.ts`: when `CI` is set (GitHub sets `CI=true`), the web server is
  `npm run build && npm run start` (production, :4000 on the runner), `reuseExistingServer: false`,
  a 5 min timeout, and an extra HTML report. Local mode is unchanged.
- `.github/workflows/ci.yml`: a new `e2e` job, separate from `check`, so a failure says which kind:
  `npm ci` → `npx playwright install --with-deps chromium` → `npx playwright test`, and the report plus
  traces are uploaded as an artifact on failure (7 days).
  - Actions are pinned to commit SHAs (v4; tag kept in a comment), with `permissions: contents: read`
    and `persist-credentials: false`. The older `check` job gets the same pinning in security phase 5.

## Known caveats

- Pages render with live ESPN data at build/request time on the runner. If ESPN blocks GitHub's
  IPs, the data layer's empty fallbacks apply. The My Team specs mock `/api/myteam/*`, but nav
  and pages still render.
- About +5 min per CI run (build + Chromium install); free on a public repo.
- **"P6 game day (sandbox)" (2 tests × 2 viewports) is skipped in CI on purpose.** The first CI run
  (40 passed / 4 failed / 6 skipped) showed those 4 failing because `/sandbox/myteam` is dev-only
  (`notFound()` in production builds; live `pare.gg/sandbox/myteam` → 404, which is the right
  security posture). They still run locally against `npm run dev`. Making CI cover game day =
  rewrite them against the real `/myteam` with mocked live data (separate task). Unlocking the
  sandbox in production was rejected (it risks shipping a fake-data page).
- The other 6 skips are pre-existing viewport-only tests (phone-only / iPad-only).

## Verified

- `CI=true npx playwright test --list` and local `--list`: 50 tests in both modes (no server started).
- The workflow parses (js-yaml): jobs `check`, `e2e`; e2e permissions `contents: read`.
- `npm run check` exit 0.
- The real proof is the first green `e2e` run on GitHub (linked in the CHANGELOG / PR once green).
