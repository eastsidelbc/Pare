#!/usr/bin/env node
/**
 * Inventory of outbound URLs / fetches in app code (docs/plans/2026-10-12-live-scores-proxy.md).
 *
 *   node scripts/live-proxy-inventory.mjs [--assert-no-espn]
 *
 * Scans app components lib utils config (.ts .tsx .css; tests + fixtures skipped)
 * for http(s):// URLs, `fetch(` calls and <img|link|script> with an absolute
 * src/href. Prints file · 'use client' · under lib/hooks · host.
 * --assert-no-espn → exit 1 if any 'use client' file or lib/hooks/* contains espn.com
 * (or imports ESPN_SCOREBOARD_URL, which hides the host behind a constant).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['app', 'components', 'lib', 'utils', 'config'];
const EXT = /\.(ts|tsx|css)$/;
const SKIP = /(^|\/)(__tests__|__fixtures__|node_modules)(\/|$)|\.test\.tsx?$/;
const URL_RE = /https?:\/\/[^\s'"`)<>\\]+/g;
const FETCH_RE = /\bfetch\(\s*([^,)\n]*)/g;
const TAG_RE = /<(img|link|script)\b[^>]*\b(src|href)=["'{`]+(https?:\/\/[^"'`}\s]+)/g;
const USE_CLIENT = /^\s*['"]use client['"];?\s*$/m;
const ESPN_RE = /espn\.com|ESPN_SCOREBOARD_URL/;

function walk(dir, out = []) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, '/');
    if (SKIP.test(rel)) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(rel);
  }
  return out;
}

export function inventory() {
  const rows = [];
  const files = DIRS.flatMap((d) => walk(join(ROOT, d)));
  for (const file of files) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    const client = USE_CLIENT.test(text);
    const hook = file.startsWith('lib/hooks/');
    const hits = new Map();
    for (const m of text.matchAll(URL_RE)) {
      let host;
      try {
        host = new URL(m[0]).host;
      } catch {
        host = m[0];
      }
      hits.set(`url ${host}`, { kind: 'url', host });
    }
    for (const m of text.matchAll(FETCH_RE)) {
      const target = m[1].trim().slice(0, 50) || '(dynamic)';
      hits.set(`fetch ${target}`, { kind: 'fetch', host: target });
    }
    for (const m of text.matchAll(TAG_RE)) {
      hits.set(`tag ${m[3]}`, { kind: `<${m[1]}>`, host: new URL(m[3]).host });
    }
    for (const hit of hits.values()) rows.push({ file, client, hook, ...hit, espn: ESPN_RE.test(text) });
  }
  return rows;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const rows = inventory();
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad('file', 52)} ${pad('client', 6)} ${pad('hooks', 5)} ${pad('kind', 7)} host/target`);
  for (const r of rows) {
    console.log(`${pad(r.file, 52)} ${pad(r.client ? 'yes' : 'no', 6)} ${pad(r.hook ? 'yes' : 'no', 5)} ${pad(r.kind, 7)} ${r.host}`);
  }
  if (process.argv.includes('--assert-no-espn')) {
    const offenders = [...new Set(rows.filter((r) => (r.client || r.hook) && r.espn).map((r) => r.file))];
    // Files with no URL/fetch hit can still mention espn.com; scan them too.
    for (const d of DIRS) {
      for (const file of walk(join(ROOT, d))) {
        const text = readFileSync(join(ROOT, file), 'utf8');
        if ((USE_CLIENT.test(text) || file.startsWith('lib/hooks/')) && ESPN_RE.test(text) && !offenders.includes(file)) {
          offenders.push(file);
        }
      }
    }
    if (offenders.length > 0) {
      console.log(`\nFAIL  espn.com in client code: ${offenders.join(', ')}`);
      process.exit(1);
    }
    console.log('\nPASS  no espn.com in any \'use client\' file or lib/hooks/*');
  }
}
