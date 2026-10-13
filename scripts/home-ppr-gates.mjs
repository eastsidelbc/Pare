#!/usr/bin/env node
/**
 * Phase gates for docs/plans/2026-10-12-home-sleeper-ppr.md.
 *
 *   node scripts/home-ppr-gates.mjs <p0|p1|p2|p3|all>
 *
 * Prints a PASS/FAIL table; exits 1 on any failure. Every build first checks
 * port 4000 is free (a running `npm run dev` would have its .next clobbered),
 * then runs `npm run clean` + `npm run build`.
 *
 * Scope fence: each phase allows the files of every phase up to and including it
 * (`git diff --name-only main`). Placeholder checks ignore `TBD-Pn` quoted in
 * backticks (the plan's own rule text).
 *
 * `all` = every phase's static checks + vitest + check/test once + build + smoke once.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLAN = 'docs/plans/2026-10-12-home-sleeper-ppr.md';
const ART = 'docs/plans/2026-10-12-home-sleeper-ppr';
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

function sh(cmd, args, { quiet = false } = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: IS_WIN, maxBuffer: 64 * 1024 * 1024 });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  if (!quiet && res.status !== 0) console.log(out.split('\n').slice(-40).join('\n'));
  return { code: res.status ?? 1, out, stdout: res.stdout ?? '' };
}
const git = (...args) => sh('git', args, { quiet: true });

function portFree(port = 4000) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, () => srv.close(() => resolve(true)));
  });
}

/** Port check → clean → build. */
async function build(phase) {
  if (!(await portFree())) {
    record(phase, 'port 4000 free before build', false, 'stop npm run dev first');
    return false;
  }
  record(phase, 'port 4000 free before build', true);
  const clean = sh('npm', ['run', 'clean']);
  const res = sh('npm', ['run', 'build']);
  record(phase, 'npm run clean + npm run build', clean.code === 0 && res.code === 0);
  return res.code === 0;
}

const npmCheck = (phase) => record(phase, 'npm run check', sh('npm', ['run', 'check']).code === 0);
const npmTest = (phase) => record(phase, 'npm run test:run', sh('npm', ['run', 'test:run']).code === 0);

/** Run vitest with the JSON reporter → { passed, failed, names }. */
function vitestJson(files) {
  const out = join(mkdtempSync(join(tmpdir(), 'pare-ppr-gates-')), 'vitest.json');
  sh('npx', ['vitest', 'run', ...files, '--reporter=json', `--outputFile=${out}`], { quiet: true });
  if (!existsSync(out)) return { passed: 0, failed: -1, names: [] };
  const j = JSON.parse(readFileSync(out, 'utf8'));
  const names = j.testResults.flatMap((f) => f.assertionResults.map((a) => a.fullName ?? a.title));
  return { passed: j.numPassedTests, failed: j.numFailedTests + (j.numRuntimeErrorTestSuites ?? 0), names };
}

/** Wrap a check so a thrown error becomes a FAIL row, not a crash. */
function check(phase, name, fn) {
  try {
    const res = fn();
    const [ok, detail] = Array.isArray(res) ? res : [Boolean(res), ''];
    record(phase, name, ok, detail);
  } catch (err) {
    record(phase, name, false, err instanceof Error ? err.message : String(err));
  }
}

const changedVsMain = (...paths) =>
  git('diff', '--name-only', 'main', '--', ...paths).stdout.split('\n').map((s) => s.trim()).filter(Boolean);

// ── scope fence ──────────────────────────────────────────────────────────
const SCOPE = {
  p0: [/^scripts\/home-ppr-[\w-]+\.mjs$/, /^docs\/plans\/2026-10-12-home-sleeper-ppr(\.md|\/)/],
  p1: ['lib/fantasyPoints.ts', 'lib/__tests__/fantasyPoints.test.ts'],
  p2: [
    'lib/gameSummary.ts',
    'lib/fantasy.ts',
    'lib/espnLive.ts',
    'app/api/live/summary/route.ts',
    'components/schedule/PostGameBox.tsx',
    'lib/__tests__/liveParity.test.ts',
    'lib/__fixtures__/espn/parity/summary-final.json',
    'lib/__tests__/liveRoutes.test.ts',
  ],
  p3: ['CHANGELOG.md', 'DATA_SOURCES.md', 'CLAUDE.md', 'docs/devnotes/2026-10-12-home-sleeper-ppr.md'],
};
const PHASES = ['p0', 'p1', 'p2', 'p3'];

function scopeCheck(phase) {
  const allowed = PHASES.slice(0, PHASES.indexOf(phase) + 1).flatMap((p) => SCOPE[p]);
  const ok = (f) => allowed.some((a) => (a instanceof RegExp ? a.test(f) : a === f));
  const untracked = git('ls-files', '--others', '--exclude-standard').stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  const out = [...new Set([...changedVsMain(), ...untracked])].filter((f) => !ok(f));
  return [out.length === 0, out.length ? `out of scope: ${out.join(', ')}` : ''];
}

// ── per-phase checks ─────────────────────────────────────────────────────
const P1_PHRASES = [
  'pts_ppr is the source',
  'formula proof',
  'join hit rate',
  'qb pinned',
  'no points yet',
  'name fallback',
  'no homemade formula',
];
const P2_PHRASES = ['sleeper points attached', 'sleeper down', 'points after cache'];

