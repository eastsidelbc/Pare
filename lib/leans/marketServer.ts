/**
 * Leans market facts — server side (Wave B1). One shared copy per game for
 * `MARKET_TTL_MS` (lines move slowly pregame; the list page reads many games at once),
 * last good copy on an ESPN failure (`createKeyedCache`). Two ESPN calls per game:
 * Core odds + site summary (for `gameInfo` weather / venue). Never nested in
 * another cache.
 */
import 'server-only';
import { createKeyedCache } from '@/lib/apiCache';
import { parseMarket, type EspnCoreOdds, type EspnGameInfo, type GameMarket } from './market';

const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
export const MARKET_TTL_MS = 5 * 60_000;
const TIMEOUT_MS = 5_000;

const markets = createKeyedCache<GameMarket | null>({ ttlMs: MARKET_TTL_MS, max: 400 });

async function json<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  return (await res.json()) as T;
}

export function getGameMarket(eventId: string): Promise<GameMarket | null> {
  return markets.get(
    eventId,
    async () => {
      const [odds, info] = await Promise.all([
        json<EspnCoreOdds>(`${CORE}/events/${eventId}/competitions/${eventId}/odds`),
        // Weather/venue are nice-to-have: a summary failure must not lose the lines.
        json<EspnGameInfo>(`${SITE}/summary?event=${eventId}`).catch(() => null),
      ]);
      return parseMarket(odds, info);
    },
    'leans:market',
  );
}
