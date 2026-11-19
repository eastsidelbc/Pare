# 2026-11-18 — Security phase 1: Next.js patch + postcss / source-map-js

Branch `security/phase1-next-patch`. First fix from the 2026-11-18 security audit.

## What changed

| Package | Before | After | Why |
|---|---|---|---|
| `next` | 15.5.27 | 15.5.29 | GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r (patched in 15.5.28) |
| `eslint-config-next` | 15.5.4 | 15.5.29 | keep in step with `next` |
| `postcss` (inside `next`) | 8.4.31 | 8.5.28 (deduped with ours) | ≤ 8.5.22 advisories; via `overrides` |
| `source-map-js` | 1.2.1 | 1.2.3 | GHSA-68fv-2mgg-jv7q |

## Decisions

- **Stayed on 15.x, not 16.** The advisories have a patched 15.5.x, so a patch bump fixes them
  with no code changes. Next 16 is a separate, deliberate upgrade.
- **`overrides.next.postcss = ^8.5.23`.** Even 15.5.29 pins `postcss: 8.4.31`. postcss only runs
  at build time on our own CSS, so this was never reachable by visitors, but it kept the audit
  gate red. The override is the standard npm way to swap a nested version. **Remove it when
  upgrading to Next 16** (16.4.6 depends on 8.5.23 itself).
- **source-map-js** was a nested dep `npm update` didn't move. Its lockfile entry was dropped and
  re-resolved by `npm install` (postcss allows `^1.2.1` → 1.2.3), so there's no second override.
- **Exposure in practice was low:** the RCE needs glibc Linux (Pare runs on macOS, and sharp
  was already the fixed 0.35.5), and the DoS needs Server Actions (Pare has none). Patched anyway.

## Verified (in a separate worktree, prod untouched)

- `npm audit --omit=dev` → 0 critical, 0 high (2 moderate left: `postcss-selector-parser` inside
  `@tailwindcss/typography`, build-time only; the plugin looks unused, no `prose` classes).
- `npm run check` exit 0 · `npm run test:run` 586/586 · `npm run build` exit 0 (19/19 pages,
  no `.map` files in `.next/static`) · `npm ci --dry-run` exit 0.
- e2e runs after deploy (Playwright reuses whatever is on :4000).

## Still open (dev-only)

The vitest 2 chain (vitest, vite, esbuild, tinypool) still shows 2 critical and 1 high. Those tools
only run locally while tests or a dev server run; the fix is vitest 4 (major) and is tracked
separately.

The Mac's npm 10.8 drops `"libc"` fields from the lockfile (cross-platform churn, harmless).
