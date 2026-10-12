/**
 * My Team matchup ramp — WCAG checks on the real token values (design-system §1,
 * §9.4). Parses app/globals.css :root, so changing a color there re-runs the math.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');

function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`--${name} not found as a 6-digit hex in globals.css`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const RAMP = [1, 2, 3, 4, 5].map((n) => ({ name: `matchup-${n}`, hex: token(`matchup-${n}`) }));
// The list card is the deep gradient — check every stop, so the worst one passes.
const CARDS = ['card-deep-a', 'card-deep-mid', 'card-deep-b'].map((name) => ({ name, hex: token(name) }));
const TRACK = token('matchup-track');

describe('--matchup-* ramp (My Team meter)', () => {
  for (const step of RAMP) {
    for (const card of CARDS) {
      it(`${step.name} ≥3:1 (bars) and ≥4.5:1 (label text) on --${card.name}`, () => {
        const ratio = contrast(step.hex, card.hex);
        expect(ratio).toBeGreaterThanOrEqual(3);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${step.name} ≥3:1 vs --matchup-track (filled vs unfilled bar)`, () => {
      expect(contrast(step.hex, TRACK)).toBeGreaterThanOrEqual(3);
    });
  }

  it('luminance rises strictly 1 → 5 (reads in grayscale)', () => {
    const lum = RAMP.map((s) => luminance(s.hex));
    for (let i = 1; i < lum.length; i++) expect(lum[i]).toBeGreaterThan(lum[i - 1]);
  });

  it('--matchup-bye (dashed outline) ≥3:1 on every deep card stop', () => {
    for (const card of CARDS) expect(contrast(token('matchup-bye'), card.hex)).toBeGreaterThanOrEqual(3);
  });
});

describe('My Team color values live only in app/globals.css', () => {
  const NAMES = [
    ...[1, 2, 3, 4, 5].map((n) => `matchup-${n}`), 'matchup-bye', 'matchup-track',
    'pos-qb', 'pos-rb', 'pos-wr', 'pos-te', 'pos-other', 'inj-q', 'inj-d', 'inj-o', 'inj-ir',
  ];
  // --matchup-bye / --matchup-track reuse --seed-edge / --border values, which other
  // (non-My Team) code may legitimately reference by token — check only the new hexes.
  const hexes = [...new Set(NAMES.map(token).map((h) => h.toLowerCase()))].filter((h) => h !== '#5b6680' && h !== '#2a3450');

  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
    });
  }

  it('no component or route hardcodes a --matchup-* / --pos-* / --inj-* value', () => {
    const offenders = [...files(join(ROOT, 'components')), ...files(join(ROOT, 'app'))]
      .filter((p) => !p.endsWith(join('app', 'globals.css')))
      .filter((p) => hexes.some((h) => readFileSync(p, 'utf8').toLowerCase().includes(h)));
    expect(offenders).toEqual([]);
  });
});
