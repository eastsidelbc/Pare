/**
 * Every constant lives in lib/formulas/config.ts (plan 2026-10-23-formula-library.md "Rules").
 * Same scan as scripts/leans-gates.mjs l3, but 2 is allowed too (squares, halves).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(__dirname, '..');

function codeOnly(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

// Every number in the code; 0, 1, 2 and 100 are identities, anything else is a constant.
const NUMBER = /(?<![\w.$])\d+(?:\.\d+)?(?![\w.])/g;
const ALLOWED = new Set([0, 1, 2, 100]);

function literalsIn(code: string): string[] {
  return [...codeOnly(code).matchAll(NUMBER)].map((m) => m[0]).filter((n) => !ALLOWED.has(Number(n)));
}

describe('formulas — no numeric literals outside config.ts', () => {
  it('the scanner catches decimals and multi-digit numbers', () => {
    expect(literalsIn('x * 13.5 + y * 0.5 + k >= 12 // 99 in a comment')).toEqual(['13.5', '0.5', '12']);
    expect(literalsIn("a / 2 + b ** 2 + 100 / (c + 100) + Math.SQRT1_2 + '7'")).toEqual([]);
  });
  it('every formula file is literal-free', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.ts') && f !== 'config.ts');
    expect(files.length).toBeGreaterThan(0);
    const bad = files.flatMap((f) => literalsIn(readFileSync(join(DIR, f), 'utf8')).map((n) => `${f}: ${n}`));
    expect(bad).toEqual([]);
  });
});
