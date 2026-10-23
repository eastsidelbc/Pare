/**
 * Prop lines — server side (Wave B2). Per game: ESPN Core `/odds` → the first pregame
 * book that has a `propBets` list → every page → one main line per player per Leans stat
 * (lib/leans/propLines.ts) → ESPN athlete id mapped to the Sleeper id the Leans bundle
 * uses (Sleeper player map `espnId`). One shared copy per game for `data.cacheTtlMs`
 * (10 min, the bundle's window), last good on failure. No user data in or out.
 */
import 'server-only';
import { createKeyedCache } from '@/lib/apiCache';
import { isLiveBook } from '@/lib/espnCoreOdds';
import { getPlayerMap } from '@/lib/fantasy';
import { getMatchupsForWeek } from '@/lib/schedule';
import { LEAN_CONFIG } from './config';
import { parseBookLines, type EspnPropBet, type GamePropLine } from './propLines';

const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
const TIMEOUT_MS = 6_000;
/** ESPN pages hold up to 1,000 items; a game has ~1,050–1,100, so 2 pages. Safety cap. */
const MAX_PAGES = 5;
/** Games fetched at once for a week (each is 2–3 ESPN calls). */
const WEEK_CONCURRENCY = 4;

const games = createKeyedCache<GamePropLine[]>({ ttlMs: LEAN_CONFIG.data.cacheTtlMs, max: 400 });

interface PropBookItem {
  provider?: { name?: string };
  propBets?: { $ref?: string };
}
interface Paged<T> {
  items?: T[];
  pageCount?: number;
}

async function json<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  return (await res.json()) as T;
}

/** ESPN athlete id → Sleeper id, from the (24h-cached) Sleeper player map. */
async function espnToSleeper(): Promise<Map<string, string>> {
  const map = await getPlayerMap();
  const out = new Map<string, string>();
  for (const [sleeperId, p] of Object.entries(map)) if (p.espnId) out.set(p.espnId, sleeperId);
  return out;
}

async function loadGame(eventId: string): Promise<GamePropLine[]> {
  const odds = await json<{ items?: PropBookItem[] }>(`${CORE}/events/${eventId}/competitions/${eventId}/odds`);
  const book = (odds?.items ?? []).find((o) => !isLiveBook(o) && o.propBets?.$ref);
  const ref = book?.propBets?.$ref?.replace(/^http:/, 'https:');
  if (!ref) return [];
  const base = `${ref}${ref.includes('?') ? '&' : '?'}limit=1000`;
  const first = await json<Paged<EspnPropBet>>(`${base}&page=1`);
  const pages = Math.min(first?.pageCount ?? 1, MAX_PAGES);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => json<Paged<EspnPropBet>>(`${base}&page=${i + 2}`)));
  const lines = parseBookLines([first, ...rest].flatMap((p) => p?.items ?? []));
  const ids = await espnToSleeper();
  return lines.flatMap(({ espnId, ...l }) => {
    const playerId = ids.get(espnId);
    return playerId ? [{ ...l, playerId }] : [];
  });
}

export function getGamePropLines(eventId: string): Promise<GamePropLine[]> {
  return games.get(eventId, () => loadGame(eventId), 'leans:props');
}

/** Every game of a week, keyed by Matchup id. A game whose lines fail is left out (others still show). */
export async function getWeekPropLines(week: number): Promise<Record<string, GamePropLine[]>> {
  const matchups = (await getMatchupsForWeek(week)).filter((m) => m.espnEventId);
  const out: Record<string, GamePropLine[]> = {};
  for (let i = 0; i < matchups.length; i += WEEK_CONCURRENCY) {
    const batch = matchups.slice(i, i + WEEK_CONCURRENCY);
    const results = await Promise.all(batch.map((m) => getGamePropLines(m.espnEventId as string).catch(() => null)));
    batch.forEach((m, j) => {
      const r = results[j];
      if (r && r.length > 0) out[m.id] = r;
    });
  }
  return out;
}
