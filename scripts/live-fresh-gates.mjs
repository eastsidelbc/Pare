#!/usr/bin/env node
/**
 * Phase gates for docs/plans/2026-10-12-live-freshness.md.
 *
 *   node scripts/live-fresh-gates.mjs <f0|f1|f2|f3|all>
 *   node scripts/live-fresh-gates.mjs build <name>   # port check + clean + build → <ART>/build-<name>.txt
 *
 * Prints a PASS/FAIL table; exits 1 on any failure. Every build first checks
 * port 4000 is free (a running `npm run dev` would have its .next clobbered),
 * then runs `npm run clean` + `npm run build`. Helpers copied from
 * scripts/live-proxy-gates.mjs (that script is left as the proxy plan's record).
 *
 * Placeholder checks ignore `TBD-F3` quoted in backticks (the plan's own rule text).
 *
 * `all` = every static check that still holds after F3 (phase-snapshot checks
 * like F0's "app code unchanged" are skipped) + check/test/build once + the
 * route-table diff vs build-f0.txt + f3-smoke.json pass:true. It never rewrites
 * tracked files: its build output goes to the OS temp dir.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffRouteTables } from './route-table-diff.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLAN = 'docs/plans/2026-10-12-live-freshness.md';
const ART = 'docs/plans/2026-10-12-live-freshness';
const FIX = 'lib/__fixtures__/espn';
const IS_WIN = process.platform === 'win32';

// ── helpers ──────────────────────────────────────────────────────────────
const rows = [];
const record = (phase, name, ok, detail = '') => {
  rows.push({ phase, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${phase}] ${name}${detail ? `  — ${detail}` : ''}`);
};

const abs = (p) => join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8').replace(/\r\n/g, '\n');
const readJson = (p) => JSON.parse(read(p));

/** `shell` only for npm/npx (.cmd shims on Windows); a shell would split args with spaces. */
function sh(cmd, args, { quiet = false, shell = IS_WIN && (cmd === 'npm' || cmd === 'npx') } = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell, maxBuffer: 64 * 1024 * 1024 });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  if (!quiet && res.status !== 0) console.log(out.split('\n').slice(-40).join('\n'));
  return { code: res.status ?? 1, out, stdout: res.stdout ?? '' };
}
const git = (...args) => sh('git', args, { quiet: true });
const atMain = (p) => git('show', `main:${p}`).stdout.replace(/\r\n/g, '\n');

function portFree(port = 4000) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, () => srv.close(() => resolve(true)));
  });
}

const tempDir = () => mkdtempSync(join(tmpdir(), 'pare-fresh-gates-'));

/** Port check → clean → build; writes the build log to `outPath`. */
async function build(phase, outPath) {
  if (!(await portFree())) {
    record(phase, 'port 4000 free before build', false, 'stop npm run dev first');
    return false;
  }
  record(phase, 'port 4000 free before build', true);
  const clean = sh('npm', ['run', 'clean']);
  const res = sh('npm', ['run', 'build']);
  writeFileSync(outPath, res.out);
  record(phase, 'npm run clean + npm run build', clean.code === 0 && res.code === 0, `log → ${outPath}`);
  return res.code === 0;
}

function npmCheck(phase) {
  record(phase, 'npm run check', sh('npm', ['run', 'check']).code === 0);
}
function npmTest(phase) {
  record(phase, 'npm run test:run', sh('npm', ['run', 'test:run']).code === 0);
}

/** Run vitest with the JSON reporter → { passed, failed, names }. */
function vitestJson(files) {
  const out = join(tempDir(), 'vitest.json');
  sh('npx', ['vitest', 'run', ...files, '--reporter=json', `--outputFile=${out}`], { quiet: true });
  if (!existsSync(out)) return { passed: 0, failed: -1, names: [] };
  const j = JSON.parse(readFileSync(out, 'utf8'));
  const names = j.testResults.flatMap((f) => f.assertionResults.map((a) => a.fullName ?? a.title));
  return { passed: j.numPassedTests, failed: j.numFailedTests + (j.numRuntimeErrorTestSuites ?? 0), names };
}

/** Wrap a static check so a thrown error becomes a FAIL row, not a crash. */
function check(phase, name, fn) {
  try {
    const res = fn();
    const [ok, detail] = Array.isArray(res) ? res : [Boolean(res), ''];
    record(phase, name, ok, detail);
  } catch (err) {
    record(phase, name, false, err instanceof Error ? err.message : String(err));
  }
}

const has = (p, ...needles) => {
  const text = read(p);
  const missing = needles.filter((n) => (n instanceof RegExp ? !n.test(text) : !text.includes(n)));
  return [missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : ''];
};
const lacks = (p, re) => {
  const m = read(p).match(re);
  return [!m, m ? `found "${m[0]}"` : ''];
};
const lines = (out) => out.split('\n').map((s) => s.trim()).filter(Boolean);
const changedVsMain = (...paths) => lines(git('diff', '--name-only', 'main', '--', ...paths).stdout);

