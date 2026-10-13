#!/usr/bin/env node
/**
 * P3 of docs/plans/2026-10-12-home-sleeper-ppr.md — smoke the Home box-score Pare
 * points on a local production server against real ESPN + Sleeper.
 *
 *   node scripts/home-ppr-gates.mjs p3      (clean + build, then this)
 *   node scripts/home-ppr-smoke.mjs         (needs an existing .next build)
 *
 * Needs port 4000 free. Starts `next start -p 4000`, waits for /api/health, then:
 *   1. /api/live/summary?event=<Dak W5 event from p0-check.json> → Dak's ppr === 17.64
 *      (pare.points). A cold server may answer "—" first (the ~20MB Sleeper player map
 *      is still downloading past the route's 3s cap) — recorded, then retried every 3s
 *      (summary-cache HITs, no extra ESPN calls) for up to 60s.
 *   2. Every non-null ppr is a number; the passer (QB) is first per team.
 *   3. One more final week-5 game → ≥ 90% of shown lines have a ppr.
 * Writes docs/plans/2026-10-12-home-sleeper-ppr/p3-smoke.json, stops the server,
 * exits non-zero on any failure. This script calls only localhost; the server makes
 * the upstream calls (2 ESPN summaries, 1 ESPN scoreboard, Sleeper week 5 + player map).
 */
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(ROOT, 'docs/plans/2026-10-12-home-sleeper-ppr');
const PORT = 4000;
const BASE = `http://localhost:${PORT}`;
const WEEK = 5;
const WARM_TIMEOUT_MS = 60_000;

const p0 = JSON.parse(readFileSync(join(ART, 'p0-check.json'), 'utf8'));
const DAK_EVENT = p0.espn.eventId;
const DAK_EXPECTED = p0.pare.points; // 17.64 — Kobe's Sleeper app
const DAK_BEFORE = Math.round(p0.formula.ours * 10) / 10; // 12.6 — the old homemade formula

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function portFree(port = PORT) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, () => srv.close(() => resolve(true)));
  });
}

function startServer() {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const log = [];
  const keep = (d) => log.push(...String(d).split('\n').filter(Boolean));
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  return { child, log };
}

async function stopServer(child) {
  child.kill();
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  }
  for (let i = 0; i < 20 && !(await portFree()); i += 1) await sleep(250);
}

async function waitHealthy(timeoutMs = 60_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2_000) });
      if (res.status === 200) return true;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  return false;
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(30_000) });
  return { status: res.status, cache: res.headers.get('x-pare-cache'), body: await res.json() };
}

const shown = (summary) => Object.values(summary.byAbbr ?? {}).flatMap((t) => t.lines);
const dakOf = (summary) => summary.byAbbr?.DAL?.lines?.find((l) => /Prescott/.test(l.name));

const result = { ranAt: new Date().toISOString(), event: DAK_EVENT, dak: { before: DAK_BEFORE, expected: DAK_EXPECTED } };

if (!(await portFree())) {
  console.error('port 4000 is busy — stop npm run dev / next start first');
  process.exit(1);
}

const { child, log } = startServer();
try {
  const healthy = await waitHealthy();
  check('next start → /api/health 200 within 60s', healthy);
  if (!healthy) throw new Error(`server did not come up:\n${log.slice(-20).join('\n')}`);

  // 1. Dak W5 — first answer (maybe cold), then until Sleeper points arrive.
  const first = await getJson(`/api/live/summary?event=${DAK_EVENT}`);
  check('summary 200', first.status === 200, `x-pare-cache=${first.cache}`);
  result.dak.firstResponse = dakOf(first.body)?.ppr ?? null;
  let summary = first.body;
  const until = Date.now() + WARM_TIMEOUT_MS;
  let tries = 1;
  while (dakOf(summary)?.ppr == null && Date.now() < until) {
    await sleep(3_000);
    summary = (await getJson(`/api/live/summary?event=${DAK_EVENT}`)).body;
    tries += 1;
  }
  const dak = dakOf(summary);
  result.dak.after = dak?.ppr ?? null;
  result.dak.tries = tries;
  result.dak.line = dak ?? null;
  check(`Dak W5 ppr === ${DAK_EXPECTED} (Sleeper pts_ppr + bonus)`, dak?.ppr === DAK_EXPECTED, `got ${dak?.ppr} after ${tries} request(s); first response ${result.dak.firstResponse}`);
  check('Dak shows as 17.6 in the UI', dak?.ppr != null && dak.ppr.toFixed(1) === DAK_EXPECTED.toFixed(1));

  // 2. Shape: numbers or null, QB pinned first.
  const lines = shown(summary);
  check('every ppr is a number or null', lines.every((l) => l.ppr === null || (typeof l.ppr === 'number' && Number.isFinite(l.ppr))));
  const teams = Object.values(summary.byAbbr ?? {});
  check('QB first per team', teams.length === 2 && teams.every((t) => t.lines[0]?.role === 'QB'), teams.map((t) => `${t.abbr}:${t.lines[0]?.role}`).join(' '));
  result.dakGame = summary;

  // 3. Another final week-5 game.
  const board = await getJson(`/api/live/scoreboard?week=${WEEK}`);
  const other = (board.body.matchups ?? []).find((m) => m.state === 'post' && m.espnEventId && m.espnEventId !== DAK_EVENT);
  check('another final week-5 game found', Boolean(other), other ? `${other.away?.abbr} @ ${other.home?.abbr} (${other.espnEventId})` : '');
  if (other) {
    const res = await getJson(`/api/live/summary?event=${other.espnEventId}`);
    const otherLines = shown(res.body);
    const withPoints = otherLines.filter((l) => typeof l.ppr === 'number').length;
    const rate = otherLines.length ? withPoints / otherLines.length : 0;
    result.otherGame = { event: other.espnEventId, name: `${other.away?.abbr} @ ${other.home?.abbr}`, lines: otherLines.length, withPoints, rate, summary: res.body };
    check('≥ 90% of shown lines have points', rate >= 0.9, `${withPoints}/${otherLines.length}`);
  }
} catch (err) {
  check('smoke ran without throwing', false, err instanceof Error ? err.message : String(err));
} finally {
  await stopServer(child);
}
check('port 4000 free after stop', await portFree());

result.checks = checks;
result.pass = checks.every((c) => c.ok);
writeFileSync(join(ART, 'p3-smoke.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed → ${result.pass ? 'PASS' : 'FAIL'}`);
process.exit(result.pass ? 0 : 1);
