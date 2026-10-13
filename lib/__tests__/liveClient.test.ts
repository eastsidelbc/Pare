import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mapEspnScoreboard, type EspnScoreboard } from '@/lib/espnScoreboard';
import { reviveMatchups, type SerializedMatchup } from '@/lib/liveClient';

const raw = JSON.parse(readFileSync(join(__dirname, '../__fixtures__/espn/scoreboard-week.json'), 'utf8')) as EspnScoreboard;

describe('reviveMatchups', () => {
  it('JSON round-trip + revive equals the mapper output (Dates included)', () => {
    const mapped = mapEspnScoreboard(raw, raw.week?.number ?? 1);
    const overJson = JSON.parse(JSON.stringify(mapped)) as SerializedMatchup[];
    const revived = reviveMatchups(overJson);
    expect(revived).toEqual(mapped);
    expect(revived.every((m) => m.kickoff instanceof Date)).toBe(true);
  });
});
