/**
 * Parity baseline for the live scores proxy (docs/plans/2026-10-12-live-scores-proxy.md).
 * Pins what the mapper + summary parser produce from captured ESPN fixtures, so
 * moving them server-side (P2/P3) can be proven byte-for-byte identical.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mapEspnScoreboard, type EspnScoreboard } from '@/lib/espnScoreboard';
import { parseSummary } from '@/lib/hooks/useGameSummary';

const FIX = join(__dirname, '../__fixtures__/espn');
const load = <T>(name: string): T => JSON.parse(readFileSync(join(FIX, name), 'utf8')) as T;

describe('live parity (P0 baseline)', () => {
  it('scoreboard → matchups', async () => {
    const raw = load<EspnScoreboard>('scoreboard-week.json');
    const matchups = mapEspnScoreboard(raw, raw.week?.number ?? 1);
    expect(matchups.length).toBeGreaterThanOrEqual(1);
    await expect(JSON.stringify(matchups, null, 2)).toMatchFileSnapshot('../__fixtures__/espn/parity/scoreboard-matchups.json');
  });

  it('summary → game summary', async () => {
    const summary = parseSummary(load<Parameters<typeof parseSummary>[0]>('summary-final.json'));
    const teams = Object.values(summary.byAbbr);
    expect(teams.some((t) => t.lines.length >= 1)).toBe(true);
    await expect(JSON.stringify(summary, null, 2)).toMatchFileSnapshot('../__fixtures__/espn/parity/summary-final.json');
  });
});
