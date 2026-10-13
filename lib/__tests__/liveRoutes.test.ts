/**
 * /api/live/scoreboard + /api/live/summary with a mocked ESPN (P0 fixtures) and a
 * mocked Sleeper (week lines + player map, for the box-score Pare points).
 * Each test re-imports the modules so the in-memory caches + budgets start fresh.
 */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { KICKOFF_LEAD_MS } from '@/lib/liveWindow';
import { applySleeperPoints, parePoints, type PprIndex } from '@/lib/fantasyPoints';
import { toWireSummary, type GameSummary, type ParsedSummary } from '@/lib/gameSummary';
import type { PlayerGameLine } from '@/lib/myteam/types';

vi.mock('server-only', () => ({}));

/** Counts gzipSync calls (the real one still runs) — proves "once per fetch". */
const zlibSpy = vi.hoisted(() => ({ gzipCalls: 0 }));
vi.mock('node:zlib', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:zlib')>();
  const gzipSync: typeof real.gzipSync = (...args) => {
    zlibSpy.gzipCalls += 1;
    return real.gzipSync(...args);
  };
  return { ...real, gzipSync };
});

/** Mocked Sleeper — empty by default (no points yet); tests fill or break it. */
const sleeper = vi.hoisted(() => ({
  lines: [] as PlayerGameLine[],
  players: {} as Record<string, { name: string; espnId?: string }>,
  down: false,
}));
vi.mock('@/lib/myteam/sleeper/statLines', () => ({
  getWeekLines: async () => {
    if (sleeper.down) throw new Error('sleeper down');
    return sleeper.lines;
  },
}));
vi.mock('@/lib/fantasy', () => ({
  getPlayerMap: async () => {
    if (sleeper.down) throw new Error('sleeper down');
    return sleeper.players;
  },
}));
vi.mock('@/lib/schedule', () => ({ getCurrentWeekInfo: async () => ({ season: 2026, week: 6 }) }));

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
const gzReq = (path: string, encoding = 'gzip, deflate, br') =>
  new Request(`http://localhost${path}`, { headers: { 'accept-encoding': encoding } });
const bytes = async (res: Response) => Buffer.from(await res.arrayBuffer());
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
  sleeper.lines = [];
  sleeper.players = {};
  sleeper.down = false;
  zlibSpy.gzipCalls = 0;
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

  it('TTL: live clock → s-maxage ≤ 10; all final → > 10 and ≤ 300', async () => {
    const { scoreboard } = await load();
    const live = await scoreboard.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    expect(sMaxAge(live)).toBeLessThanOrEqual(10);
    expect(live.headers.get('cache-control')).toMatch(CACHE_CONTROL);

    serve(withGames(() => ({ state: 'post' })));
    const { scoreboard: fresh } = await load();
    const idle = await fresh.GET(req(`/api/live/scoreboard?week=${WEEK}`));
    expect(sMaxAge(idle)).toBeLessThanOrEqual(300);
    expect(sMaxAge(idle)).toBeGreaterThan(10);
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

  it('parity: body = the parser snapshot + Sleeper points (none yet → passer + top 3 by yards)', async () => {
    const { summary } = await load();
    const body = await (await summary.GET(req(`/api/live/summary?event=${EVENT}`))).json();
    expect(body).toEqual(toWireSummary(applySleeperPoints(parsedSnapshot(), NO_POINTS)));
  });
});

// ── Pare points (Sleeper) on the box score ──────────────────────────────
// The fixture game is TB @ DAL, 2026 week 5 (Dak Prescott: Sleeper pts_ppr 14.64 +
// a 300–399 pass-yd bonus = 17.64). The trimmed fixture has no header.week; live
// ESPN does (P0: docs/plans/2026-10-12-home-sleeper-ppr/p0-check.json), so add it.
const SUMMARY_W5 = { ...SUMMARY, header: { ...SUMMARY.header, week: 5, season: { year: 2026 } } };
const NO_POINTS: PprIndex = { byEspnId: new Map(), byNameTeam: new Map() };
const DAK_ESPN_ID = '2577417';

function parsedSnapshot(): ParsedSummary {
  return JSON.parse(readFileSync(join(FIX, 'parity/summary-final.json'), 'utf8')) as ParsedSummary;
}
/** Served lines are keyed by team + display name (the join fields stay on the server). */
const keyOf = (abbr: string, name: string) => `${abbr}|${name}`;

