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
import type { LeaderBoard, LeaderRow, LeaderSection } from './leaders';
import { getCurrentWeekInfo } from './schedule';
import { getTeamByAbbr, type NflTeam } from './teams';

const SLEEPER_STATS_URL = 'https://api.sleeper.app/v1/stats/nfl/regular';
const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl';
const STATS_REVALIDATE = 6 * 60 * 60; // 6h — scores change through the week
const PLAYERS_REVALIDATE = 24 * 60 * 60; // 24h — big + slow-changing (Sleeper's advice)
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
  const a = (raw.startsWith('TEAM_') ? raw.slice(5) : raw).toUpperCase();
  const alias: Record<string, string> = { JAC: 'JAX', WSH: 'WAS', LA: 'LAR' };
  return alias[a] ?? a;
}

async function fetchJson<T>(url: string, revalidate: number, label: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error(`❌ [fantasy] ${label} failed:`, err);
    return null;
  }
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
  const [players, stats] = await Promise.all([
    fetchJson<Record<string, SleeperPlayer>>(SLEEPER_PLAYERS_URL, PLAYERS_REVALIDATE, 'players map'),
    fetchJson<Record<string, SleeperStat>>(`${SLEEPER_STATS_URL}/${season}`, STATS_REVALIDATE, 'stats'),
  ]);
  if (!stats) return emptyBoards();

  const playerMap = players ?? {};
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

    // Skill/K: numeric id resolved through the player map.
    const p = playerMap[id];
    if (!p?.position || (points === 0 && games === 0)) continue;
    const name = p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
    if (!name) continue;
    skill.push({ id, name, abbr: p.team ? normalizeAbbr(p.team) : '', position: p.position, points, games });
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
