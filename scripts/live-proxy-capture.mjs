#!/usr/bin/env node
/**
 * P0 of docs/plans/2026-10-12-live-scores-proxy.md — capture ESPN fixtures + sizes.
 *
 *   node scripts/live-proxy-capture.mjs
 *
 * 1. ESPN default scoreboard → current week W.
 * 2. scoreboard?seasontype=2&week=W → lib/__fixtures__/espn/scoreboard-week.json (full).
 * 3. First `post` event (else week W−1) → summary → lib/__fixtures__/espn/summary-final.json,
 *    trimmed to the only fields parseSummary / isSummaryFinal read. Raw sizes are measured first.
 * 4. Writes docs/plans/2026-10-12-live-scores-proxy/p0-capture.json.
 *
 * Sequential calls, ≥300 ms apart, 15s timeout each.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX_DIR = join(ROOT, 'lib/__fixtures__/espn');
const OUT_DIR = join(ROOT, 'docs/plans/2026-10-12-live-scores-proxy');
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const GAP_MS = 300;
const TIMEOUT_MS = 15_000;

let lastCall = 0;
let calls = 0;
async function espn(url) {
  const wait = lastCall + GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  calls += 1;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status} for ${url}`);
  const text = await res.text();
  return {
    json: JSON.parse(text),
    raw: Buffer.byteLength(text),
    gzip: gzipSync(text).length,
    headers: {
      contentEncoding: res.headers.get('content-encoding'),
      cacheControl: res.headers.get('cache-control'),
      age: res.headers.get('age'),
      date: res.headers.get('date'),
    },
  };
}

const sizeOf = (obj) => {
  const text = JSON.stringify(obj, null, 2);
  return { raw: Buffer.byteLength(text), gzip: gzipSync(text).length };
};

const states = (sb) => {
  const mix = { pre: 0, in: 0, post: 0 };
  for (const e of sb.events ?? []) {
    const s = e.competitions?.[0]?.status?.type?.state;
    if (s in mix) mix[s] += 1;
  }
  return mix;
};

const firstPost = (sb) =>
  (sb.events ?? []).find((e) => e.competitions?.[0]?.status?.type?.state === 'post');

async function main() {
  const def = await espn(`${BASE}/scoreboard`);
  const week = Number(process.env.WEEK) || def.json.week?.number;
  if (!week) throw new Error('could not read the current week');

  const sb = await espn(`${BASE}/scoreboard?seasontype=2&week=${week}`);
  let post = firstPost(sb.json);
  let postWeek = week;
  if (!post && week > 1) {
    const prev = await espn(`${BASE}/scoreboard?seasontype=2&week=${week - 1}`);
    post = firstPost(prev.json);
    postWeek = week - 1;
  }
  if (!post) throw new Error('no finished game in week W or W−1');

  const sum = await espn(`${BASE}/summary?event=${post.id}`);
  const trimmed = {
    header: { competitions: [{ status: sum.json.header?.competitions?.[0]?.status }] },
    boxscore: { players: sum.json.boxscore?.players },
    article: { headline: sum.json.article?.headline },
  };

  mkdirSync(FIX_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(FIX_DIR, 'scoreboard-week.json'), JSON.stringify(sb.json, null, 2) + '\n');
  writeFileSync(join(FIX_DIR, 'summary-final.json'), JSON.stringify(trimmed, null, 2) + '\n');

  const report = {
    capturedAt: new Date().toISOString(),
    week,
    summaryEvent: { id: post.id, week: postWeek },
    scoreboard: { raw: sb.raw, gzip: sb.gzip, ...sb.headers, events: sb.json.events?.length ?? 0, states: states(sb.json) },
    summary: { raw: sum.raw, gzip: sum.gzip, ...sum.headers },
    summaryTrimmed: sizeOf(trimmed),
    espnCalls: calls,
  };
  writeFileSync(join(OUT_DIR, 'p0-capture.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(`capture failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
