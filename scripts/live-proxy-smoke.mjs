#!/usr/bin/env node
/**
 * Smoke /api/live/* on a local production server against real ESPN.
 * First written for P4 of docs/plans/2026-10-12-live-scores-proxy.md (its
 * p4-smoke.json + P4 table stay as that plan's record); extended for F3 of
 * docs/plans/2026-10-12-live-freshness.md (5s poll + our own gzip).
 *
 *   npm run build   (or: node scripts/live-fresh-gates.mjs f3)
 *   node scripts/live-proxy-smoke.mjs        # WEEK=N to override the current week
 *
 * Needs port 4000 free and an existing .next build. Starts `next start -p 4000`,
 * waits for /api/health, then: scoreboard MISS→HIT + shape + Cache-Control ·
 * 400s · summary MISS→HIT + shape · cold week 50 parallel → exactly 1 MISS ·
 * gzip vs plain on both routes (scoreboard gzip, wire < raw/3, Vary; decoded =
 * plain JSON; summary gzip iff raw ≥ 1 KB) + wire sizes. Writes
 * docs/plans/2026-10-12-live-freshness/f3-smoke.json, and on a pass fills that
 * plan's F3 + load tables from it. Stops the server and exits non-zero on any
 * failure. ≤6 ESPN calls (1 here + one per MISS).
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { gunzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLAN = join(ROOT, 'docs/plans/2026-10-12-live-freshness.md');
const OUT = join(ROOT, 'docs/plans/2026-10-12-live-freshness/f3-smoke.json');
const PORT = 4000;
const BASE = `http://localhost:${PORT}`;
const ESPN_DEFAULT = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const CACHE_CONTROL = /^public, s-maxage=\d+, stale-while-revalidate=\d+$/;
const MAX_ESPN_CALLS = 6;
/** Phone poll while live, seconds (= LIVE_POLL_MS in lib/liveWindow.ts). */
const POLL_S = 5;
/** Summary bodies from this size are gzipped (= GZIP_MIN_BYTES in lib/espnLive.ts). */
const GZIP_MIN_BYTES = 1024;

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function portFree() {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.listen(PORT, () => srv.close(() => resolve(true)));
  });
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, body, cache: res.headers.get('x-pare-cache'), cacheControl: res.headers.get('cache-control') };
}

/**
 * Raw request (node:http does not decode), with or without `accept-encoding: gzip`.
 * Returns wire bytes as sent, decoded size, the encoding headers and the decoded JSON.
 */
