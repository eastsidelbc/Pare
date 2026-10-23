/**
 * Prop lines — server side (Wave B2). Per game: ESPN Core `/odds` → the first pregame
 * book that has a `propBets` list → every page → one main line per player per Leans stat
 * (lib/leans/propLines.ts) → ESPN athlete id mapped to the Sleeper id the Leans bundle
 * uses: Sleeper's `espnId` when it has one, else name + team from the two teams' ESPN
 * rosters (lib/leans/athleteMatch.ts — Sleeper has ESPN ids for only ~¼ of skill players,
 * so an id-only join dropped most star props). One shared copy per game for `data.cacheTtlMs`
 * (10 min, the bundle's window), last good on failure. No user data in or out.
 */
import 'server-only';
import { unstable_cache } from 'next/cache';
import { createKeyedCache } from '@/lib/apiCache';
import { isLiveBook } from '@/lib/espnCoreOdds';
import { getPlayerMap } from '@/lib/fantasy';
import { getMatchupsForWeek } from '@/lib/schedule';
import { resolveTeamByAbbr } from '@/lib/teams';
import { buildAthleteIndex, matchAthlete, type AthleteIndex } from './athleteMatch';
import { LEAN_CONFIG } from './config';
import { parseBookLines, type EspnPropBet, type GamePropLine } from './propLines';

const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
/** Rosters change a few times a week; a day-old copy only misses a same-day signing. */
const ROSTER_REVALIDATE_SECONDS = 24 * 60 * 60;
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

interface EspnRosterRaw {
  athletes?: Array<{ items?: Array<{ id?: string; fullName?: string; position?: { abbreviation?: string } }> }>;
}
type RosterEntry = { name: string; position: string };

/**
 * One team's ESPN roster as athlete id → name + position (~350 KB raw → a few KB).
 * Leaders pattern: `unstable_cache` over a no-store fetch with a timeout; an empty
 * roster throws so it is never cached.
 */
const teamRoster = unstable_cache(
  async (espnTeamId: number): Promise<Record<string, RosterEntry>> => {
    const raw = await json<EspnRosterRaw>(`${SITE}/teams/${espnTeamId}/roster`);
    const out: Record<string, RosterEntry> = {};
    for (const a of (raw?.athletes ?? []).flatMap((g) => g.items ?? [])) {
      if (a.id && a.fullName) out[a.id] = { name: a.fullName, position: a.position?.abbreviation ?? '' };
    }
    if (Object.keys(out).length === 0) throw new Error(`empty ESPN roster ${espnTeamId}`);
    return out;
  },
  ['leans-espn-roster-v1'],
  { revalidate: ROSTER_REVALIDATE_SECONDS, tags: ['leans-espn-roster'] },
);

/** Both teams' rosters merged; a team whose roster fails just falls back to the id join. */
async function rostersFor(teams: readonly string[]): Promise<Record<string, RosterEntry>> {
  const ids = teams.map((t) => resolveTeamByAbbr(t)?.espnId).filter((id): id is number => typeof id === 'number');
  const parts = await Promise.all(ids.map((id) => teamRoster(id).catch(() => ({}))));
  return Object.assign({}, ...parts) as Record<string, RosterEntry>;
}

/** Sleeper player map (24h-cached) → match index; rebuilt only when the map object changes. */
let indexMemo: { map: object; idx: AthleteIndex } | null = null;
async function athleteIndex(): Promise<AthleteIndex> {
  const map = await getPlayerMap();
  if (indexMemo?.map !== map) {
    const players = Object.entries(map).map(([id, p]) => ({ id, name: p.name, position: p.position, team: p.team, espnId: p.espnId }));
    indexMemo = { map, idx: buildAthleteIndex(players) };
  }
  return indexMemo.idx;
}

async function loadGame(eventId: string, teams: readonly string[]): Promise<GamePropLine[]> {
  const odds = await json<{ items?: PropBookItem[] }>(`${CORE}/events/${eventId}/competitions/${eventId}/odds`);
  const book = (odds?.items ?? []).find((o) => !isLiveBook(o) && o.propBets?.$ref);
  const ref = book?.propBets?.$ref?.replace(/^http:/, 'https:');
  if (!ref) return [];
  const base = `${ref}${ref.includes('?') ? '&' : '?'}limit=1000`;
  const first = await json<Paged<EspnPropBet>>(`${base}&page=1`);
  const pages = Math.min(first?.pageCount ?? 1, MAX_PAGES);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => json<Paged<EspnPropBet>>(`${base}&page=${i + 2}`)));
  const lines = parseBookLines([first, ...rest].flatMap((p) => p?.items ?? []));
  const [idx, roster] = await Promise.all([athleteIndex(), rostersFor(teams)]);
  return lines.flatMap(({ espnId, ...l }) => {
    const r = roster[espnId];
    const playerId = matchAthlete(idx, { espnId, name: r?.name, position: r?.position, teams });
    return playerId ? [{ ...l, playerId }] : [];
  });
}

/** `teams` = the game's two team abbrs (name join scope). */
export function getGamePropLines(eventId: string, teams: readonly string[]): Promise<GamePropLine[]> {
  return games.get(eventId, () => loadGame(eventId, teams), 'leans:props');
}

/** Every game of a week, keyed by Matchup id. A game whose lines fail is left out (others still show). */
export async function getWeekPropLines(week: number): Promise<Record<string, GamePropLine[]>> {
  const matchups = (await getMatchupsForWeek(week)).filter((m) => m.espnEventId);
  const out: Record<string, GamePropLine[]> = {};
  for (let i = 0; i < matchups.length; i += WEEK_CONCURRENCY) {
    const batch = matchups.slice(i, i + WEEK_CONCURRENCY);
    const results = await Promise.all(batch.map((m) => getGamePropLines(m.espnEventId as string, [m.away.abbr, m.home.abbr]).catch(() => null)));
    batch.forEach((m, j) => {
      const r = results[j];
      if (r && r.length > 0) out[m.id] = r;
    });
  }
  return out;
}
