import { describe, it, expect } from 'vitest';
import { shouldPollLive, KICKOFF_LEAD_MS, LATE_START_GRACE_MS } from '@/lib/liveWindow';

const KICK = Date.UTC(2026, 9, 4, 17, 0); // Sun 1:00pm ET
const MIN = 60_000;
const game = (state: 'pre' | 'in' | 'post', kickoff = new Date(KICK)) => ({ state, kickoff });

describe('shouldPollLive', () => {
  it('polls while a game is live', () => {
    expect(shouldPollLive([game('in')], KICK + 90 * MIN)).toBe(true);
  });
  it('does not poll for a game far in the future', () => {
    expect(shouldPollLive([game('pre')], KICK - 2 * 60 * MIN)).toBe(false);
  });
  it('starts polling 10 min before kickoff (page opened pre-game goes live on its own)', () => {
    expect(shouldPollLive([game('pre')], KICK - KICKOFF_LEAD_MS - 1)).toBe(false);
    expect(shouldPollLive([game('pre')], KICK - KICKOFF_LEAD_MS)).toBe(true);
    expect(shouldPollLive([game('pre')], KICK - 5 * MIN)).toBe(true);
  });
  it('keeps polling a late start that ESPN still lists as "pre"', () => {
    expect(shouldPollLive([game('pre')], KICK + 20 * MIN)).toBe(true);
    expect(shouldPollLive([game('pre')], KICK + LATE_START_GRACE_MS + 1)).toBe(false);
  });
  it('never polls for finished games', () => {
    expect(shouldPollLive([game('post')], KICK + 10 * MIN)).toBe(false);
  });
  it('mixed slate: one live game is enough', () => {
    expect(shouldPollLive([game('post'), game('pre', new Date(KICK + 5 * 3600_000)), game('in')], KICK + 60 * MIN)).toBe(true);
  });
  it('tolerates a serialized kickoff string and ignores bad dates', () => {
    expect(shouldPollLive([{ state: 'pre', kickoff: new Date(KICK).toISOString() as unknown as Date }], KICK)).toBe(true);
    expect(shouldPollLive([{ state: 'pre', kickoff: new Date('nope') }], KICK)).toBe(false);
  });
  it('empty slate → no polling', () => {
    expect(shouldPollLive([], KICK)).toBe(false);
  });
});