/** Text from `export function NAME(` (or `interface NAME`) up to its opening `{`. */
function signature(text, name) {
  const fn = text.indexOf(`export function ${name}(`);
  if (fn >= 0) return text.slice(fn, text.indexOf('{', text.indexOf(')', fn)) + 1);
  const iface = text.search(new RegExp(`(export )?interface ${name}\\b`));
  if (iface >= 0) return text.slice(iface, text.indexOf('\n}', iface) + 2);
  return null;
}

/** `export function NAME(` up to its closing `}` at column 0. */
function functionBlock(text, name) {
  const i = text.indexOf(`export function ${name}(`);
  return i < 0 ? null : text.slice(i, text.indexOf('\n}', i) + 2);
}

/** The `it('<prefix>…` block, from its line up to the `});` at the same indent. */
function itBlock(text, prefix) {
  const all = text.split('\n');
  const start = all.findIndex((l) => l.trimStart().startsWith(`it('${prefix}`));
  if (start < 0) return null;
  const indent = all[start].match(/^\s*/)[0];
  const end = all.findIndex((l, i) => i > start && l === `${indent}});`);
  return end < 0 ? null : all.slice(start, end + 1).join('\n');
}

/** Tracked changes vs main + untracked files in code folders. */
function touched() {
  const untracked = lines(git('ls-files', '--others', '--exclude-standard', '--', 'app', 'components', 'lib', 'scripts', 'utils', 'config').stdout);
  return [...new Set([...changedVsMain(), ...untracked])];
}

// ── shared constants ─────────────────────────────────────────────────────
const LIVE_TESTS = ['liveWindow', 'liveCache', 'liveRoutes', 'liveParity', 'liveClient'].map((n) => `lib/__tests__/${n}.test.ts`);
const F0_FILES = ['scripts/live-fresh-gates.mjs', `${ART}/build-f0.txt`, PLAN];
const F1_FILES = [
  'lib/liveWindow.ts',
  'lib/hooks/useLiveScores.ts',
  'lib/espnLive.ts',
  'lib/apiCache.ts',
  'lib/espnScoreboard.ts',
  'lib/scheduleRefresh.ts',
  'app/api/live/scoreboard/route.ts',
  'lib/__tests__/liveWindow.test.ts',
  'lib/__tests__/liveRoutes.test.ts',
];
/** Files whose comments must not still say 15s (F1). */
const NO_15S = [
  'lib/hooks/useLiveScores.ts',
  'lib/espnLive.ts',
  'lib/liveWindow.ts',
  'lib/apiCache.ts',
  'lib/espnScoreboard.ts',
  'lib/scheduleRefresh.ts',
  'app/api/live/scoreboard/route.ts',
];
/** Kickoff-cap tests that F1 must not edit: [test file, it() name prefix]. */
const KICKOFF_TESTS = [
  ['lib/__tests__/liveWindow.test.ts', 'kickoff cap:'],
  ['lib/__tests__/liveWindow.test.ts', 'kickoff cap never goes below 1s'],
  ['lib/__tests__/liveWindow.test.ts', 'stale when window opens'],
  ['lib/__tests__/liveRoutes.test.ts', 'kickoff not delayed'],
];
const ROUTES = ['app/api/live/scoreboard/route.ts', 'app/api/live/summary/route.ts'];
const SMOKE = `${ART}/f3-smoke.json`;

