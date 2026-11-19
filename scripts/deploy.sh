#!/usr/bin/env bash
# Pare deploy, Mac mini only.     npm run deploy  [-- --dry-run | --force | --rollback]
#
# Builds GitHub's main in its own release folder while the live site keeps serving, then flips
# the ~/pare-current pointer and reloads pm2's `pare`. If the new build doesn't answer with the
# right commit (locally and on https://pare.gg), it flips back and fails loudly.
#
#   ~/pare-releases/<time>-<sha>/   one git worktree per release (own node_modules + .next)
#   ~/pare-current -> a release     what pm2's `pare` runs (ecosystem.config.cjs cwd)
#   Kept: the live release + the previous one (`--rollback` = flip back in seconds).
#
# node_modules: if package-lock.json didn't change, the live release's node_modules is cloned
# (APFS copy-on-write: no extra disk, the same files that are already running). If it changed,
# it's a fresh `npm ci` (every package checked against the lockfile). Never `npm install`.
#
# SHARED HOST: every pm2 command here names `pare`. Never all / resurrect / kill / update.
# Tests: PARE_DEPLOY_TEST_FAIL=1 makes the health check fail on purpose (proves auto-rollback).
set -euo pipefail

REPO="$HOME/Pare"
RELEASES="$HOME/pare-releases"
CURRENT="$HOME/pare-current"
APP="pare"
MIN_FREE_GB=3
LOCAL_HEALTH="http://127.0.0.1:4000/api/health"
PUBLIC_HEALTH="https://pare.gg/api/health"
PUBLIC_HOME="https://pare.gg/"
HISTORY="$RELEASES/deploy-history.log"

# ── output ───────────────────────────────────────────────────────────────
red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
step()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
die()   { red "✖ $*"; exit 1; }
history_line() { printf '%s  %-9s %s\n' "$(date '+%Y-%m-%d %H:%M:%S %z')" "$1" "$2" >> "$HISTORY"; }

usage() { sed -n '2,4p' "$0"; exit "${1:-0}"; }

MODE="deploy"; FORCE=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)  MODE="dry-run" ;;
    --rollback) MODE="rollback" ;;
    --force)    FORCE=1 ;;
    -h|--help)  usage 0 ;;
    *)          red "unknown option: $arg"; usage 1 ;;
  esac
done

# ── helpers ──────────────────────────────────────────────────────────────
real_dir() { (cd "$1" 2>/dev/null && pwd -P) || true; }

# One field of pm2's `pare` entry (cwd / interpreter), never the env (it can hold secrets).
pm2_pare() {
  pm2 jlist 2>/dev/null | node -e '
    const a = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const p = a.find((x) => x.name === process.argv[1]);
    if (p) process.stdout.write(String(p.pm2_env[process.argv[2]] ?? ""));
  ' "$APP" "$1"
}

ecosystem_node() { node -p "require('$1/ecosystem.config.cjs').apps.find((a) => a.name === '$APP').interpreter"; }

health_commit() {
  curl -s -m 5 "$1" 2>/dev/null | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      try { process.stdout.write(JSON.parse(s).commit || ""); } catch { /* not JSON yet */ }
    });' || true
}

# wait_for_commit <url> <expected short sha> <seconds>
wait_for_commit() {
  local url="$1" want="$2" secs="$3" got="" i=0
  while [ "$i" -lt "$secs" ]; do
    got="$(health_commit "$url")"
    [ "$got" = "$want" ] && { green "  ✓ $url → $got"; return 0; }
    sleep 2; i=$((i + 2))
    # Progress, so a slow check never looks frozen.
    [ $((i % 6)) -eq 0 ] && echo "    … ${i}s/${secs}s waiting for $want at $url (got '${got:-no answer}')"
  done
  red "  ✗ $url → '${got:-no answer}' (wanted $want after ${secs}s)"
  return 1
}

# Point ~/pare-current at <dir> and make pm2's `pare` serve it.
activate() {
  local target="$1" want_node
  rm -f "$CURRENT.new"
  ln -s "$target" "$CURRENT.new" && mv -fh "$CURRENT.new" "$CURRENT"   # atomic flip
  want_node="$(ecosystem_node "$target")"
  if [ "$(pm2_pare pm_cwd)" = "$CURRENT" ] && [ "$(pm2_pare exec_interpreter)" = "$want_node" ]; then
    pm2 reload "$APP" >/dev/null
    echo "  pm2 reload $APP (~1 s)"
  else
    # First run on the pointer, or the Node version changed: recreate `pare` from the ecosystem file.
    pm2 delete "$APP" >/dev/null 2>&1 || true
    pm2 start "$CURRENT/ecosystem.config.cjs" --only "$APP" >/dev/null
    pm2 save >/dev/null
    echo "  pm2 delete + start $APP from the ecosystem file, then pm2 save (~10 s)"
  fi
}

