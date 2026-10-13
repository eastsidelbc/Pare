/**
 * /api/live/scoreboard + /api/live/summary with a mocked ESPN (P0 fixtures).
 * Each test re-imports the modules so the in-memory caches + budgets start fresh.
 */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KICKOFF_LEAD_MS } from '@/lib/liveWindow';

vi.mock('server-only', () => ({}));

const FIX = join(__dirname, '../__fixtures__/espn');
const SCOREBOARD = JSON.parse(readFileSync(join(FIX, 'scoreboard-week.json'), 'utf8'));
const SUMMARY = JSON.parse(readFileSync(join(FIX, 'summary-final.json'), 'utf8'));
const WEEK = SCOREBOARD.week.number as number;
const EVENT = '401872980';

const MIN = 60_000;
const NOW = Date.UTC(2026, 9, 13, 1, 0); // capture time: one game live
const CACHE_CONTROL = /^public, s-maxage=\d+, stale-while-revalidate=\d+$/;

type FetchArgs = [input: string | URL, init?: RequestInit];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn<(...args: FetchArgs) => Promise<Response>>>;
function serve(scoreboard: unknown = SCOREBOARD, summary: unknown = SUMMARY) {
  fetchMock = vi.fn(async (input: string | URL) => (String(input).includes('/scoreboard') ? json(scoreboard) : json(summary)));
  vi.stubGlobal('fetch', fetchMock);
}

async function load() {
  vi.resetModules();
  const scoreboard = await import('@/app/api/live/scoreboard/route');
  const summary = await import('@/app/api/live/summary/route');
  const live = await import('@/lib/espnLive');
  return { scoreboard, summary, live };
}
const req = (path: string) => new Request(`http://localhost${path}`);
const sMaxAge = (res: Response) => Number(/s-maxage=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1]);

