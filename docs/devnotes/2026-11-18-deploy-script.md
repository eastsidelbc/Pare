# 2026-11-18 — `npm run deploy` (release folders + pointer + auto-rollback)

Branch `ops/deploy-script`. Security hardening phase 2.

## Why

The old deploy (`git pull → npm install → clean → build → pm2 restart`) rebuilt `.next` and
`node_modules` in the folder production was serving from, so pare.gg threw errors for 1–2 minutes
on every deploy, and a failed build left the site broken with nothing to fall back to.

## Design

- **Release folders + a pointer** (the standard "atomic symlink" deploy):
  `~/pare-releases/<YYYYMMDD-HHMMSS>-<sha>/` is a detached git worktree of GitHub `main`, with its
  own `node_modules` + `.next`. `~/pare-current` is a symlink to the live one, and pm2 `pare`'s
  cwd (`ecosystem.config.cjs`, hard-coded because Node resolves `__dirname` to the real path).
  pm2 keeps the cwd path as written (`path.resolve`, pm2 `lib/Common.js:149`), so `pm2 reload pare`
  follows the pointer.
- **Keep the live release + 1 previous.** Kobe chose this over keeping only the new one: about 40 MB
  for a seconds-long `--rollback`, against a ~2 min rebuild.
- **node_modules:** if `package-lock.json` is identical to the live release's, `cp -cR` clones it
  (APFS copy-on-write: no extra disk, the exact files already serving). If it changed, it's a fresh
  `npm ci` (lockfile integrity-checked). A per-deploy fresh `npm ci` was considered (stronger) and
  rejected for disk (~550 MB per release, the disk is 98% full); the security check's tamper scan
  covers the cloned files.
- **Gates before anything is built:** macOS only; one deploy at a time (`.lock`); ≥ 3 GB free;
  CI for that exact commit `completed success` (`gh run list --commit`).
- **Health:** `/api/health` must return the new commit on `127.0.0.1:4000` (60 s) and on
  `https://pare.gg` (30 s), and `https://pare.gg/` must return 200. Otherwise it flips back and
  checks the old commit answers. `PARE_DEPLOY_TEST_FAIL=1` forces the failure to prove the rollback.
- **pm2:** every command names `pare`. Plain `pm2 reload pare` when pm2 already runs from the
  pointer on the same Node; otherwise (first run, or a Node bump in the ecosystem file)
  `pm2 delete pare && pm2 start ~/pare-current/ecosystem.config.cjs --only pare && pm2 save`.
- **History:** `~/pare-releases/deploy-history.log` gets one line per deploy / rollback.
- leans-lab and pare-tunnel run from `~/Pare` (leans-lab's `.cache/leans-lab` must outlive releases).

## First run = migration

pm2 `pare` currently runs from `~/Pare`. The first `npm run deploy` builds a release, points
`~/pare-current` at it, and recreates `pare` from the ecosystem file (one ~10 s blip). If that
fails its health check, `~/pare-current` points at `~/Pare`, which still holds the running build,
so the rollback target exists even on the first run.

## Verified

- `bash -n` (macOS bash 3.2) OK; every pm2 call names `$APP` (`pare`), none use all / resurrect / kill / update.
- `npm run deploy -- --dry-run` on the Mac mini: GitHub main `0a8bc96`, CI gate green, release
  folder built, 586/586 tests, build 19/19, release removed. Free disk 7 GB before and after;
  live site untouched (`/api/health` still `0a8bc96`).
- First real deploy (migration), 21:45:41 → 21:46:17: `0a8bc96 → 5409e16`. pm2 `pare` cwd
  `~/pare-current` → `~/pare-releases/20261118-214541-5409e16`, Node 24, 127.0.0.1 only, all pages 200,
  offense/defense 32 rows, no new errors, `pm2 save`d. Disk unchanged (node_modules cloned).
- Follow-up fix: after a successful rollback the failed release folder is removed right away
  (before, it waited for the next successful deploy's prune). If the rollback is itself unhealthy,
  the folder is kept for inspection.
- **First rollback test, interrupted (21:58):** the forced failure waited 60 + 30 s in silence, so it
  looked frozen and Kobe pressed Ctrl+C. The script died without rolling back or cleaning up: new
  release live (harmless, real code `89eff0c`), no history line, stale `.lock` (later deploys refused
  with "another deploy is running"). Lock removed by hand after confirming no deploy process.
- Fixes: (1) health waits print progress every 6 s; test mode fails after 20 s, not 90.
  (2) `trap on_signal INT TERM HUP`: Ctrl+C after the switch but before the health check passed rolls
  back first (`roll_back`, not interruptible), then exits 130; the EXIT trap always removes the lock.
  Proven with a throwaway `npm run` + bash script sent SIGINT to its whole process group (as a terminal
  Ctrl+C does): the handler ran, then cleanup ran with rc=130.
- Rollback tests on the fixed script (forced failure; Ctrl+C during the wait): pending.
