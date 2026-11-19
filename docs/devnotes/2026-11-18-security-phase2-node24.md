# 2026-11-18 — Security phase 2, step 1: Node 20 → 24

Branch `security/phase2-node24`.

## Why

Node 20 ("Iron") reached end-of-life on 2026-04-30, so new Node security bugs are no longer
fixed on 20. Production (`pare` under pm2), the pm2 daemon and nvm's default were all still on
v20.19.2.

## Choice: 24, not 26

| | Status (2026-11-18) | Fixes until | On the Mac mini |
|---|---|---|---|
| 24 "Krypton" | maintenance LTS | 2028-04-30 | v24.22.3 (latest 24), installed |
| 26 "Lithium" | active LTS since 2026-10-28 | 2029-04-30 | not installed |

24 was picked: it's already installed, it's where Next 15.5 is most proven, and 17 months of fixes
remain. Revisit 26 together with the Next 16 upgrade.

## What changed / plan

- CI: `node-version: 24` in both jobs (`check`, `e2e`), so the e2e job browser-tests the Node 24
  production build.
- Production moves at the Phase 2 pm2 switchover: `ecosystem.config.cjs` sets `pare`'s interpreter to
  the Node 24 binary. The **pm2 daemon stays on Node 20**: moving it means `pm2 update` (kill +
  resurrect), which is banned on this shared host. The daemon has no network listener; this is
  recorded as an accepted risk until the security lead OKs a daemon restart.
- Homebrew's `node` is v23.11.0 (odd-numbered, end-of-life). Pare doesn't use it; it's left alone
  (it may serve other projects).

## Verified (workbench, fresh `npm ci` under v24.22.3 / npm 11.19.1)

- `npm run check` exit 0 · `npm run test:run` 586/586 · `npm run build` exit 0 (19/19 pages)
- `npm audit --omit=dev`: 0 critical / 0 high (unchanged)
- e2e: the CI run on this branch (Node 24 production build, 50 tests)