// ── static checks per phase (`final: false` = only valid at that phase) ─
const STATIC = {
  f0: [
    ['build-f0.txt lists /standings /leaderboards /', () => has(`${ART}/build-f0.txt`, '/standings', '/leaderboards', /[┌├└] [○●ƒ◐] \/\s/)],
    ['diffRouteTables(build-f0, build-f0): 0 failures (/api/live/* are ƒ)', () => {
      const text = read(`${ART}/build-f0.txt`);
      const res = diffRouteTables(text, text);
      return [res.failures.length === 0, res.failures.join('; ') || `${res.before} routes`];
    }],
    ['vitest live* (5 files) ≥30 passed, 0 failed', () => {
      const r = vitestJson(LIVE_TESTS);
      return [r.failed === 0 && r.passed >= 30, `${r.passed} passed, ${r.failed} failed`];
    }],
    ['app code unchanged vs main (app components lib next.config.ts package*.json)', () => {
      const out = changedVsMain('app', 'components', 'lib', 'next.config.ts', 'package.json', 'package-lock.json');
      return [out.length === 0, out.join(', ')];
    }, { final: false }],
  ],
  f1: [
    ['vitest liveWindow + liveRoutes: 0 failed, has "freshness budget"', () => {
      const r = vitestJson(['lib/__tests__/liveWindow.test.ts', 'lib/__tests__/liveRoutes.test.ts']);
      const budget = r.names.some((n) => n.includes('freshness budget'));
      return [r.failed === 0 && r.passed > 0 && budget, `${r.passed} passed, ${r.failed} failed, budget test ${budget ? 'found' : 'missing'}`];
    }],
    ['liveWindow.ts: LIVE_TTL_MS = 10_000 + export LIVE_POLL_MS = 5_000', () =>
      has('lib/liveWindow.ts', 'LIVE_TTL_MS = 10_000', 'export const LIVE_POLL_MS = 5_000')],
    ['useLiveScores: imports LIVE_POLL_MS + setInterval(tick, LIVE_POLL_MS)', () =>
      has('lib/hooks/useLiveScores.ts', /import \{[^}]*\bLIVE_POLL_MS\b[^}]*\} from '@\/lib\/liveWindow'/, 'setInterval(tick, LIVE_POLL_MS)')],
    ['useLiveScores: no POLL_MS = declaration, no 15_000 / 5_000 literal', () => {
      const [a, da] = lacks('lib/hooks/useLiveScores.ts', /\bPOLL_MS\s*=/);
      const [b, db] = lacks('lib/hooks/useLiveScores.ts', /\b(15_?000|5_?000)\b/);
      return [a && b, [da, db].filter(Boolean).join('; ')];
    }],
    ['useLiveScores: inFlight ≥ 3 (check, set, reset)', () => {
      const n = (read('lib/hooks/useLiveScores.ts').match(/\binFlight\b/g) ?? []).length;
      return [n >= 3, `${n}`];
    }],
    ['useLiveScores signature unchanged vs main', () => {
      const before = signature(atMain('lib/hooks/useLiveScores.ts'), 'useLiveScores');
      return [Boolean(before) && before === signature(read('lib/hooks/useLiveScores.ts'), 'useLiveScores'), ''];
    }],
    ['kickoff-cap it() blocks byte-identical to main', () => {
      const bad = KICKOFF_TESTS.filter(([file, name]) => {
        const before = itBlock(atMain(file), name);
        return !before || before !== itBlock(read(file), name);
      });
      return [bad.length === 0, bad.map(([, n]) => n).join(', ')];
    }],
    ['shouldPollLive + scoreboardTtlMs bodies unchanged vs main', () => {
      const strip = (t) => (t ?? '').split('\n').filter((l) => !l.includes('LIVE_TTL_MS =')).join('\n');
      const bad = ['shouldPollLive', 'scoreboardTtlMs'].filter((name) => {
        const before = functionBlock(atMain('lib/liveWindow.ts'), name);
        return !before || strip(before) !== strip(functionBlock(read('lib/liveWindow.ts'), name));
      });
      return [bad.length === 0, bad.join(', ')];
    }],
    ['no "15s" / 15_000 left in the live files', () => {
      const bad = NO_15S.filter((f) => /\b15s\b|\b15_000\b/.test(read(f)));
      return [bad.length === 0, bad.join(', ')];
    }],
    ['components unchanged vs main', () => git('diff', '--exit-code', 'main', '--', 'components').code === 0],
    ['changed files ⊆ F1 + F0 files + plan', () => {
      const allowed = new Set([...F0_FILES, ...F1_FILES]);
      const bad = touched().filter((f) => !allowed.has(f));
      return [bad.length === 0, bad.join(', ')];
    }, { final: false }],
  ],
  f2: [
    ['vitest liveRoutes + liveParity: 0 failed, 4 gzip test names', () => {
      const r = vitestJson(['lib/__tests__/liveRoutes.test.ts', 'lib/__tests__/liveParity.test.ts']);
      const want = ['gzip once per fetch', 'stale variant gzipped separately', 'summary under 1 KB stays plain', 'summary ≥ 1 KB gzipped per response'];
      const missing = want.filter((w) => !r.names.some((n) => n.includes(w)));
      return [r.failed === 0 && r.passed > 0 && missing.length === 0, `${r.passed} passed, ${r.failed} failed${missing.length ? `; missing: ${missing.join(', ')}` : ''}`];
    }],
    ['espnLive.ts: gzipSync from node:zlib, Vary/Content-Encoding/Content-Length', () =>
      has('lib/espnLive.ts', /import \{[^}]*gzipSync[^}]*\} from 'node:zlib'/, 'Vary', 'Content-Encoding', 'Content-Length')],
    ['espnLive.ts: X-Pare-Cache + s-maxage template kept', () =>
      has('lib/espnLive.ts', "'X-Pare-Cache': result.status", '`public, s-maxage=')],
    ['both routes call liveOk(req, …)', () => {
      const bad = ROUTES.filter((f) => !read(f).includes('liveOk(req,'));
      return [bad.length === 0, bad.join(', ')];
    }],
    ['package*.json, next.config.ts, components unchanged vs main', () =>
      git('diff', '--exit-code', 'main', '--', 'package.json', 'package-lock.json', 'next.config.ts', 'components').code === 0],
    ['ESPN fixtures + parity snapshots not rewritten', () => {
      const out = git('status', '--porcelain', '--', FIX).stdout.trim();
      const vsMain = changedVsMain(FIX);
      return [out === '' && vsMain.length === 0, [out, ...vsMain].filter(Boolean).join(', ')];
    }],
  ],
  f3: [
    ['f3-smoke.json: pass true, scoreboard gzip, wire × 3 < raw', () => {
      if (!existsSync(abs(SMOKE))) return [false, 'f3-smoke.json missing'];
      const j = readJson(SMOKE);
      const sb = j.sizes?.scoreboard ?? {};
      const ok = j.pass === true && sb.contentEncoding === 'gzip' && sb.wire * 3 < sb.raw;
      return [ok, `pass=${j.pass}, ${sb.contentEncoding}, wire ${sb.wire} / raw ${sb.raw}`];
    }],
    ['plan has no TBD-F3', () => lacks(PLAN, /(?<!`)TBD-F3(?!`)/)],
    ['CLAUDE.md + DATA_SOURCES.md mention 5s, 10s, gzip', () => {
      const bad = ['CLAUDE.md', 'DATA_SOURCES.md'].map((f) => [f, has(f, '5s', '10s', 'gzip')]).filter(([, [ok]]) => !ok);
      return [bad.length === 0, bad.map(([f, [, d]]) => `${f}: ${d}`).join('; ')];
    }],
    ['ADR has "Amendment — 2026-10-12: live freshness"', () =>
      has('docs/adr/2026-10-12-live-scores-proxy.md', 'Amendment — 2026-10-12: live freshness')],
    ['CHANGELOG.md mentions feat/live-freshness + gzip', () => has('CHANGELOG.md', 'feat/live-freshness', 'gzip')],
    ['devnote docs/devnotes/2026-10-12-live-freshness.md exists', () => existsSync(abs('docs/devnotes/2026-10-12-live-freshness.md'))],
    ['proxy devnote changed vs main', () => changedVsMain('docs/devnotes/2026-10-12-live-scores-proxy.md').length === 1],
  ],
};

