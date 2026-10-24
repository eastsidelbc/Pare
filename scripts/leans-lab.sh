#!/bin/sh
# Leans lab weekly job (scripts/leans-lab.ts) — scheduled with pm2 on the Mac mini:
#   pm2 start scripts/leans-lab.sh --name leans-lab --cron-restart "0 6 * * 2" --no-autorestart
#   pm2 save
# Output: .cache/leans-lab/<season>/scoreboard.md (+ ledger.json, lab.log). Never commits, never goes live.
cd "$(dirname "$0")/.." || exit 1
exec npx vite-node --config vitest.config.ts scripts/leans-lab.ts --weekly
