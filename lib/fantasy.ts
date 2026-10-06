/**
 * Fantasy leaderboards seam — one source: Sleeper.
 *
 * Sleeper computes fantasy points for every player AND team defense (full PPR in
 * `pts_ppr`), so the whole Fantasy section (QB/RB/WR/TE/K/D-ST) is built from a
 * single pair of Sleeper responses:
 *   • the season stats  (keyed by numeric player id; D/ST keyed by team abbr)
 *   • the player map     (id → name/position/team) — needed to identify + group
 * Both are fetched once here and cached (stats 6h, the big player map 24h).
 *
 * D/ST detection: Sleeper carries two entries per team — a bare team-abbr key
 * (the defense unit, what we want) and a "TEAM_xxx" key (team totals, skipped).
 * Every other key is a numeric player id resolved through the player map.
 */
import 'server-only';
import { unstable_cache } from 'next/cache';
import type { LeaderBoard, LeaderRow, LeaderSection } from './leaders';
import { getCurrentWeekInfo } from './schedule';
import { getTeamByAbbr, normalizeTeamAbbr, type NflTeam } from './teams';
import { rookieKey, type RookieIndex } from './rookieMatch';

const SLEEPER_STATS_URL = 'https://api.sleeper.app/v1/stats/nfl/regular';
const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl';
const STATS_REVALIDATE = 6 * 60 * 60; // 6h — scores change through the week
const PLAYERS_TTL_SECONDS = 24 * 60 * 60; // 24h — revalidate window for the cached (trimmed) player map
const BOARD_SIZE = 50; // send extra candidates so the client can re-rank by PPG
const FANTASY: LeaderSection = 'fantasy';

interface SleeperStat {
  pts_ppr?: number;
  pts_std?: number;
  gp?: number;
}
interface SleeperPlayer {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  /** 0 during a player's first NFL season (rookie). */
  years_exp?: number | null;
  /** ESPN athlete id (string or number in Sleeper's feed). */
  espn_id?: string | number | null;
}

/** Player boards, in display order (D/ST is appended after). */
const POSITION_BOARDS: { key: string; label: string; pos: string }[] = [
  { key: 'fantasyQB', label: 'QB', pos: 'QB' },
  { key: 'fantasyRB', label: 'RB', pos: 'RB' },
  { key: 'fantasyWR', label: 'WR', pos: 'WR' },
  { key: 'fantasyTE', label: 'TE', pos: 'TE' },
  { key: 'fantasyK', label: 'K', pos: 'K' },
];

