# 2026-10-12 — tsconfig: drop deprecated `baseUrl`

## Why
VS Code showed a red error on `"baseUrl": "."` in `tsconfig.json`:
"Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0."
The editor uses its bundled TypeScript 6.x; the project pins 5.9.3, so `npm run check` / build never complained.

## What changed
- `tsconfig.json` — removed `"baseUrl": "."`. Kept `"paths": { "@/*": ["./*"] }`; since TS 4.1 `paths` resolves relative to the tsconfig file, so `@/` imports behave the same.
- Checked: no bare imports relied on `baseUrl` (e.g. `from 'lib/...'`) in app code.

## Verification
- `npm run check` (tsc + eslint) passes.

## Open risks / notes
- The other line-1 warning ("Unable to load schema from schemastore.org") is a VS Code setting (`json.schemaDownload.enable` off), not a repo issue.
- Optional: "TypeScript: Select TypeScript Version → Use Workspace Version" so the editor matches CI (5.9.3).