verify_live() { # <short sha>
  if [ "${PARE_DEPLOY_TEST_FAIL:-0}" = "1" ]; then
    red "  (PARE_DEPLOY_TEST_FAIL=1: health check fails on purpose after 20 s; Ctrl+C during it tests the interrupt rollback)"
    wait_for_commit "$LOCAL_HEALTH" "intentional-mismatch" 20 || return 1
  fi
  wait_for_commit "$LOCAL_HEALTH" "$1" 60 || return 1
  wait_for_commit "$PUBLIC_HEALTH" "$1" 30 || return 1
  local code; code="$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$PUBLIC_HOME" || true)"
  [ "$code" = "200" ] || { red "  ✗ $PUBLIC_HOME → $code"; return 1; }
  green "  ✓ $PUBLIC_HOME → 200"
}

# Keep the live release + one previous; remove older release worktrees.
prune() {
  local live prev d kept=0
  live="$(real_dir "$CURRENT")"; prev="$1"
  for d in $(ls -1d "$RELEASES"/2*/ 2>/dev/null | sed 's:/$::' | sort -r); do
    if [ "$d" = "$live" ] || [ "$d" = "$prev" ]; then continue; fi
    kept=$((kept + 1))
    git -C "$REPO" worktree remove --force "$d" && echo "  removed old release $(basename "$d")"
  done
  git -C "$REPO" worktree prune
  [ "$kept" -eq 0 ] && echo "  nothing to remove"
  return 0
}

# ── preflight ────────────────────────────────────────────────────────────
[ "$(uname)" = "Darwin" ] || die "deploy runs on the Mac mini only"
for c in git npm node pm2 gh curl; do command -v "$c" >/dev/null || die "missing command: $c"; done
mkdir -p "$RELEASES"
mkdir "$RELEASES/.lock" 2>/dev/null || die "another deploy is running (stale? rmdir $RELEASES/.lock)"
REL=""; SWITCHED=0; VERIFIED=0; PREV_DIR=""; SHORT=""; LIVE_COMMIT=""

# Put the previous release back (health failed, or Ctrl+C before it passed). Not interruptible.
roll_back() { # <reason for the history log>
  trap '' INT TERM HUP
  red ""
  red "████  ROLLING BACK to ${LIVE_COMMIT:-previous}: $1  ████"
  activate "$PREV_DIR"
  if wait_for_commit "$LOCAL_HEALTH" "${LIVE_COMMIT:-unknown}" 60; then
    history_line "ROLLBACK" "$SHORT $1 -> back on $LIVE_COMMIT"
    # Old site is healthy again: the failed release is no longer needed (logs are in pm2's files).
    # If the rollback itself is unhealthy (branch below), it stays on disk for inspection.
    if git -C "$REPO" worktree remove --force "$REL"; then echo "  removed failed release $(basename "$REL")"
    else red "  (could not remove $REL; next successful deploy prunes it)"; fi
    red "✖ Deploy of $SHORT did not go live ($1). pare.gg is on ${LIVE_COMMIT}. Logs: pm2 logs $APP"
  else
    history_line "BROKEN" "$SHORT $1, rollback to $LIVE_COMMIT also unhealthy"
    red "✖✖ ROLLBACK ALSO UNHEALTHY. pare.gg may be down. Run: pm2 logs $APP"
  fi
}

# Ctrl+C / kill: before the switch, just stop (cleanup removes the unfinished release); after the
# switch but before the health check passed, roll back first. npm forwards Ctrl+C as SIGTERM.
on_signal() {
  trap '' INT TERM HUP
  red ""; red "Interrupted."
  if [ "$SWITCHED" -eq 1 ] && [ "$VERIFIED" -eq 0 ] && [ -n "$PREV_DIR" ]; then
    roll_back "interrupted before the health check passed"
  fi
  exit 130
}
trap on_signal INT TERM HUP

cleanup() {
  local rc=$?
  if [ "$rc" -ne 0 ] && [ -n "$REL" ] && [ "$SWITCHED" -eq 0 ] && [ -d "$REL" ]; then
    git -C "$REPO" worktree remove --force "$REL" 2>/dev/null && echo "  (removed unfinished release $(basename "$REL"))"
  fi
  rmdir "$RELEASES/.lock" 2>/dev/null || true
}
trap cleanup EXIT

