/**
 * Market facts + book choice. Fixtures: real ESPN Core odds, trimmed —
 * upcoming DAL @ PHI (401873009, one book) and the 2025 final KC @ DAL (401772694:
 * total-only book, full pregame book, in-game book).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pregameBook, type EspnCoreOdds } from '@/lib/espnCoreOdds';
import { moved, parseLine, parseMarket } from '@/lib/leans/market';

const load = (name: string) => JSON.parse(readFileSync(new URL(`../../__fixtures__/espn/${name}`, import.meta.url), 'utf8')) as EspnCoreOdds;
const upcoming = load('core-odds-upcoming.json');
const final = load('core-odds-final.json');

describe('pregameBook', () => {
  it('skips a total-only book and the in-game book on a final', () => {
    expect(pregameBook(final)?.details).toBe('KC -3.5');
  });
  it('falls back to a total-only book, then null', () => {
    expect(pregameBook({ items: [{ overUnder: 44 }] })?.overUnder).toBe(44);
    expect(pregameBook({ items: [{ provider: { name: 'Book - Live Odds' }, details: 'KC -3' }] })).toBeNull();
    expect(pregameBook(null)).toBeNull();
  });
});

describe('parseMarket — upcoming DAL @ PHI', () => {
  const m = parseMarket(upcoming, { gameInfo: { venue: { fullName: 'Lincoln Financial Field', grass: true }, weather: { temperature: 59, gust: 12, precipitation: 0 } } });
  it('spread + total open → current', () => {
    expect(m?.homeSpread).toEqual({ open: -3, current: 4.5 });
    expect(moved(m?.homeSpread ?? { open: null, current: null })).toBe(7.5);
    expect(m?.total).toEqual({ open: 48.5, current: 44.5 });
  });
  it('no-vig win chance from the current moneyline (−218 / +180)', () => {
    expect(m?.winChance?.away).toBeCloseTo(0.6575, 3);
    expect((m?.winChance?.away ?? 0) + (m?.winChance?.home ?? 0)).toBeCloseTo(1, 10);
  });
  it('key numbers, weather, venue', () => {
    expect(m?.keySpread).toBe('none');
    expect(m?.keyTotal).toBe('near');
    expect(m?.weather).toEqual({ tempF: 59, gustMph: 12, precipPct: 0 });
    expect(m?.venue).toEqual({ name: 'Lincoln Financial Field', turf: false });
  });
});

describe('parseMarket — edges', () => {
  it('a final reads the full pregame book', () => {
    expect(parseMarket(final, null)?.winChance).not.toBeNull();
  });
  it('no book but a venue → facts without lines; nothing at all → null', () => {
    const m = parseMarket({ items: [] }, { gameInfo: { venue: { fullName: 'Dome', grass: false } } });
    expect(m?.homeSpread).toEqual({ open: null, current: null });
    expect(m?.venue?.turf).toBe(true);
    expect(parseMarket(null, null)).toBeNull();
  });
  it('parseLine', () => {
    expect(parseLine('+4.5')).toBe(4.5);
    expect(parseLine('PK')).toBe(0);
    expect(parseLine('x')).toBeNull();
  });
});

describe('MarketCard rows (copy)', async () => {
  const { marketRows } = await import('@/components/leans/MarketCard');
  const m = parseMarket(upcoming, { gameInfo: { venue: { fullName: 'Lincoln Financial Field', grass: true }, weather: { temperature: 59, gust: 12, precipitation: 0 } } });
  const rows = m ? marketRows(m, 'DAL', 'PHI') : [];
  const byKey = (k: string) => rows.find((r) => r.key === k);
  it('spread moved toward the road team', () => {
    expect(byKey('spread')).toMatchObject({ label: 'Spread (PHI)', value: '−3 → +4.5', sub: 'Moved 7.5 toward DAL' });
  });
  it('total, win chance, key number, weather, venue', () => {
    expect(byKey('total')).toMatchObject({ value: '48.5 → 44.5', sub: 'Down 4 since it opened' });
    expect(byKey('win')?.value).toBe('DAL 66% · PHI 34%');
    expect(byKey('keys')?.value).toEqual(['Total is half a point from 44']);
    expect(byKey('weather')?.value).toBe('59° · gusts 12 mph · 0% rain');
    expect(byKey('venue')).toMatchObject({ value: 'Lincoln Financial Field', sub: 'Grass' });
  });
});
