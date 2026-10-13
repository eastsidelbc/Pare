#!/usr/bin/env node
/**
 * Phase gates for docs/plans/2026-10-12-live-scores-proxy.md.
 *
 *   node scripts/live-proxy-gates.mjs <p0|p1|p2|p3|p4|p5|all>
 *   node scripts/live-proxy-gates.mjs build <name>   # port check + clean + build → <ART>/build-<name>.txt
 *
 * Prints a PASS/FAIL table; exits 1 on any failure. Every build first checks
 * port 4000 is free (a running `npm run dev` would have its .next clobbered),
 * then runs `npm run clean` + `npm run build`.
 *
 * Placeholder checks ignore `TBD-Pn` quoted in backticks (the plan's own rule text).
 *
 * `all` = every static check that still holds after P5 (phase-snapshot checks
 * like P0's "only one keyword changed" are skipped) + check/test/build once +
 * the route-table diff + p4-smoke.json pass:true. It never rewrites tracked
 * files: its build output goes to the OS temp dir.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffRouteTables } from './route-table-diff.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLAN = 'docs/plans/2026-10-12-live-scores-proxy.md';
const ART = 'docs/plans/2026-10-12-live-scores-proxy';
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

function portFree(port = 4000) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, () => srv.close(() => resolve(true)));
  });
}

const tempDir = () => mkdtempSync(join(tmpdir(), 'pare-gates-'));

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
const changedVsMain = (...paths) =>
  git('diff', '--name-only', 'main', '--', ...paths).stdout.split('\n').map((s) => s.trim()).filter(Boolean);

/** Text from `export function NAME(` (or `interface NAME`) up to its opening `{`. */
function signature(text, name) {
  const fn = text.indexOf(`export function ${name}(`);
  if (fn >= 0) return text.slice(fn, text.indexOf('{', text.indexOf(')', fn) ) + 1);
  const iface = text.search(new RegExp(`(export )?interface ${name}\\b`));
  if (iface >= 0) return text.slice(iface, text.indexOf('\n}', iface) + 2);
  return null;
}

/** The body of `export function shouldPollLive` up to its closing `}` at column 0. */
function functionBlock(text, name) {
  const i = text.indexOf(`export function ${name}(`);
  return i < 0 ? null : text.slice(i, text.indexOf('\n}', i) + 2);
}