function measure(path, { gzip = true } = {}) {
  return new Promise((resolve, reject) => {
    const headers = gzip ? { 'accept-encoding': 'gzip' } : {};
    const req = request(`${BASE}${path}`, { headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const wire = Buffer.concat(chunks);
        const encoding = res.headers['content-encoding'] ?? null;
        const decoded = encoding === 'gzip' ? gunzipSync(wire) : wire;
        let json = null;
        try {
          json = JSON.parse(decoded.toString('utf8'));
        } catch {
          /* non-JSON body */
        }
        resolve({
          status: res.statusCode,
          raw: decoded.length,
          wire: wire.length,
          contentEncoding: encoding ?? 'none',
          contentLength: res.headers['content-length'] === undefined ? null : Number(res.headers['content-length']),
          vary: res.headers.vary ?? null,
          cache: res.headers['x-pare-cache'] ?? null,
          json,
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/** Drop the decoded JSON before a measurement goes into the report. */
const sizeOf = (m) => {
  const rest = { ...m };
  delete rest.json;
  return rest;
};

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

const fmt = (n) => n.toLocaleString('en-US');
const mbps = (viewers, wire) => ((viewers / POLL_S) * wire * 8) / 1e6;

/** Replace the TBD (or previously filled) F3 + load table rows with measured values. */
function fillPlan(report) {
  const { scoreboard: sb, summary: sm } = report.sizes;
  let text = readFileSync(PLAN, 'utf8');
  const crlf = text.includes('\r\n');
  text = text.replace(/\r\n/g, '\n');
  const row = (prefix, cells) => {
    const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'm');
    text = text.replace(re, `${prefix} ${cells.join(' | ')} |`);
  };
  row('| /api/live/scoreboard?week=W |', [fmt(sb.raw), fmt(sb.wire), sb.contentEncoding]);
  if (sm) row('| /api/live/summary?event=… |', [fmt(sm.raw), fmt(sm.wire), sm.contentEncoding]);
  for (const r of report.load) {
    row(`| ${fmt(r.viewers)} | ${r.reqPerSec} |`, [r.mbps.toFixed(2), r.espn]);
  }
  text = text.replace(
    /^\*\*F3 results(?::| —) our responses\*\*.*$/m,
    `**F3 results: our responses** (filled by the run: ${report.ranAt}, week ${report.week}; source \`f3-smoke.json\`)`,
  );
  writeFileSync(PLAN, crlf ? text.replace(/\n/g, '\r\n') : text);
}

async function main() {
  if (!(await portFree())) {
    console.error(`port ${PORT} is busy — stop npm run dev / next start first`);
    process.exit(1);
  }
  if (!existsSync(join(ROOT, '.next/BUILD_ID'))) {
    console.error('no .next build — run npm run build first');
    process.exit(1);
  }

  let espnCalls = 0;
  let week = Number(process.env.WEEK) || 0;
  if (!week) {
    espnCalls += 1;
    const res = await fetch(ESPN_DEFAULT, { signal: AbortSignal.timeout(15_000) });
    week = (await res.json()).week?.number;
  }
  check('current week known', week >= 1 && week <= 18, `W = ${week}`);

  const { child, log } = startServer();
  const report = { pass: false, ranAt: new Date().toISOString(), week, checks, sizes: {}, load: [], espnCalls: 0 };
  let misses = 0;
  const seen = (r) => {
    if (r.cache === 'MISS') misses += 1;
    return r;
  };

  try {
    const healthy = await waitHealthy();
    check('next start → /api/health 200 within 60s', healthy);
    if (!healthy) throw new Error(`server did not come up:\n${log.slice(-20).join('\n')}`);

    // 2. Scoreboard MISS → HIT + shape.
    const touched = new Set([week]);
    const sb1 = seen(await get(`/api/live/scoreboard?week=${week}`));
    const sb2 = seen(await get(`/api/live/scoreboard?week=${week}`));
    check('scoreboard 200 ×2', sb1.status === 200 && sb2.status === 200, `${sb1.status}, ${sb2.status}`);
    check('scoreboard MISS then HIT', sb1.cache === 'MISS' && sb2.cache === 'HIT', `${sb1.cache} → ${sb2.cache}`);
    const b = sb1.body ?? {};
    const shapeOk =
      b.week === week &&
      Array.isArray(b.matchups) &&
      b.matchups.length > 0 &&
      b.matchups.every((m) => m.id && m.kickoff && m.state) &&
      b.stale === false &&
      typeof b.updatedAt === 'string' &&
      new Date(b.updatedAt).toISOString() === b.updatedAt;
    check('scoreboard shape (week, matchups[id/kickoff/state], stale false, ISO updatedAt)', shapeOk, `${b.matchups?.length ?? 0} matchups`);
    check('scoreboard Cache-Control kept by Next', CACHE_CONTROL.test(sb1.cacheControl ?? '') && CACHE_CONTROL.test(sb2.cacheControl ?? ''), sb1.cacheControl ?? '(none)');

    // 3. Bad input → 400 (no ESPN calls).
    const badWeeks = ['0', '19', 'abc', '1.5'];
    const badEvents = ['abc', '12345', '1234567890123', ''];
    const bad = await Promise.all([
      ...badWeeks.map((w) => get(`/api/live/scoreboard?week=${w}`)),
      ...badEvents.map((e) => get(`/api/live/summary?event=${e}`)),
    ]);
    check('bad input → 400 (4 weeks + 4 events)', bad.every((r) => r.status === 400), bad.map((r) => r.status).join(','));

    // 4. Summary of a finished game (fallback: week W−1).
    let post = b.matchups?.find((m) => m.state === 'post' && m.espnEventId);
    if (!post && week > 1) {
      touched.add(week - 1);
      const prev = seen(await get(`/api/live/scoreboard?week=${week - 1}`));
      post = prev.body?.matchups?.find((m) => m.state === 'post' && m.espnEventId);
    }
    check('found a finished game', Boolean(post), post ? `${post.id} (event ${post.espnEventId})` : 'none in W or W−1');
    let summaryPath = null;
    if (post) {
      summaryPath = `/api/live/summary?event=${post.espnEventId}`;
      const s1 = seen(await get(summaryPath));
      const s2 = seen(await get(summaryPath));
      check('summary 200 ×2', s1.status === 200 && s2.status === 200, `${s1.status}, ${s2.status}`);
      check('summary MISS then HIT', s1.cache === 'MISS' && s2.cache === 'HIT', `${s1.cache} → ${s2.cache}`);
      const teams = Object.values(s1.body?.byAbbr ?? {});
      const sOk =
        teams.some((t) => Array.isArray(t.lines) && t.lines.length > 0) &&
        (typeof s1.body?.headline === 'string' || s1.body?.headline === null);
      check('summary shape (byAbbr lines[], headline string|null)', sOk, `${teams.length} teams`);
      check('summary Cache-Control kept by Next', CACHE_CONTROL.test(s1.cacheControl ?? ''), s1.cacheControl ?? '(none)');
    }

    // 5. Cold key: 50 parallel → exactly one upstream fetch.
    let cold = 1;
    while (touched.has(cold)) cold += 1;
    const burst = (await Promise.all(Array.from({ length: 50 }, () => get(`/api/live/scoreboard?week=${cold}`)))).map(seen);
    const burstMiss = burst.filter((r) => r.cache === 'MISS').length;
    check(`cold week ${cold}: 50 parallel → all 200`, burst.every((r) => r.status === 200), `${burst.filter((r) => r.status === 200).length}/50`);
    check(`cold week ${cold}: exactly 1 MISS`, burstMiss === 1, `${burstMiss} MISS, ${burst.filter((r) => r.cache === 'HIT').length} HIT`);

    // 6. gzip vs plain + sizes (HITs — no ESPN calls unless the live TTL lapses mid-pair).
    const sbPath = `/api/live/scoreboard?week=${week}`;
    // A live 10s copy can turn over between the two requests → retry until both
    // come from one upstream fetch (same updatedAt), so "decoded = plain" compares like with like.
    let sbGz;
    let sbPlain;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      sbGz = seen(await measure(sbPath, { gzip: true }));
      sbPlain = seen(await measure(sbPath, { gzip: false }));
      if (sbGz.json?.updatedAt === sbPlain.json?.updatedAt) break;
    }
    report.sizes.scoreboard = { path: sbPath, ...sizeOf(sbGz) };
    report.sizes.scoreboardPlain = { path: sbPath, ...sizeOf(sbPlain) };
    check(
      'scoreboard gzip: content-encoding gzip, content-length = wire, wire < raw / 3',
      sbGz.status === 200 && sbGz.contentEncoding === 'gzip' && sbGz.contentLength === sbGz.wire && sbGz.wire * 3 < sbGz.raw,
      `raw ${fmt(sbGz.raw)} B, wire ${fmt(sbGz.wire)} B (${sbGz.contentEncoding}), content-length ${sbGz.contentLength}`,
    );
    check(
      'scoreboard plain: no content-encoding, Vary: Accept-Encoding',
      sbPlain.status === 200 && sbPlain.contentEncoding === 'none' && /accept-encoding/i.test(sbPlain.vary ?? ''),
      `${sbPlain.contentEncoding}, vary ${sbPlain.vary ?? '(none)'}`,
    );
    check('scoreboard: gzipped decoded JSON = plain JSON', sbGz.json !== null && isDeepStrictEqual(sbGz.json, sbPlain.json));

    if (summaryPath) {
      const smGz = seen(await measure(summaryPath, { gzip: true }));
      const smPlain = seen(await measure(summaryPath, { gzip: false }));
      report.sizes.summary = { path: summaryPath, ...sizeOf(smGz) };
      report.sizes.summaryPlain = { path: summaryPath, ...sizeOf(smPlain) };
      const wantGzip = smGz.raw >= GZIP_MIN_BYTES;
      check(
        `summary: gzip iff raw ≥ ${fmt(GZIP_MIN_BYTES)} B`,
        smGz.status === 200 && (smGz.contentEncoding === 'gzip') === wantGzip && /accept-encoding/i.test(smGz.vary ?? ''),
        `raw ${fmt(smGz.raw)} B, wire ${fmt(smGz.wire)} B (${smGz.contentEncoding})`,
      );
      check('summary: gzipped decoded JSON = plain JSON', smGz.json !== null && isDeepStrictEqual(smGz.json, smPlain.json));
    }

    report.espnCalls = espnCalls + misses;
    check(`ESPN calls ≤ ${MAX_ESPN_CALLS}`, report.espnCalls <= MAX_ESPN_CALLS, `${report.espnCalls} (1 here + ${misses} MISS)`);

    report.load = [100, 1_000, 10_000].map((viewers) => ({
      viewers,
      reqPerSec: (viewers / POLL_S).toFixed(1),
      mbps: mbps(viewers, sbGz.wire),
      espn: viewers === 100 ? '~6 (scoreboard, current week)' : '~6',
    }));
  } catch (err) {
    check('smoke ran to completion', false, err instanceof Error ? err.message : String(err));
  } finally {
    await stopServer(child);
  }

  const stopped = await portFree();
  check('server stopped (port 4000 free)', stopped);
  report.pass = checks.every((c) => c.ok);
  writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');

  console.log(`\n${'─'.repeat(72)}`);
  console.log(`${report.pass ? 'PASS' : 'FAIL'}: ${checks.filter((c) => c.ok).length}/${checks.length} checks · f3-smoke.json written`);
  if (report.load.length) {
    console.log('\n| Viewers | Req/s to the Mac | Upload from the Mac (Mbps) | ESPN calls/min |');
    for (const r of report.load) console.log(`| ${fmt(r.viewers)} | ${r.reqPerSec} | ${r.mbps.toFixed(2)} | ${r.espn} |`);
  }
  if (report.pass) {
    fillPlan(report);
    console.log('plan F3 + load tables filled');
  }
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