/** Deep copy of the scoreboard fixture with every game's state rewritten. */
interface FixtureEvent {
  date: string;
  competitions: { status: { type: { state: string; completed: boolean; name: string } } }[];
}
function withGames(fn: (i: number) => { state: 'pre' | 'post'; date?: string }) {
  const copy = structuredClone(SCOREBOARD) as { events: FixtureEvent[] };
  copy.events.forEach((e, i) => {
    const { state, date } = fn(i);
    e.competitions[0].status.type = { state, completed: state === 'post', name: state === 'post' ? 'STATUS_FINAL' : 'STATUS_SCHEDULED' };
    if (date) e.date = date;
  });
  return copy;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  serve();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GET /api/live/scoreboard', () => {
  it('200 + shape', async () => {
    const { scoreboard } = await load();
    const res = await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.week).toBe(WEEK);
    expect(body.stale).toBe(false);
    expect(body.updatedAt).toBe(new Date(NOW).toISOString());
    expect(body.matchups.length).toBeGreaterThan(0);
    expect(body.matchups[0]).toMatchObject({ id: expect.any(String), kickoff: expect.any(String), state: expect.any(String) });
    expect(res.headers.get('x-pare-cache')).toBe('MISS');
    expect(res.headers.get('cache-control')).toMatch(CACHE_CONTROL);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('400 for bad weeks', async () => {
    const { scoreboard } = await load();
    for (const q of ['', '?week=0', '?week=19', '?week=abc', '?week=1.5']) {
      const res = await scoreboard.GET(req(`/api/live/scoreboard${q}`));
      expect(res.status, q).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid-week' });
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('second call is a HIT, ESPN fetched once', async () => {
    const { scoreboard } = await load();
    await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    const res = await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    expect(res.headers.get('x-pare-cache')).toBe('HIT');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('upstream 500 after the TTL → STALE last-good with stale: true', async () => {
    const { scoreboard } = await load();
    const first = await (await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`))).json();
    vi.setSystemTime(NOW + 16_000);
    fetchMock.mockResolvedValueOnce(json({}, 500));
    const res = await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-pare-cache')).toBe('STALE');
    const body = await res.json();
    expect(body.stale).toBe(true);
    expect(body.matchups).toEqual(first.matchups);
    expect(body.updatedAt).toBe(first.updatedAt);
  });

  it('upstream timeout (TimeoutError) after the TTL → STALE', async () => {
    const { scoreboard } = await load();
    await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    vi.setSystemTime(NOW + 16_000);
    fetchMock.mockRejectedValueOnce(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    const res = await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    expect(res.headers.get('x-pare-cache')).toBe('STALE');
    expect((await res.json()).stale).toBe(true);
  });

  it('upstream failure with no last-good → 502 upstream', async () => {
    const { scoreboard } = await load();
    fetchMock.mockResolvedValueOnce(json({}, 503));
    const res = await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'upstream' });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('an empty ESPN week is a failure, not a cached empty list', async () => {
    const { scoreboard } = await load();
    fetchMock.mockResolvedValueOnce(json({ events: [] }));
    const res = await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    expect(res.status).toBe(502);
  });

  it('fetches ESPN no-store with a timeout signal (6s)', async () => {
    const { scoreboard, live } = await load();
    await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`seasontype=2&week=${WEEK}`);
    expect(init?.cache).toBe('no-store');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(live.ESPN_LIVE_TIMEOUT_MS).toBe(6_000);
  });

  it('TTL: live clock → s-maxage ≤ 15; all final → ≤ 300', async () => {
    const { scoreboard } = await load();
    const live = await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    expect(sMaxAge(live)).toBeLessThanOrEqual(15);
    expect(live.headers.get('cache-control')).toMatch(CACHE_CONTROL);

    serve(withGames(() => ({ state: 'post' })));
    const { scoreboard: fresh } = await load();
    const idle = await fresh.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    expect(sMaxAge(idle)).toBeLessThanOrEqual(300);
    expect(sMaxAge(idle)).toBeGreaterThan(15);
    expect(idle.headers.get('cache-control')).toMatch(CACHE_CONTROL);
  });

  it('kickoff not delayed: an idle copy expires exactly when the next live window opens', async () => {
    const K = Date.UTC(2026, 9, 18, 17, 0);
    const windowOpen = K - KICKOFF_LEAD_MS;
    serve(withGames((i) => (i === 0 ? { state: 'pre', date: new Date(K).toISOString() } : { state: 'post' })));
    const { scoreboard } = await load();
    const get = () => scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));

    vi.setSystemTime(windowOpen - 2 * MIN);
    const first = await get();
    expect(first.headers.get('x-pare-cache')).toBe('MISS');
    expect(sMaxAge(first)).toBeLessThanOrEqual(120);

    vi.setSystemTime(windowOpen - 1_000);
    expect((await get()).headers.get('x-pare-cache')).toBe('HIT');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(windowOpen);
    expect((await get()).headers.get('x-pare-cache')).toBe('MISS');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('parity: matchups equal the P0 snapshot', async () => {
    const { scoreboard } = await load();
    const body = await (await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`))).json();
    await expect(JSON.stringify(body.matchups, null, 2)).toMatchFileSnapshot('../__fixtures__/espn/parity/scoreboard-matchups.json');
  });
});

describe('GET /api/live/summary', () => {
  it('200 + shape (GameSummary only)', async () => {
    const { summary } = await load();
    const res = await summary.GET(req(`/api/live/summary?event=${EVENT}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(['byAbbr', 'headline']);
    expect(Object.values(body.byAbbr as Record<string, { lines: unknown[] }>).some((t) => t.lines.length > 0)).toBe(true);
    expect(res.headers.get('x-pare-cache')).toBe('MISS');
    expect(String(fetchMock.mock.calls[0][0])).toContain(`summary?event=${EVENT}`);
  });

  it('400 for bad event ids', async () => {
    const { summary } = await load();
    for (const q of ['', '?event=abc', '?event=12345', '?event=1234567890123']) {
      const res = await summary.GET(req(`/api/live/summary${q}`));
      expect(res.status, q).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid-event' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('second call is a HIT; a final game is cached ≤ 6h', async () => {
    const { summary } = await load();
    const first = await summary.GET(req(`/api/live/summary?event=${EVENT}`));
    expect(sMaxAge(first)).toBeLessThanOrEqual(21_600);
    expect(sMaxAge(first)).toBeGreaterThan(60);
    expect(first.headers.get('cache-control')).toMatch(CACHE_CONTROL);
    const second = await summary.GET(req(`/api/live/summary?event=${EVENT}`));
    expect(second.headers.get('x-pare-cache')).toBe('HIT');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('61 distinct event ids → the 61st is 503 busy, no throw', async () => {
    const { summary } = await load();
    for (let i = 0; i < 60; i += 1) {
      expect((await summary.GET(req(`/api/live/summary?event=${401000000 + i}`))).status).toBe(200);
    }
    const res = await summary.GET(req(`/api/live/summary?event=${401000060}`));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'busy' });
    expect(fetchMock).toHaveBeenCalledTimes(60);
  });

  it('a spent summary budget never starves the scoreboard', async () => {
    const { summary, scoreboard } = await load();
    for (let i = 0; i < 61; i += 1) await summary.GET(req(`/api/live/summary?event=${401000000 + i}`));
    expect((await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`))).status).toBe(200);
  });

  it('parity: body equals the P0 snapshot', async () => {
    const { summary } = await load();
    const body = await (await summary.GET(req(`/api/live/summary?event=${EVENT}`))).json();
    await expect(JSON.stringify(body, null, 2)).toMatchFileSnapshot('../__fixtures__/espn/parity/summary-final.json');
  });
});
