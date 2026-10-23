/**
 * Live situation (Wave C2). ESPN scoreboard `competitions[].situation` field names as documented
 * in docs/data-catalog.md; the captured week fixture only carries `isRedZone`, so text fields are
 * synthetic here — verify on a live Sunday.
 */
import { describe, expect, it } from 'vitest';
import { mapSituation } from '@/lib/espnScoreboard';

const away = { homeAway: 'away', team: { abbreviation: 'BUF', id: '2' } };
const home = { homeAway: 'home', team: { abbreviation: 'LAR', id: '14' } };

describe('mapSituation', () => {
  it('down & distance, ball spot, possession side, red zone', () => {
    expect(mapSituation({ shortDownDistanceText: '2nd & 7', downDistanceText: '2nd & 7 at LAR 18', possessionText: 'LAR 18', possession: '2', isRedZone: true }, away, home)).toEqual({
      down: '2nd & 7', spot: 'LAR 18', possession: 'away', redZone: true,
    });
  });
  it('falls back to the long text; unknown possession id → null side', () => {
    expect(mapSituation({ downDistanceText: '1st & 10 at BUF 25', possession: '99' }, away, home)).toEqual({ down: '1st & 10', spot: null, possession: null, redZone: false });
  });
  it('nothing usable (the fixture\'s trimmed { isRedZone } only) → null', () => {
    expect(mapSituation({ isRedZone: true }, away, home)).toBeNull();
    expect(mapSituation(undefined, away, home)).toBeNull();
  });
});