/** ESPN team-logo slug differs from our abbr for a couple of teams. */
function espnLogo(abbr: string): string {
  const map: Record<string, string> = { WAS: 'wsh' };
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${(map[abbr] ?? abbr).toLowerCase()}.png`;
}

/** Normalize a Sleeper abbreviation to our registry's. */
function normalizeAbbr(raw: string): string {
  // Strip Sleeper's "TEAM_" D/ST prefix, then apply the shared registry aliases.
  const stripped = raw.startsWith('TEAM_') ? raw.slice(5) : raw;
  return normalizeTeamAbbr(stripped);
}

async function fetchJson<T>(url: string, init: RequestInit, label: string): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error(`❌ [fantasy] ${label} failed:`, err);
    return null;
  }
}

/** Slimmed player record — only what the boards need (keeps the cached map tiny). */
interface SlimPlayer {
  name: string;
  position: string;
  team: string;
  /** true in a player's first NFL season (Sleeper `years_exp === 0`). */
  rookie?: true;
  /** ESPN athlete id — rookies only, and only when Sleeper has it (rare). */
  rookieEspnId?: string;
}

/**
 * Sleeper's full player map is ~20MB — far over Next's 2MB fetch-cache limit, so a
 * plain cached fetch silently never cached it and every request re-downloaded the
 * whole blob. Instead we fetch it raw (no-store, so Next doesn't try to cache 20MB),
 * trim it to { id -> name/position/team }, and let `unstable_cache` hold that SMALL
 * result (24h). The trimmed map caches fine and is shared across requests/invocations,
 * so the 20MB download happens at most once per revalidate — and the route stays static.
 */
const getPlayerMap = unstable_cache(
  async (): Promise<Record<string, SlimPlayer>> => {
    const raw = await fetchJson<Record<string, SleeperPlayer>>(
      SLEEPER_PLAYERS_URL,
      { cache: 'no-store' },
      'players map'
    );
    if (!raw) return {};

    const slim: Record<string, SlimPlayer> = {};
    for (const [id, p] of Object.entries(raw)) {
      if (!p?.position) continue;
      const name = p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
      if (!name) continue;
      const isRookie = p.years_exp === 0;
      const hasEspnId = p.espn_id != null && p.espn_id !== '';
      slim[id] = {
        name,
        position: p.position,
        team: p.team ?? '',
        ...(isRookie ? { rookie: true as const } : {}),
        ...(isRookie && hasEspnId ? { rookieEspnId: String(p.espn_id) } : {}),
      };
    }
    return slim;
  },
  // v3: the slim map gained `rookie` + `rookieEspnId` — new key so an old cached copy isn't reused.
  ['sleeper-player-map-v3'],
  { revalidate: PLAYERS_TTL_SECONDS, tags: ['sleeper-player-map'] }
);

/**
 * This season's rookies (Sleeper `years_exp === 0`, on a team), ready to match ESPN rows:
 * by ESPN id when Sleeper has one, otherwise by normalized name + team (lib/rookieMatch).
 * Rides on the same cached player map as the fantasy boards — no extra download.
 * Empty when Sleeper is unavailable (the Rookies sections then hide).
 */
export async function getRookieIndex(): Promise<RookieIndex> {
  const map = await getPlayerMap();
  const espnIds = new Set<string>();
  const nameTeam = new Set<string>();
  for (const p of Object.values(map)) {
    if (!p.rookie || !p.team) continue;
    if (p.rookieEspnId) espnIds.add(p.rookieEspnId);
    nameTeam.add(rookieKey(p.name, p.team));
  }
  return { espnIds, nameTeam };
}

interface SkillRow {
  id: string;
  name: string;
  abbr: string;
  position: string;
  points: number;
  games: number;
}

function emptyBoards(): LeaderBoard[] {
  return [
    ...POSITION_BOARDS.map((b) => ({ key: b.key, label: b.label, section: FANTASY, leaders: [] })),
    { key: 'fantasyDST', label: 'D/ST', section: FANTASY, leaders: [] },
  ];
}

/** Every fantasy board (QB/RB/WR/TE/K/D-ST), all from Sleeper. */
export async function getFantasyBoards(): Promise<LeaderBoard[]> {
  const { season } = await getCurrentWeekInfo();
  const [playerMap, stats] = await Promise.all([
    getPlayerMap(),
    fetchJson<Record<string, SleeperStat>>(
      `${SLEEPER_STATS_URL}/${season}`,
      { next: { revalidate: STATS_REVALIDATE } },
      'stats'
    ),
  ]);
  if (!stats) return emptyBoards();
  const skill: SkillRow[] = [];
  const dst: { team: NflTeam; points: number; games: number }[] = [];

  for (const [id, s] of Object.entries(stats)) {
    const points = s.pts_ppr ?? s.pts_std ?? 0;
    const games = s.gp ?? 0;

    // D/ST: a bare team-abbr key (skip the "TEAM_xxx" totals entry).
    if (!id.startsWith('TEAM_')) {
      const team = getTeamByAbbr(normalizeAbbr(id));
      if (team) {
        dst.push({ team, points, games });
        continue;
      }
    }

    // Skill/K: numeric id resolved through the slim player map.
    const p = playerMap[id];
    if (!p || (points === 0 && games === 0)) continue;
    skill.push({ id, name: p.name, abbr: p.team ? normalizeAbbr(p.team) : '', position: p.position, points, games });
  }

  const boards: LeaderBoard[] = POSITION_BOARDS.map(({ key, label, pos }) => {
    const leaders: LeaderRow[] = skill
      .filter((r) => r.position === pos)
      .sort((a, b) => b.points - a.points)
      .slice(0, BOARD_SIZE)
      .map((r, i) => ({
        rank: i + 1,
        athleteId: `sl-${r.id}`,
        name: r.name,
        teamAbbr: r.abbr,
        teamLogo: r.abbr ? espnLogo(r.abbr) : null,
        headshot: null,
        position: r.position,
        value: r.points,
        displayValue: r.points.toFixed(1),
        games: r.games,
        perGame: r.games > 0 ? r.points / r.games : 0,
      }));
    return { key, label, section: FANTASY, leaders };
  });

  dst.sort((a, b) => b.points - a.points);
  boards.push({
    key: 'fantasyDST',
    label: 'D/ST',
    section: FANTASY,
    leaders: dst.map((r, i) => ({
      rank: i + 1,
      athleteId: `dst-${r.team.abbr}`,
      name: r.team.nickname,
      teamAbbr: r.team.abbr,
      teamLogo: espnLogo(r.team.abbr),
      headshot: null,
      position: 'DST',
      value: r.points,
      displayValue: r.points.toFixed(1),
      games: r.games,
      perGame: r.games > 0 ? r.points / r.games : 0,
    })),
  });

  return boards;
}
