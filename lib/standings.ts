/**
 * Standings data seam.
 *
 * Turns ESPN's public standings endpoint into typed, division-grouped standings
 * for the Standings tab. Same free, CORS-open ESPN family the schedule + leaders
 * use; fetched server-side and cached (see `/api/standings`), so we never hammer
 * ESPN no matter how many viewers.
 *
 * ESPN groups standings by CONFERENCE (AFC/NFC) with a flat team list — it does
 * NOT nest divisions. So we group into divisions ourselves using the static
 * conference/division map in `lib/teams.ts` (division membership never changes),
 * which is more robust than depending on ESPN's grouping.
 */
import 'server-only';
import {
  NFL_TEAMS,
  getTeamByAbbr,
  type Conference,
  type Division,
  type NflTeam,
} from './teams';
import { APP_CONSTANTS } from '@/config/constants';

/** Public ESPN standings endpoint (free, no key). */
const ESPN_STANDINGS_URL =
  'https://site.api.espn.com/apis/v2/sports/football/nfl/standings';

/** Cache window (1h) — matches the rest of the ESPN fetches. */
const REVALIDATE_SECONDS = APP_CONSTANTS.CACHE.REVALIDATE_SECONDS;

/** Division display order within a conference. */
const DIVISION_ORDER: readonly Division[] = ['North', 'South', 'East', 'West'];

/** ESPN standings abbreviation → our `lib/teams.ts` abbreviation. */
const ESPN_ABBR_ALIASES: Readonly<Record<string, string>> = {
  WSH: 'WAS', // Washington Commanders
};

/** One team's standings line. */
export interface TeamStanding {
  abbr: string;
  name: string;
  nickname: string;
  wins: number;
  losses: number;
  ties: number;
  /** Win % formatted like ".625" / "1.000". */
  pct: string;
  pointsFor: number;
  pointsAgainst: number;
  /** Point differential with sign, e.g. "+42" / "-13". */
  diff: string;
  /** Streak, e.g. "W1" / "L2" / "—". */
  streak: string;
  /** In-division record, e.g. "2-1". */
  divRecord: string;
}

export interface DivisionStandings {
  division: Division;
  /** Full label, e.g. "AFC East". */
  label: string;
  teams: TeamStanding[];
}

export interface ConferenceStandings {
  conference: Conference;
  divisions: DivisionStandings[];
}

// ── Minimal shape of the ESPN standings response (only the fields we read) ──
interface EspnStat {
  name?: string;
  value?: number;
  displayValue?: string;
}
interface EspnEntry {
  team?: { abbreviation?: string };
  stats?: EspnStat[];
}
interface EspnChild {
  standings?: { entries?: EspnEntry[] };
}
interface EspnStandingsResponse {
  children?: EspnChild[];
}

/** Resolve an ESPN standings abbreviation to our `NflTeam`. */
function resolveTeam(abbr: string | undefined): NflTeam | null {
  if (!abbr) return null;
  const key = abbr.trim().toUpperCase();
  return getTeamByAbbr(ESPN_ABBR_ALIASES[key] ?? key);
}

const num = (stats: EspnStat[], name: string): number | undefined =>
  stats.find((s) => s.name === name)?.value;
const disp = (stats: EspnStat[], name: string): string | undefined =>
  stats.find((s) => s.name === name)?.displayValue;

/** Format ESPN win % (0..1) as ".625" / "1.000". */
function formatPct(v: number | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  const s = v.toFixed(3);
  return v >= 1 ? s : s.replace(/^0/, '');
}

/** Map one ESPN entry → TeamStanding, or null if the team can't be resolved. */
function mapEntry(entry: EspnEntry): { team: NflTeam; standing: TeamStanding } | null {
  const team = resolveTeam(entry.team?.abbreviation);
  if (!team) return null;
  const stats = entry.stats ?? [];

  const wins = num(stats, 'wins') ?? 0;
  const losses = num(stats, 'losses') ?? 0;
  const ties = num(stats, 'ties') ?? 0;
  const pf = num(stats, 'pointsFor') ?? 0;
  const pa = num(stats, 'pointsAgainst') ?? 0;

  // Point differential — prefer ESPN's, fall back to PF-PA.
  const diffNum = num(stats, 'pointDifferential') ?? num(stats, 'differential') ?? pf - pa;
  const diff = diffNum > 0 ? `+${diffNum}` : String(diffNum);

  return {
    team,
    standing: {
      abbr: team.abbr,
      name: team.name,
      nickname: team.nickname,
      wins,
      losses,
      ties,
      pct: formatPct(num(stats, 'winPercent')),
      pointsFor: pf,
      pointsAgainst: pa,
      diff,
      streak: disp(stats, 'streak') ?? '—',
      divRecord: disp(stats, 'divisionRecord') ?? '—',
    },
  };
}

/** Build the empty (no-data) shape so the UI still renders all 8 boxes. */
function emptyConferences(): ConferenceStandings[] {
  const build = (conf: Conference): ConferenceStandings => ({
    conference: conf,
    divisions: DIVISION_ORDER.map((division) => ({
      division,
      label: `${conf} ${division}`,
      teams: [],
    })),
  });
  return [build('NFC'), build('AFC')];
}

/**
 * All standings, grouped NFC → AFC, each with its four divisions (North, South,
 * East, West), teams kept in ESPN's official standings order (real NFL
 * tiebreakers). Degrades to empty boxes on any failure so the tab never crashes.
 */
export async function getStandings(): Promise<ConferenceStandings[]> {
  const url = `${ESPN_STANDINGS_URL}?season=${APP_CONSTANTS.SEASON}`;

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`ESPN standings HTTP ${res.status}`);
    const data = (await res.json()) as EspnStandingsResponse;

    // Bucket every entry by conference + division using the static team map.
    // ESPN returns entries already in official standings order (it applies the
    // full NFL tiebreaker chain: head-to-head, division record, common games,
    // conference record, strength of victory/schedule, …). We iterate in that
    // order and never re-sort, so each division inherits ESPN's official order.
    const buckets = new Map<string, TeamStanding[]>();
    const keyOf = (c: Conference, d: Division) => `${c}-${d}`;

    for (const child of data.children ?? []) {
      for (const entry of child.standings?.entries ?? []) {
        const mapped = mapEntry(entry);
        if (!mapped) continue;
        const { team, standing } = mapped;
        const k = keyOf(team.conference, team.division);
        const list = buckets.get(k) ?? [];
        list.push(standing);
        buckets.set(k, list);
      }
    }

    const total = [...buckets.values()].reduce((n, l) => n + l.length, 0);
    if (total < NFL_TEAMS.length) {
      throw new Error(`ESPN standings mapped ${total}/${NFL_TEAMS.length} teams`);
    }

    const build = (conf: Conference): ConferenceStandings => ({
      conference: conf,
      divisions: DIVISION_ORDER.map((division) => ({
        division,
        label: `${conf} ${division}`,
        teams: buckets.get(keyOf(conf, division)) ?? [],
      })),
    });

    return [build('NFC'), build('AFC')];
  } catch (err) {
    console.error('❌ [standings] fetch failed — serving empty boxes:', err);
    return emptyConferences();
  }
}
