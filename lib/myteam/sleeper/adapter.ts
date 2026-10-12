/**
 * Sleeper implementation of FantasyProvider (server-only).
 *
 * Per-user / per-league data sits in bounded in-memory caches (never on disk),
 * timed to Sleeper's own CDN (P0a): user id 24h, leagues 1h, league settings
 * 1h, rosters 5 min (CDN s-maxage=300), live matchups 60s (s-maxage=60).
 * A failed refresh serves the key's last good copy.
 */
import 'server-only';
import { createKeyedCache } from '@/lib/apiCache';
import { getPlayerMap } from '@/lib/fantasy';
import { registerProvider, type FantasyProvider } from '../provider';
import type { FantasyLeague, FantasyRoster, FantasyUser, LeagueDetail, LivePoints } from '../types';
import { toFantasyLeague, toFantasyUser, toLeagueDetail, type SleeperLeagueRaw, type SleeperUserRaw } from './map';
import { findMyRoster, normalizeRoster, type SleeperPlayerInfo, type SleeperRoster } from './roster';
import { SLEEPER_API, sleeperJson } from './http';

const MIN = 60_000;
const HOUR = 60 * MIN;

interface SleeperMatchupRaw {
  roster_id: number;
  points?: number | null;
  players_points?: Record<string, number> | null;
}

interface LeagueRecord {
  detail: LeagueDetail;
  rosterPositions: string[];
  status: string;
}

const users = createKeyedCache<FantasyUser | null>({ ttlMs: 24 * HOUR, max: 1_000 });
const leagueLists = createKeyedCache<FantasyLeague[]>({ ttlMs: HOUR, max: 1_000 });
const leagues = createKeyedCache<LeagueRecord>({ ttlMs: HOUR, max: 500 });
const rosterLists = createKeyedCache<SleeperRoster[]>({ ttlMs: 5 * MIN, max: 500 });
const rosters = createKeyedCache<FantasyRoster | null>({ ttlMs: 5 * MIN, max: 1_000 });
const matchups = createKeyedCache<SleeperMatchupRaw[]>({ ttlMs: MIN, max: 500 });

function loadLeague(leagueId: string): Promise<LeagueRecord> {
  return leagues.get(
    leagueId,
    async () => {
      const raw = await sleeperJson<SleeperLeagueRaw | null>(`${SLEEPER_API}/league/${leagueId}`);
      const detail = raw ? toLeagueDetail(raw) : null;
      if (!raw || !detail) throw new Error('league not found');
      return { detail, rosterPositions: raw.roster_positions ?? [], status: raw.status ?? '' };
    },
    'myteam:league',
  );
}

function loadRosterList(leagueId: string): Promise<SleeperRoster[]> {
  return rosterLists.get(
    leagueId,
    async () => {
      const raw = await sleeperJson<SleeperRoster[] | null>(`${SLEEPER_API}/league/${leagueId}/rosters`);
      if (!Array.isArray(raw)) throw new Error('rosters missing');
      return raw;
    },
    'myteam:rosters',
  );
}

export const sleeperProvider: FantasyProvider = {
  id: 'sleeper',

  resolveUser(username) {
    return users.get(
      username.toLowerCase(),
      async () => toFantasyUser(await sleeperJson<SleeperUserRaw | null>(`${SLEEPER_API}/user/${encodeURIComponent(username)}`)),
      'myteam:user',
    );
  },

  listLeagues(userId, season) {
    return leagueLists.get(
      `${userId}|${season}`,
      async () => {
        const raw = await sleeperJson<SleeperLeagueRaw[] | null>(`${SLEEPER_API}/user/${userId}/leagues/nfl/${season}`);
        if (!Array.isArray(raw)) throw new Error('leagues missing');
        return raw.map(toFantasyLeague).filter((l): l is FantasyLeague => l !== null);
      },
      'myteam:leagues',
    );
  },

  async getLeague(leagueId) {
    return (await loadLeague(leagueId)).detail;
  },

  getRoster(leagueId, userId) {
    return rosters.get(
      `${leagueId}|${userId}`,
      async () => {
        const [league, list] = await Promise.all([loadLeague(leagueId), loadRosterList(leagueId)]);
        const mine = findMyRoster(list, userId);
        if (!mine) return null;
        const ids = [...(mine.players ?? []), ...(mine.starters ?? []), ...(mine.reserve ?? []), ...(mine.taxi ?? [])];
        const map = ids.length > 0 ? await getPlayerMap() : {};
        // An empty map means Sleeper's player list never loaded — don't cache a roster of bare ids.
        if (ids.length > 0 && Object.keys(map).length === 0) throw new Error('player map unavailable');
        const info: Record<string, SleeperPlayerInfo> = {};
        for (const id of ids) {
          const p = map[id];
          if (p) info[id] = { full_name: p.name, position: p.position, team: p.team || null, injury_status: p.injury ?? null };
        }
        return normalizeRoster(mine, league.rosterPositions, info, league.status);
      },
      'myteam:roster',
    );
  },

  async getLivePoints(leagueId, userId, week): Promise<LivePoints | null> {
    const list = await loadRosterList(leagueId);
    const mine = findMyRoster(list, userId);
    if (!mine) return null;
    const rows = await matchups.get(
      `${leagueId}|${week}`,
      async () => {
        const raw = await sleeperJson<SleeperMatchupRaw[] | null>(`${SLEEPER_API}/league/${leagueId}/matchups/${week}`);
        if (!Array.isArray(raw)) throw new Error('matchups missing');
        return raw;
      },
      'myteam:matchups',
    );
    const row = rows.find((m) => m.roster_id === mine.roster_id);
    if (!row) return null;
    return { week, total: row.points ?? 0, byPlayer: row.players_points ?? {} };
  },
};

registerProvider(sleeperProvider);
