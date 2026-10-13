#!/usr/bin/env node
/**
 * Compare two `next build` route tables (docs/plans/2026-10-12-live-scores-proxy.md).
 *
 *   node scripts/route-table-diff.mjs <before.txt> <after.txt>
 *
 * Every non-/api route in BEFORE must keep the same symbol (○ ● ƒ ◐) and
 * Revalidate/Expire tokens in AFTER (sizes ignored). /api/live/scoreboard and
 * /api/live/summary must exist in AFTER as ƒ. Exits 1 otherwise.
 */
import { readFileSync } from 'node:fs';

const SIZE = /\d+(?:\.\d+)?\s(?:B|kB|MB)\b/g;
const ROW = /^[┌├└]\s+([○●ƒ◐])\s+(\/\S*)\s*(.*)$/;
const REQUIRED_DYNAMIC = ['/api/live/scoreboard', '/api/live/summary'];

/** route → { symbol, tokens } (tokens = Revalidate/Expire, sizes stripped). */
export function parseRouteTable(text) {
  const routes = new Map();
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const m = ROW.exec(line);
    if (!m) continue;
    const [, symbol, route, rest] = m;
    const tokens = rest.replace(SIZE, ' ').trim().split(/\s+/).filter(Boolean);
    routes.set(route, { symbol, tokens: tokens.join(' ') });
  }
  return routes;
}

export function diffRouteTables(beforeText, afterText) {
  const before = parseRouteTable(beforeText);
  const after = parseRouteTable(afterText);
  const failures = [];
  if (before.size === 0) failures.push('before: no route table found');
  if (after.size === 0) failures.push('after: no route table found');
  for (const [route, b] of before) {
    if (route.startsWith('/api')) continue;
    const a = after.get(route);
    if (!a) failures.push(`${route}: missing in after`);
    else if (a.symbol !== b.symbol || a.tokens !== b.tokens) {
      failures.push(`${route}: ${b.symbol} [${b.tokens}] → ${a.symbol} [${a.tokens}]`);
    }
  }
  for (const route of REQUIRED_DYNAMIC) {
    const a = after.get(route);
    if (!a) failures.push(`${route}: missing in after`);
    else if (a.symbol !== 'ƒ') failures.push(`${route}: expected ƒ, got ${a.symbol}`);
  }
  return { before: before.size, after: after.size, failures };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) {
    console.error('usage: node scripts/route-table-diff.mjs <before.txt> <after.txt>');
    process.exit(2);
  }
  const res = diffRouteTables(readFileSync(beforePath, 'utf8'), readFileSync(afterPath, 'utf8'));
  console.log(`routes: before ${res.before}, after ${res.after}`);
  for (const f of res.failures) console.log(`FAIL  ${f}`);
  if (res.failures.length === 0) console.log('PASS  route table unchanged (non-/api) + /api/live/* are ƒ');
  process.exit(res.failures.length === 0 ? 0 : 1);
}
