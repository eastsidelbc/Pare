import { describe, it, expect, vi } from 'vitest';
import {
  shouldPollLive,
  scoreboardTtlMs,
  KICKOFF_LEAD_MS,
  LATE_START_GRACE_MS,
  LIVE_TTL_MS,
  IDLE_TTL_MS,
} from '@/lib/liveWindow';
import { createLiveCache } from '@/lib/apiCache';

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

describe('scoreboardTtlMs (server cache TTL)', () => {
  it('live ttl: a game in progress → 15s', () => {
    expect(scoreboardTtlMs([game('post'), game('in')], KICK + 60 * MIN)).toBe(15_000);
    expect(LIVE_TTL_MS).toBe(15_000);
  });
  it('idle ttl no upcoming: all final → 5 min', () => {
    expect(scoreboardTtlMs([game('post'), game('post')], KICK + 4 * 60 * MIN)).toBe(300_000);
    expect(IDLE_TTL_MS).toBe(300_000);
  });
  it('kickoff cap: next live window opens in 2 min → 120s', () => {
    const windowOpen = KICK - KICKOFF_LEAD_MS;
    expect(scoreboardTtlMs([game('post', new Date(KICK - 5 * 3600_000)), game('pre')], windowOpen - 2 * MIN)).toBe(120_000);
  });
  it('kickoff cap never goes below 1s', () => {
    expect(scoreboardTtlMs([game('pre')], KICK - KICKOFF_LEAD_MS - 1)).toBe(1_000);
  });
  it('stale when window opens: a cached idle scoreboard expires exactly at window open', async () => {
    const windowOpen = KICK - KICKOFF_LEAD_MS;
    let t = windowOpen - 2 * MIN;
    const cache = createLiveCache<ReturnType<typeof game>[]>({
      label: 'test',
      max: 4,
      retainMs: 6 * 3600_000,
      ttlFor: (games, now) => scoreboardTtlMs(games, now),
      now: () => t,
    });
    const fetcher = vi.fn(async () => [game('post', new Date(KICK - 5 * 3600_000)), game('pre')]);

    expect((await cache.get('w5', fetcher)).status).toBe('MISS');
    t = windowOpen - 1;
    expect((await cache.get('w5', fetcher)).status).toBe('HIT');
    expect(fetcher).toHaveBeenCalledTimes(1);
    t = windowOpen;
    expect((await cache.get('w5', fetcher)).status).toBe('MISS');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