/** One Sleeper line per box-score player: Dak's real W5 numbers, everyone else i + 0.5. Returns key → Pare points. */
function sleeperFor(parsed: ParsedSummary): Map<string, number | null> {
  const expected = new Map<string, number | null>();
  let i = 0;
  for (const team of Object.values(parsed.byAbbr)) {
    for (const line of team.lines) {
      const id = `sl${i}`;
      const stats: Record<string, number> = line.espnId === DAK_ESPN_ID ? { pts_ppr: 14.64, pass_yd: 316, bonus_pass_yd_300: 1 } : { pts_ppr: i + 0.5 };
      sleeper.players[id] = { name: line.fullName, espnId: line.espnId };
      sleeper.lines.push({
        playerId: id,
        position: line.isPasser ? 'QB' : 'WR',
        team: team.abbr,
        opponent: team.abbr === 'DAL' ? 'TB' : 'DAL',
        week: 5,
        stats,
      });
      expected.set(keyOf(team.abbr, line.name), parePoints(stats));
      i += 1;
    }
  }
  return expected;
}
const served = (body: GameSummary) =>
  Object.values(body.byAbbr).flatMap((t) => t.lines.map((line) => ({ abbr: t.abbr, line })));
const dakOf = (body: GameSummary) => body.byAbbr.DAL.lines.find((l) => l.name === 'Dak Prescott');