function runStatic(phase, { final = false } = {}) {
  for (const [name, fn, opts] of STATIC[phase]) {
    if (final && opts?.final === false) continue;
    check(final ? `all:${phase}` : phase, name, () => fn({ final }));
  }
}

function routeDiff(phase, afterPath) {
  check(phase, 'route-table-diff build-f0 → this build', () => {
    const res = diffRouteTables(read(`${ART}/build-f0.txt`), readFileSync(afterPath, 'utf8'));
    return [res.failures.length === 0, res.failures.join('; ')];
  });
}

// ── phases ───────────────────────────────────────────────────────────────
const PHASES = {
  async f0() { runStatic('f0'); npmCheck('f0'); npmTest('f0'); },
  async f1() { runStatic('f1'); npmCheck('f1'); npmTest('f1'); },
  async f2() { runStatic('f2'); npmCheck('f2'); npmTest('f2'); },
  async f3() {
    const out = join(tempDir(), 'build-f3.txt');
    if (await build('f3', out)) {
      routeDiff('f3', out);
      record('f3', 'node scripts/live-proxy-smoke.mjs', sh('node', ['scripts/live-proxy-smoke.mjs']).code === 0);
    }
    record('f3', 'port 4000 free after smoke', await portFree());
    runStatic('f3');
    npmCheck('f3');
    npmTest('f3');
  },
  async all() {
    for (const p of ['f0', 'f1', 'f2', 'f3']) runStatic(p, { final: true });
    npmCheck('all');
    npmTest('all');
    const out = join(tempDir(), 'build-all.txt');
    if (await build('all', out)) routeDiff('all', out);
  },
};

async function main() {
  const [arg, name] = process.argv.slice(2);
  if (arg === 'build') {
    if (!name) throw new Error('usage: build <name>');
    const ok = await build(`build:${name}`, abs(`${ART}/build-${name}.txt`));
    process.exit(ok ? 0 : 1);
  }
  const phase = PHASES[arg];
  if (!phase) {
    console.error('usage: node scripts/live-fresh-gates.mjs <f0|f1|f2|f3|all> | build <name>');
    process.exit(2);
  }
  await phase();

  const failed = rows.filter((r) => !r.ok);
  console.log(`\n${'─'.repeat(72)}\n${arg.toUpperCase()}: ${rows.length - failed.length}/${rows.length} PASS`);
  for (const r of failed) console.log(`FAIL  [${r.phase}] ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
