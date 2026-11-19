# 2026-11-19 — Security phase 3, step 3: generic errors, `/api/health` trim, `PUT` → 405

Branch `security/phase3-errors-health`. Audit findings L1–L3.

- **L1 generic errors.** When ESPN fails and a last-good copy is served, `/api/nfl-2025/offense`,
  `/defense` and `/last4` sent the raw upstream error text (`error: msg`). They now send
  `error: 'upstream-unavailable'`; the details still go to the server log (`logger.error` /
  `console.error`). Clients only read `stale` (`lib/useNflStats.ts`), never `error`.
- **L2 `/api/health`** now returns `{ ok, commit, builtAt }` only (dropped `version`, `uptime`,
  `environment`, `endpoints`, `X-Health-Check`), `no-store`, `force-dynamic`. `scripts/deploy.sh`,
  the smoke scripts and uptime checks only use the status and `commit`.
- **L3 `preferences`:** the `PUT` stub (200 "saved: false" for any body) is removed, so Next answers
  405 for any write method. `GET` stays (unused). Add a real validated handler when preferences
  are stored.

Tests (`e2e/security.spec.ts`, CI production build): health keys are exactly `builtAt, commit, ok`;
`PUT` and `POST /api/preferences` → 405.