describe('GET /api/live/summary — Pare points', () => {
  it('sleeper points attached: every shown ppr = Sleeper pts_ppr + bonus flags; Dak 17.64', async () => {
    serve(SCOREBOARD, SUMMARY_W5);
    const expected = sleeperFor(parsedSnapshot());
    const { summary } = await load();
    const body = (await (await summary.GET(req(`/api/live/summary?event=${EVENT}`))).json()) as GameSummary;
    for (const { abbr, line } of served(body)) expect(line.ppr, line.name).toBe(expected.get(keyOf(abbr, line.name)));
    expect(dakOf(body)?.ppr).toBe(17.64);
    expect(body.byAbbr.DAL.lines[0].name).toBe('Dak Prescott');
    for (const team of Object.values(body.byAbbr)) {
      expect(team.lines).toHaveLength(4);
      expect(team.lines[0].role).toBe('QB');
      const skill = team.lines.slice(1).map((l) => l.ppr ?? 0);
      expect(skill).toEqual([...skill].sort((a, b) => b - a));
      // Join fields stay on the server.
      expect(Object.keys(team.lines[0]).sort()).toEqual(['name', 'ppr', 'role', 'stat']);
    }
  });

  it('sleeper down: still 200, every ppr null, ESPN lines intact', async () => {
    serve(SCOREBOARD, SUMMARY_W5);
    sleeper.down = true;
    const { summary } = await load();
    const res = await summary.GET(req(`/api/live/summary?event=${EVENT}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as GameSummary;
    expect(served(body).length).toBeGreaterThan(0);
    expect(served(body).every(({ line }) => line.ppr === null)).toBe(true);
    const stats = new Map(
      Object.values(parsedSnapshot().byAbbr).flatMap((t) => t.lines.map((l) => [keyOf(t.abbr, l.name), l.stat] as const)),
    );
    for (const { abbr, line } of served(body)) expect(line.stat).toBe(stats.get(keyOf(abbr, line.name)));
  });

  it('points after cache: summary HIT still picks up new Sleeper points', async () => {
    serve(SCOREBOARD, SUMMARY_W5);
    const { summary } = await load();
    const first = await summary.GET(req(`/api/live/summary?event=${EVENT}`));
    expect(first.headers.get('x-pare-cache')).toBe('MISS');
    expect(dakOf((await first.json()) as GameSummary)?.ppr).toBeNull();

    sleeperFor(parsedSnapshot()); // Sleeper posts the game after the summary was cached
    const second = await summary.GET(req(`/api/live/summary?event=${EVENT}`));
    expect(second.headers.get('x-pare-cache')).toBe('HIT');
    expect(dakOf((await second.json()) as GameSummary)?.ppr).toBe(17.64);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ── gzip (we compress /api/live/* ourselves; `next start` doesn't) ──────
describe('/api/live/* gzip', () => {
  const SB = `/api/live/scoreboard?week=${WEEK}`;
  const SM = `/api/live/summary?event=${EVENT}`;

  it('gzip scoreboard: encoded, Vary, Content-Length, decodes to the plain body byte for byte', async () => {
    const { scoreboard } = await load();
    const plain = await (await scoreboard.GET(req(SB))).text();
    const res = await scoreboard.GET(gzReq(SB));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBe('gzip');
    expect(res.headers.get('vary')).toContain('Accept-Encoding');
    const body = await bytes(res);
    expect(Number(res.headers.get('content-length'))).toBe(body.byteLength);
    expect(body.byteLength * 3).toBeLessThan(Buffer.byteLength(plain));
    expect(gunzipSync(body).toString('utf8')).toBe(plain);
    expect(res.headers.get('x-pare-cache')).toMatch(/^(HIT|MISS|STALE)$/);
    expect(res.headers.get('cache-control')).toMatch(CACHE_CONTROL);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('no accept-encoding → plain (and gzip;q=0 → plain)', async () => {
    const { scoreboard } = await load();
    for (const r of [req(SB), gzReq(SB, 'gzip;q=0'), gzReq(SB, 'br, identity')]) {
      const res = await scoreboard.GET(r);
      expect(res.headers.get('content-encoding')).toBeNull();
      expect(res.headers.get('vary')).toContain('Accept-Encoding');
      const body = await res.json();
      expect(body.week).toBe(WEEK);
      expect(body.stale).toBe(false);
    }
    expect(zlibSpy.gzipCalls).toBe(0);
  });

  it('gzip once per fetch: 1 MISS + 100 HITs → gzipSync called once', async () => {
    const { scoreboard } = await load();
    const first = await scoreboard.GET(gzReq(SB));
    expect(first.headers.get('x-pare-cache')).toBe('MISS');
    for (let i = 0; i < 100; i += 1) {
      const res = await scoreboard.GET(gzReq(SB));
      expect(res.headers.get('x-pare-cache')).toBe('HIT');
      expect(res.headers.get('content-encoding')).toBe('gzip');
    }
    expect(zlibSpy.gzipCalls).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stale variant gzipped separately (once), decodes to the plain STALE body', async () => {
    const { scoreboard } = await load();
    await scoreboard.GET(gzReq(SB));
    expect(zlibSpy.gzipCalls).toBe(1);

    vi.setSystemTime(NOW + 16_000);
    fetchMock.mockResolvedValue(json({}, 500));
    const staleGz = await scoreboard.GET(gzReq(SB));
    expect(staleGz.headers.get('x-pare-cache')).toBe('STALE');
    expect(staleGz.headers.get('content-encoding')).toBe('gzip');
    const decoded = gunzipSync(await bytes(staleGz)).toString('utf8');
    expect(JSON.parse(decoded).stale).toBe(true);
    expect(zlibSpy.gzipCalls).toBe(2);

    const stalePlain = await scoreboard.GET(req(SB));
    expect(stalePlain.headers.get('x-pare-cache')).toBe('STALE');
    expect(await stalePlain.text()).toBe(decoded);

    const again = await scoreboard.GET(gzReq(SB));
    expect(again.headers.get('x-pare-cache')).toBe('STALE');
    expect(zlibSpy.gzipCalls).toBe(2);
  });

  it('summary under 1 KB stays plain (real fixture)', async () => {
    const { summary, live } = await load();
    const res = await summary.GET(gzReq(SM));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBeNull();
    expect(res.headers.get('vary')).toContain('Accept-Encoding');
    expect(Buffer.byteLength(await res.text())).toBeLessThan(live.GZIP_MIN_BYTES);
    expect(zlibSpy.gzipCalls).toBe(0);
  });

  it('summary ≥ 1 KB gzipped per response', async () => {
    serve(SCOREBOARD, { ...SUMMARY, article: { headline: 'x'.repeat(2_000) } });
    const { summary } = await load();
    const plain = await (await summary.GET(req(SM))).text();
    expect(Buffer.byteLength(plain)).toBeGreaterThanOrEqual(1_024);
    for (let i = 0; i < 2; i += 1) {
      const res = await summary.GET(gzReq(SM));
      expect(res.headers.get('content-encoding')).toBe('gzip');
      expect(res.headers.get('vary')).toContain('Accept-Encoding');
      const body = await bytes(res);
      expect(Number(res.headers.get('content-length'))).toBe(body.byteLength);
      expect(gunzipSync(body).toString('utf8')).toBe(plain);
    }
    expect(zlibSpy.gzipCalls).toBe(2);
  });

  it('acceptsGzip: explicit gzip with q > 0 only', async () => {
    const { live } = await load();
    for (const h of ['gzip', 'gzip, deflate, br', 'br;q=1.0, gzip;q=0.8', ' GZIP ', 'deflate, gzip;q=0.5']) {
      expect(live.acceptsGzip(h), h).toBe(true);
    }
    for (const h of [null, '', 'br', 'identity', 'gzip;q=0', 'gzip;q=0.0', 'deflate, br']) {
      expect(live.acceptsGzip(h), String(h)).toBe(false);
    }
  });

  it('errors unchanged: 400 and 502 are plain, no Vary, no-store', async () => {
    const { scoreboard, summary } = await load();
    fetchMock.mockResolvedValueOnce(json({}, 503));
    const responses = [
      await scoreboard.GET(gzReq('/api/live/scoreboard?week=0')),
      await summary.GET(gzReq('/api/live/summary?event=abc')),
      await scoreboard.GET(gzReq(SB)),
    ];
    expect(responses.map((r) => r.status)).toEqual([400, 400, 502]);
    for (const res of responses) {
      expect(res.headers.get('content-encoding')).toBeNull();
      expect(res.headers.get('vary')).toBeNull();
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
    expect(zlibSpy.gzipCalls).toBe(0);
  });
});
