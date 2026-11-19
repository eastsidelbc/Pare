/**
 * pm2 ecosystem: the single source of truth for how Pare runs on the Mac mini.
 * (Security hardening phase 2, docs/devnotes/2026-11-18-security-phase2-node24.md.)
 *
 * SHARED HOST: pm2 on this Mac also runs other projects. Only ever act on Pare's apps,
 * BY NAME, and always with --only:
 *   pm2 start ecosystem.config.cjs --only pare
 *   pm2 reload pare   ·   pm2 restart pare   ·   pm2 logs pare
 * NEVER: `pm2 restart|reload|start|delete all`, `pm2 resurrect`, `pm2 kill`, `pm2 update`.
 *
 * Switching an app onto this file (a one-off, ~10 s blip): pm2 delete <name> && pm2 start
 * ecosystem.config.cjs --only <name> && pm2 save. Today `pare` uses this file; `pare-tunnel`
 * moves at the tunnel-credential rotation (phase 4), `leans-lab` the next time it's touched
 * (starting it runs the weekly job right away).
 */
/* eslint-disable @typescript-eslint/no-require-imports -- pm2 loads ecosystem files as CommonJS; require() is correct here */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Node 24 LTS (fixes until 2028-04-30). Bump this one line for a Node patch: `nvm install 24`,
// verify the binary against nodejs.org SHASUMS256, edit, then `pm2 delete pare && pm2 start …`.
const NODE_VERSION = 'v24.22.3';
const NODE_BIN_DIR = path.join(os.homedir(), '.nvm/versions/node', NODE_VERSION, 'bin');
const NODE = path.join(NODE_BIN_DIR, 'node');
if (!fs.existsSync(NODE)) {
  throw new Error(`ecosystem.config.cjs: ${NODE} not found. Run \`nvm install ${NODE_VERSION}\` first.`);
}

// `pare` serves whatever release ~/pare-current points at (scripts/deploy.sh flips it, then
// `pm2 reload pare`). Hard-coded, not __dirname: Node resolves __dirname to the release's real
// path, which would pin pm2 to one release forever.
const LIVE_DIR = path.join(os.homedir(), 'pare-current');
// The git checkout. leans-lab runs here: its results (.cache/leans-lab) must outlive releases.
const REPO_DIR = path.join(os.homedir(), 'Pare');

const LOGS = path.join(os.homedir(), '.pm2/logs'); // same files as before, so pm2-logrotate keeps working
const LOG_DATE = 'YYYY-MM-DD HH:mm:ss Z';

module.exports = {
  apps: [
    {
      name: 'pare',
      cwd: LIVE_DIR,
      // Run Next directly, not via `npm start`: pm2's stop/reload signals reach the server itself.
      script: 'node_modules/next/dist/bin/next',
      // 127.0.0.1 only: reachable through the Cloudflare tunnel, not from the Wi-Fi.
      args: 'start -H 127.0.0.1 -p 4000',
      interpreter: NODE,
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      autorestart: true,
      min_uptime: '30s', // a run shorter than this counts as a crash…
      max_restarts: 10, // …and after 10 of those in a row pm2 gives up (no endless crash loop)
      exp_backoff_restart_delay: 1000, // waits 1s, 1.5s, 2.25s… (max 15s) between crash restarts
      kill_timeout: 10_000, // give Next 10s to finish in-flight requests on stop/restart
      max_memory_restart: '1G', // ~8x normal (~125 MB); catches a leak, not a busy minute
      watch: false,
      out_file: path.join(LOGS, 'pare-out.log'),
      error_file: path.join(LOGS, 'pare-error.log'),
      merge_logs: true,
      log_date_format: LOG_DATE,
    },
    {
      name: 'pare-tunnel',
      cwd: REPO_DIR,
      script: '/opt/homebrew/bin/cloudflared',
      args: `tunnel --config ${path.join(os.homedir(), '.cloudflared/pare.yml')} run`,
      interpreter: 'none',
      autorestart: true,
      min_uptime: '30s',
      max_restarts: 10,
      exp_backoff_restart_delay: 1000,
      out_file: path.join(LOGS, 'pare-tunnel-out.log'),
      error_file: path.join(LOGS, 'pare-tunnel-error.log'),
      merge_logs: true,
      log_date_format: LOG_DATE,
    },
    {
      name: 'leans-lab',
      cwd: REPO_DIR,
      script: 'scripts/leans-lab.sh',
      interpreter: 'bash',
      cron_restart: '0 6 * * 2', // Tuesdays 06:00 (CLAUDE.md "Leans lab")
      autorestart: false, // one run per cron tick, never looped
      env: {
        PATH: `${NODE_BIN_DIR}:${process.env.PATH ?? '/usr/bin:/bin'}`, // its `npx` uses Node 24 too
      },
      out_file: path.join(LOGS, 'leans-lab-out.log'),
      error_file: path.join(LOGS, 'leans-lab-error.log'),
      merge_logs: true,
      log_date_format: LOG_DATE,
    },
  ],
};
