/**
 * Standings splits (Wave B4). Fixture: live ESPN standings 2026 (default level), AFC East
 * entries trimmed to name/type/value/displayValue (lib/__fixtures__/espn/standings-afc-east-2026.json).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { mapEntry, withDivisionGamesBehind, type EspnEntry, type TeamStanding } from '@/lib/standings';

const entries = JSON.parse(readFileSync(new URL('../__fixtures__/espn/standings-afc-east-2026.json', import.meta.url), 'utf8')) as EspnEntry[];
const teams = entries.map((e) => mapEntry(e)?.standing).filter((t): t is TeamStanding => !!t);

describe('mapEntry — splits', () => {
  it('home / road / conference records come from the typed record stats', () => {
    const buf = teams.find((t) => t.abbr === 'BUF');
    expect(buf).toMatchObject({ homeRecord: '2-1', roadRecord: '3-0', confRecord: '3-1', clincher: null });
  });
});

describe('withDivisionGamesBehind', () => {
  it('measured against the division leader, not ESPN\'s conference GB', () => {
    const gb = Object.fromEntries(withDivisionGamesBehind(teams).map((t) => [t.abbr, t.gamesBehind]));
    // ESPN default-level GB for this data: BUF 0.5, NE 2, NYJ 3.5, MIA 5 (vs the AFC leader).
    expect(gb).toEqual({ BUF: '—', NE: '1.5', NYJ: '3', MIA: '4.5' });
  });
  it('a team level with the leader shows "—"; empty → []', () => {
    const [a] = teams;
    expect(withDivisionGamesBehind([a, { ...a, abbr: 'X' }]).map((t) => t.gamesBehind)).toEqual(['—', '—']);
    expect(withDivisionGamesBehind([])).toEqual([]);
  });
});
