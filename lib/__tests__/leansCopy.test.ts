/**
 * Leans copy rules (DECISIONS §8 — App Store + responsible gambling): no promise
 * words, no "bet now", no sportsbook names, anywhere in Leans code or copy.
 * Scans app/leans, components/leans, lib/leans (tests excluded: they may quote).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const DIRS = ['app/leans', 'app/api/leans', 'components/leans', 'lib/leans'];

const BANNED: ReadonlyArray<[string, RegExp]> = [
  ['lock', /\blocks?\b/i],
  ['guarantee(d)', /\bguarantee(d|s)?\b/i],
  ['sure thing', /\bsure thing\b/i],
  ['free money', /\bfree money\b/i],
  ["can't lose", /\bcan[’']?t lose\b/i],
  ['bet now', /\bbet now\b/i],
  ['must bet', /\bmust bet\b/i],
];

const SPORTSBOOKS: readonly string[] = [
  'DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'PointsBet', 'BetRivers', 'ESPN BET', 'bet365', 'Fanatics', 'Hard Rock Bet',
  'BetOnline', 'Bovada', 'PrizePicks', 'Underdog', 'Barstool', 'WynnBET', 'Unibet', 'SugarHouse', 'Betway', 'theScore Bet',
];

function files(dir: string): string[] {
  const abs = join(ROOT, dir);
  let out: string[] = [];
  try {
    for (const name of readdirSync(abs)) {
      const p = join(abs, name);
      if (statSync(p).isDirectory()) {
        if (name !== '__tests__') out = out.concat(files(relative(ROOT, p)));
      } else if (/\.(tsx?|css|json|md)$/.test(name)) out.push(p);
    }
  } catch {
    // dir not created yet
  }
  return out;
}

const all = DIRS.flatMap(files);
const hits = (re: RegExp) => all.filter((f) => re.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));

describe('Leans copy rules', () => {
  it('scans real Leans files', () => {
    expect(all.length).toBeGreaterThan(10);
  });
  for (const [word, re] of BANNED) {
    it(`no "${word}"`, () => {
      expect(hits(re)).toEqual([]);
    });
  }
  it('no sportsbook names', () => {
    const found = SPORTSBOOKS.flatMap((name) => hits(new RegExp(name.replace(/\s+/g, '\\s*'), 'i')).map((f) => `${name}: ${f}`));
    expect(found).toEqual([]);
  });
  it('the scanner catches a banned word (self-check)', () => {
    expect(BANNED.some(([, re]) => re.test('This is a LOCK of the week'))).toBe(true);
    expect(/draft\s*kings/i.test('DraftKings')).toBe(true);
  });
});