// ── static checks per phase (`final: false` = only valid at that phase) ─
const STATIC = {
  p0: [
    ['scoreboard fixture has events ≥ 1', () => {
      const n = readJson(`${FIX}/scoreboard-week.json`).events?.length ?? 0;
      return [n >= 1, `${n} events`];
    }],
    ['summary fixture: 2 teams + completed', () => {
      const j = readJson(`${FIX}/summary-final.json`);
      return j.boxscore?.players?.length === 2 && j.header?.competitions?.[0]?.status?.type?.completed === true;
    }],
    ['parity snapshots exist + non-empty', () =>
      ['scoreboard-matchups.json', 'summary-final.json'].every((f) => existsSync(abs(`${FIX}/parity/${f}`)) && read(`${FIX}/parity/${f}`).trim().length > 0)],
    ['vitest liveParity.test.ts', () => {
      const r = vitestJson(['lib/__tests__/liveParity.test.ts']);
      return [r.failed === 0 && r.passed >= 2, `${r.passed} passed, ${r.failed} failed`];
    }],
    ['build-p0.txt lists /standings /leaderboards /', () => has(`${ART}/build-p0.txt`, '/standings', '/leaderboards', /[┌├└] [○●ƒ◐] \/\s/)],
    ['p0-capture.json exists', () => existsSync(abs(`${ART}/p0-capture.json`))],
    ['plan has no TBD-P0', () => lacks(PLAN, /(?<!`)TBD-P0(?!`)/)],
    ['only change vs main in app/components/hooks/mapper = 1 keyword', () => {
      const out = git('diff', '--numstat', 'main', '--', 'app', 'components', 'lib/hooks', 'lib/espnScoreboard.ts').stdout.trim().replace(/\s+/g, ' ');
      return [out === '1 1 lib/hooks/useGameSummary.ts', out || '(empty)'];
    }, { final: false }],
  ],
  p1: [
    ['vitest liveCache + liveWindow ≥13 passed, 0 failed', () => {
      const r = vitestJson(['lib/__tests__/liveCache.test.ts', 'lib/__tests__/liveWindow.test.ts']);
      return [r.failed === 0 && r.passed >= 13, `${r.passed} passed, ${r.failed} failed`];
    }],
    ['13 required test phrases present', () => {
      const text = read('lib/__tests__/liveCache.test.ts') + read('lib/__tests__/liveWindow.test.ts');
      const phrases = ['50 concurrent', 'TTL hit', 'ttlFor per value', 'stale on failure', 'rejects with no last-good', 'backoff',
        'budget exhausted', 'bounded', 'no timers', 'live ttl', 'idle ttl no upcoming', 'kickoff cap', 'stale when window opens'];
      const missing = phrases.filter((p) => !text.includes(p));
      return [missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : ''];
    }],
    ['shouldPollLive unchanged vs main', () => {
      const before = functionBlock(git('show', 'main:lib/liveWindow.ts').stdout.replace(/\r\n/g, '\n'), 'shouldPollLive');
      const after = functionBlock(read('lib/liveWindow.ts'), 'shouldPollLive');
      return [Boolean(before) && before === after, before === after ? '' : 'function text differs'];
    }],
    ['no new dependencies (package.json + lock unchanged)', () => git('diff', '--exit-code', 'main', '--', 'package.json', 'package-lock.json').code === 0],
  ],
  p2: [
    ['the 5 P2 files exist', () => {
      const files = ['lib/gameSummary.ts', 'lib/espnLive.ts', 'app/api/live/scoreboard/route.ts', 'app/api/live/summary/route.ts', 'lib/__tests__/liveRoutes.test.ts'];
      const missing = files.filter((f) => !existsSync(abs(f)));
      return [missing.length === 0, missing.join(', ')];
    }],
    ['routes: runtime nodejs + force-dynamic', () =>
      ['app/api/live/scoreboard/route.ts', 'app/api/live/summary/route.ts'].every((f) => has(f, "runtime = 'nodejs'", "dynamic = 'force-dynamic'")[0])],
    ['one mapEspnScoreboard definition', () => {
      const out = git('grep', '--untracked', '-c', 'function mapEspnScoreboard', '--', 'app', 'components', 'lib', 'utils', 'config').stdout;
      const total = out.split('\n').filter(Boolean).reduce((n, l) => n + Number(l.split(':').pop()), 0);
      return [total === 1, `${total}`];
    }],
    ['parseSummary defined only in lib/gameSummary.ts', () => {
      const out = git('grep', '--untracked', '-l', 'function parseSummary', '--', 'app', 'components', 'lib', 'utils', 'config').stdout.trim();
      return [out === 'lib/gameSummary.ts', out || '(none)'];
    }],
    ['espnLive.ts: server-only, timeout, no-store, no unstable_cache', () => {
      const [ok, detail] = has('lib/espnLive.ts', 'server-only', 'AbortSignal.timeout', 'no-store');
      const [ok2, detail2] = lacks('lib/espnLive.ts', /unstable_cache/);
      return [ok && ok2, [detail, detail2].filter(Boolean).join('; ')];
    }],
    ['espnLive.ts: 6s timeout + scoreboardTtlMs', () => has('lib/espnLive.ts', 'ESPN_LIVE_TIMEOUT_MS = 6_000', /import[^;]*scoreboardTtlMs[^;]*from/)],
    ['ESPN fixtures + parity snapshots not rewritten', () => {
      const out = git('status', '--porcelain', '--', FIX).stdout.trim();
      return [out === '', out];
    }],
    ['vitest liveRoutes + liveParity ≥15 passed, 0 failed, has "kickoff not delayed"', () => {
      const r = vitestJson(['lib/__tests__/liveRoutes.test.ts', 'lib/__tests__/liveParity.test.ts']);
      const kick = r.names.some((n) => n.includes('kickoff not delayed'));
      return [r.failed === 0 && r.passed >= 15 && kick, `${r.passed} passed, ${r.failed} failed, kickoff test ${kick ? 'found' : 'missing'}`];
    }],
  ],
  p3: [
    ['inventory --assert-no-espn', () => sh('node', ['scripts/live-proxy-inventory.mjs', '--assert-no-espn'], { quiet: true }).code === 0],
    ['components unchanged vs main', () => git('diff', '--exit-code', 'main', '--', 'components').code === 0],
    ['app changes ⊆ /api/live/** + /api/schedule/route.ts', (ctx) => {
      const allowed = (f) => f.startsWith('app/api/live/') || f === 'app/api/schedule/route.ts' || (ctx.final && f === 'app/privacy/page.tsx');
      const bad = changedVsMain('app').filter((f) => !allowed(f));
      return [bad.length === 0, bad.join(', ')];
    }],
    ['hook signatures unchanged vs main', () => {
      const pairs = [['lib/hooks/useLiveScores.ts', 'useLiveScores'], ['lib/hooks/useGameSummary.ts', 'useGameSummary'], ['lib/hooks/useGameSummary.ts', 'UseGameSummaryResult']];
      const bad = pairs.filter(([file, name]) => {
        const before = signature(git('show', `main:${file}`).stdout.replace(/\r\n/g, '\n'), name);
        return !before || before !== signature(read(file), name);
      });
      return [bad.length === 0, bad.map(([, n]) => n).join(', ')];
    }],
  ],
  p4: [
    ['p4-smoke.json pass: true', () => existsSync(abs(`${ART}/p4-smoke.json`)) && readJson(`${ART}/p4-smoke.json`).pass === true],
    ['plan has no TBD-P4', () => lacks(PLAN, /(?<!`)TBD-P4(?!`)/)],
  ],
  p5: [
    ['privacy: no direct-ESPN wording', () => lacks('app/privacy/page.tsx', /directly from ESPN|loads that data directly|exception described above/)],
    ['privacy: EFFECTIVE_DATE updated', () => {
      const m = read('app/privacy/page.tsx').match(/EFFECTIVE_DATE\s*=\s*'([^']*)'/);
      return [Boolean(m) && m[1] !== 'October 8, 2026', m ? m[1] : 'EFFECTIVE_DATE not found'];
    }],
    ['CLAUDE.md: no direct-ESPN / open TODO', () => {
      const text = read('CLAUDE.md');
      const bad = ['hits ESPN directly', 'Route live scores (`useLiveScores`)'].filter((s) => text.includes(s));
      return [bad.length === 0, bad.join(', ')];
    }],
    ['DATA_SOURCES.md documents /api/live/*', () => has('DATA_SOURCES.md', '/api/live/scoreboard', '/api/live/summary')],
    ['CHANGELOG.md mentions /api/live', () => has('CHANGELOG.md', '/api/live')],
    ['devnote + ADR exist; ADR has Revisit triggers', () =>
      existsSync(abs('docs/devnotes/2026-10-12-live-scores-proxy.md')) && has('docs/adr/2026-10-12-live-scores-proxy.md', 'Revisit triggers')[0]],
    ['6 doc paths changed vs main', () => {
      const docs = ['app/privacy/page.tsx', 'CLAUDE.md', 'DATA_SOURCES.md', 'CHANGELOG.md', 'docs/devnotes/2026-10-12-live-scores-proxy.md', 'docs/adr/2026-10-12-live-scores-proxy.md'];
      const changed = new Set([...changedVsMain(), ...git('ls-files', '--others', '--exclude-standard', '--', ...docs).stdout.split('\n').map((s) => s.trim())]);
      const missing = docs.filter((d) => !changed.has(d));
      return [missing.length === 0, missing.length ? `unchanged: ${missing.join(', ')}` : ''];
    }],
  ],
};