[ -n "$(pm2_pare pm_cwd)" ] || die "pm2 has no '$APP' app"
FREE_GB="$(df -g "$HOME" | awk 'NR==2 {print $4}')"
[ "$FREE_GB" -ge "$MIN_FREE_GB" ] || die "only ${FREE_GB} GB free (need ${MIN_FREE_GB}). Free some disk first."

LIVE_DIR="$(real_dir "$(pm2_pare pm_cwd)")"     # what is serving right now
LIVE_COMMIT="$(health_commit "$LOCAL_HEALTH")"

# ── rollback mode ────────────────────────────────────────────────────────
if [ "$MODE" = "rollback" ]; then
  step "Rollback"
  PREV=""
  for d in $(ls -1d "$RELEASES"/2*/ 2>/dev/null | sed 's:/$::' | sort -r); do
    [ "$d" != "$LIVE_DIR" ] && { PREV="$d"; break; }
  done
  [ -n "$PREV" ] || die "no previous release to roll back to"
  PREV_SHORT="$(git -C "$PREV" rev-parse --short HEAD)"
  echo "  live: ${LIVE_COMMIT:-?}  →  previous: $PREV_SHORT ($(basename "$PREV"))"
  SWITCHED=1; activate "$PREV"
  verify_live "$PREV_SHORT" || die "rollback health check failed; check: pm2 logs $APP"
  history_line "rollback" "$LIVE_COMMIT -> $PREV_SHORT"
  green "✔ Rolled back to $PREV_SHORT"
  exit 0
fi

# ── 1. what to deploy ────────────────────────────────────────────────────
step "1/6 GitHub main"
git -C "$REPO" fetch --quiet origin main
SHA="$(git -C "$REPO" rev-parse origin/main)"
SHORT="$(git -C "$REPO" rev-parse --short origin/main)"
echo "  live: ${LIVE_COMMIT:-?}   GitHub main: $SHORT   free disk: ${FREE_GB} GB"
if [ "$SHORT" = "$LIVE_COMMIT" ] && [ "$FORCE" -eq 0 ] && [ "$MODE" = "deploy" ]; then
  green "✔ $SHORT is already live (use --force to redeploy it)"; exit 0
fi

# ── 2. CI must be green for that exact commit ────────────────────────────
step "2/6 CI gate"
CI_STATE="$(cd "$REPO" && gh run list --commit "$SHA" --workflow ci.yml -L 1 --json status,conclusion -q '.[0] | "\(.status) \(.conclusion)"' 2>/dev/null || true)"
[ "$CI_STATE" = "completed success" ] || die "CI for $SHORT is '${CI_STATE:-not found}', not green. Wait for it (gh run list) or fix it."
green "  ✓ CI green for $SHORT"

# ── 3. release folder + packages ─────────────────────────────────────────
step "3/6 Release folder"
REL="$RELEASES/$(date +%Y%m%d-%H%M%S)-$SHORT"
git -C "$REPO" worktree add --detach --quiet "$REL" "$SHA"
echo "  $REL"
NODE_BIN="$(ecosystem_node "$REL")"
export PATH="$(dirname "$NODE_BIN"):$PATH"
echo "  node $(node -v) (from ecosystem.config.cjs)"
if [ -d "$LIVE_DIR/node_modules" ] && cmp -s "$LIVE_DIR/package-lock.json" "$REL/package-lock.json"; then
  cp -cR "$LIVE_DIR/node_modules" "$REL/node_modules"
  echo "  package-lock.json unchanged → node_modules cloned from the live release (no extra disk)"
else
  echo "  package-lock.json changed → fresh npm ci"
  (cd "$REL" && npm ci --no-audit --no-fund)
fi

# ── 4. check + tests + build (live site untouched) ───────────────────────
step "4/6 Check, tests, build"
(cd "$REL" && npm run check && npm run test:run && npm run build) || die "check/tests/build failed; live site untouched"

if [ "$MODE" = "dry-run" ]; then
  green "✔ Dry run OK: $SHORT built and tested in $REL (not switched; removing it)"
  git -C "$REPO" worktree remove --force "$REL"; REL=""
  exit 0
fi

# ── 5. switch + health ───────────────────────────────────────────────────
step "5/6 Switch"
PREV_DIR="$LIVE_DIR"
SWITCHED=1
activate "$REL"
if ! verify_live "$SHORT"; then
  roll_back "health check failed"
  exit 1
fi
VERIFIED=1

# ── 6. tidy ──────────────────────────────────────────────────────────────
step "6/6 Tidy"
prune "$PREV_DIR"
history_line "deploy" "$LIVE_COMMIT -> $SHORT"
green ""
green "✔ Deployed $SHORT  (previous: ${LIVE_COMMIT:-?}, undo: npm run deploy -- --rollback)"