const STATIC = {
  p0: [
    ['p0-check.json has a numeric Dak pts_ppr', () => {
      const j = readJson(`${ART}/p0-check.json`);
      return [typeof j.sleeper?.pts_ppr === 'number', `pts_ppr=${j.sleeper?.pts_ppr}`];
    }],
    ['plan has no TBD-P0', () => {
      const m = read(PLAN).replace(/`TBD-P\d`/g, '').match(/TBD-P0/g);
      return [!m, m ? `${m.length} left` : ''];
    }],
  ],
  p1: [
    ['package.json + lockfile unchanged vs main', () =>
      git('diff', '--exit-code', 'main', '--', 'package.json', 'package-lock.json').code === 0],
  ],
  p2: [
    ['homemade PPR formula gone (lib components app)', () => {
      const r = git('grep', '-n', 'passYd: 0.04\\|PPR = {', '--', 'lib', 'components', 'app');
      return [r.stdout.trim() === '', r.stdout.trim()];
    }],
    ['sleeper-player-map-v5 in lib/fantasy.ts exactly once', () => {
      const n = (read('lib/fantasy.ts').match(/sleeper-player-map-v5/g) ?? []).length;
      return [n === 1, `${n}`];
    }],
    ['components diff = PostGameBox.tsx only, ≤ 3 changed lines', () => {
      const files = changedVsMain('components');
      const stat = git('diff', '--numstat', 'main', '--', 'components').stdout.trim().split('\n').filter(Boolean);
      const changed = stat.reduce((n, l) => n + Math.max(Number(l.split('\t')[0]) || 0, Number(l.split('\t')[1]) || 0), 0);
      const ok = files.every((f) => f === 'components/schedule/PostGameBox.tsx') && changed <= 3;
      return [ok, `files=${files.join(',') || 'none'} changed=${changed}`];
    }],
  ],
  p3: [
    ['p3-smoke.json pass: true', () => {
      const j = readJson(`${ART}/p3-smoke.json`);
      return [j.pass === true, `dak before=${j.dak?.before} after=${j.dak?.after} sleeper=${j.dak?.sleeper}`];
    }],
    ['CHANGELOG.md contains pts_ppr', () => read('CHANGELOG.md').includes('pts_ppr')],
    ['DATA_SOURCES.md contains pts_ppr', () => read('DATA_SOURCES.md').includes('pts_ppr')],
    ['devnote exists', () => existsSync(abs('docs/devnotes/2026-10-12-home-sleeper-ppr.md'))],
  ],
};

function vitestGate(phase) {
  if (phase === 'p1') {
    const r = vitestJson(['lib/__tests__/fantasyPoints.test.ts']);
    const missing = P1_PHRASES.filter((p) => !r.names.some((n) => n.includes(p)));
    record(phase, 'fantasyPoints tests ≥ 7 passed, 0 failed', r.passed >= 7 && r.failed === 0, `passed=${r.passed} failed=${r.failed}`);
    record(phase, 'P1 test phrases present', missing.length === 0, missing.length ? `missing: ${missing.join(' | ')}` : '');
  }
  if (phase === 'p2') {
    const r = vitestJson([
      'lib/__tests__/liveRoutes.test.ts',
      'lib/__tests__/liveParity.test.ts',
      'lib/__tests__/fantasyPoints.test.ts',
    ]);
    const missing = P2_PHRASES.filter((p) => !r.names.some((n) => n.includes(p)));
    record(phase, 'route + parity + points tests 0 failed', r.failed === 0 && r.passed > 0, `passed=${r.passed} failed=${r.failed}`);
    record(phase, 'P2 test phrases present', missing.length === 0, missing.length ? `missing: ${missing.join(' | ')}` : '');
  }
}

async function smoke(phase) {
  const r = sh('node', ['scripts/home-ppr-smoke.mjs']);
  record(phase, 'node scripts/home-ppr-smoke.mjs exits 0', r.code === 0);
  record(phase, 'port 4000 free after smoke', await portFree());
}

async function runPhase(phase, { heavy = true } = {}) {
  check(phase, 'git diff --name-only main within scope', () => scopeCheck(phase));
  vitestGate(phase);
  if (phase === 'p2' && heavy) await build(phase);
  if (phase === 'p3' && heavy) {
    if (await build(phase)) await smoke(phase);
  }
  for (const [name, fn] of STATIC[phase]) check(phase, name, fn);
  if (heavy) {
    npmCheck(phase);
    npmTest(phase);
  }
}

// ── main ─────────────────────────────────────────────────────────────────
const arg = process.argv[2];
if (PHASES.includes(arg)) {
  await runPhase(arg);
} else if (arg === 'all') {
  for (const p of PHASES.slice(0, 3)) await runPhase(p, { heavy: false });
  await runPhase('p3');
} else {
  console.error('usage: node scripts/home-ppr-gates.mjs <p0|p1|p2|p3|all>');
  process.exit(2);
}

const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length}/${rows.length} passed${failed.length ? ` — ${failed.length} FAIL` : ''}`);
process.exit(failed.length ? 1 : 0);