function runStatic(phase, { final = false } = {}) {
  for (const [name, fn, opts] of STATIC[phase]) {
    if (final && opts?.final === false) continue;
    check(final ? `all:${phase}` : phase, name, () => fn({ final }));
  }
}

function routeDiff(phase, afterPath) {
  check(phase, 'route-table-diff build-p0 → this build', () => {
    const res = diffRouteTables(read(`${ART}/build-p0.txt`), readFileSync(afterPath, 'utf8'));
    return [res.failures.length === 0, res.failures.join('; ')];
  });
}

// ── phases ───────────────────────────────────────────────────────────────
const PHASES = {
  async p0() { runStatic('p0'); npmCheck('p0'); npmTest('p0'); },
  async p1() { runStatic('p1'); npmCheck('p1'); npmTest('p1'); },
  async p2() { runStatic('p2'); npmCheck('p2'); npmTest('p2'); },
  async p3() {
    runStatic('p3');
    npmCheck('p3');
    npmTest('p3');
    if (await build('p3', abs(`${ART}/build-p3.txt`))) routeDiff('p3', abs(`${ART}/build-p3.txt`));
  },
  async p4() {
    if (await build('p4', join(tempDir(), 'build-p4.txt'))) {
      record('p4', 'node scripts/live-proxy-smoke.mjs', sh('node', ['scripts/live-proxy-smoke.mjs']).code === 0);
    }
    runStatic('p4');
    record('p4', 'port 4000 free after smoke', await portFree());
  },
  async p5() {
    npmCheck('p5');
    npmTest('p5');
    await build('p5', join(tempDir(), 'build-p5.txt'));
    runStatic('p5');
  },
  async all() {
    for (const p of ['p0', 'p1', 'p2', 'p3', 'p4', 'p5']) runStatic(p, { final: true });
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
    console.error('usage: node scripts/live-proxy-gates.mjs <p0|p1|p2|p3|p4|p5|all> | build <name>');
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
