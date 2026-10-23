import { describe, expect, it } from 'vitest';
import { buildAthleteIndex, matchAthlete } from '../athleteMatch';

const idx = buildAthleteIndex([
  { id: 's1', name: "Ja'Marr Chase", position: 'WR', team: 'CIN' },
  { id: 's2', name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET' },
  { id: 's3', name: 'Kenneth Walker III', position: 'RB', team: 'SEA' },
  { id: 's4', name: 'Josh Allen', position: 'QB', team: 'BUF', espnId: '3918298' },
  { id: 's5', name: 'Mike Williams', position: 'WR', team: 'NYJ' },
  { id: 's6', name: 'Mike Williams', position: 'TE', team: 'NYJ' },
  { id: 's7', name: 'Chris Jones', position: 'WR', team: 'KC' },
  { id: 's8', name: 'Chris Jones', position: 'WR', team: 'KC' },
  { id: 's9', name: 'Álex Peña', position: 'TE', team: 'WAS' },
]);

describe('matchAthlete (ESPN → Sleeper)', () => {
  it('ESPN id first', () => {
    expect(matchAthlete(idx, { espnId: '3918298', name: 'Someone Else', teams: ['MIA'] })).toBe('s4');
  });
  it('no id → name + team (apostrophes, hyphens, suffixes)', () => {
    expect(matchAthlete(idx, { espnId: '1', name: "Ja'Marr Chase", teams: ['PIT', 'CIN'] })).toBe('s1');
    expect(matchAthlete(idx, { espnId: '2', name: 'Amon-Ra St. Brown', teams: ['DET', 'GB'] })).toBe('s2');
    expect(matchAthlete(idx, { espnId: '3', name: 'Kenneth Walker', teams: ['SEA', 'ARI'] })).toBe('s3');
  });
  it('accents + team aliases (WSH → WAS)', () => {
    expect(matchAthlete(idx, { espnId: '4', name: 'Alex Pena', teams: ['WSH', 'DAL'] })).toBe('s9');
  });
  it('shared name → position decides; still ambiguous → null', () => {
    expect(matchAthlete(idx, { espnId: '5', name: 'Mike Williams', position: 'TE', teams: ['NYJ'] })).toBe('s6');
    expect(matchAthlete(idx, { espnId: '5', name: 'Mike Williams', teams: ['NYJ'] })).toBeNull();
    expect(matchAthlete(idx, { espnId: '6', name: 'Chris Jones', position: 'WR', teams: ['KC'] })).toBeNull();
  });
  it('wrong team or no name → null', () => {
    expect(matchAthlete(idx, { espnId: '7', name: "Ja'Marr Chase", teams: ['BUF', 'MIA'] })).toBeNull();
    expect(matchAthlete(idx, { espnId: '8', teams: ['CIN'] })).toBeNull();
  });
});
