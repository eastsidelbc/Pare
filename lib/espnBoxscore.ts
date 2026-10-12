/**
 * ESPN game box scores — pure parsing + aggregation (no fetch, no Next cache).
 *
 * Split out of lib/espnStats.ts so it can be unit-tested; espnStats keeps the
 * fetching and the per-game 24h cache. Two consumers:
 *   - aggregateYardsAllowed → Compare's season yards-allowed (unchanged math,
 *     parity-tested in lib/__tests__/espnBoxscore.test.ts)
 *   - toTeamGameLines → My Team's per-week team game log (Season / Last 4)
 * Field formats verified in the My Team P0a spike (summary?event=…):
 * `sacksYardsLost` "5-30", `redZoneAttempts` "2-3" (TDs-trips), TDs by type
 * from the player-category totals.
 */

export interface EspnSummaryStat {
  name?: string;
  value?: number;
  displayValue?: string;
}
export interface EspnSummaryTeam {
  team?: { id?: string };
  statistics?: EspnSummaryStat[];
}
interface EspnSummaryPlayerCategory {
  name?: string;
  labels?: string[];
  totals?: string[];
}
interface EspnSummaryPlayers {
  team?: { id?: string };
  statistics?: EspnSummaryPlayerCategory[];
}
export interface EspnSummaryResponse {
  header?: { competitions?: Array<{ competitors?: Array<{ id?: string; score?: string }> }> };
  boxscore?: { teams?: EspnSummaryTeam[]; players?: EspnSummaryPlayers[] };
}

/** One team's offensive output in a single game (the fields Compare's aggregation uses). */
export interface GameTeamYards {
  teamId: string;
  total: number;
  pass: number;
  rush: number;
  /** Third-down conversions / attempts (from `thirdDownEff`, e.g. "5-12"). */
  td3Conv: number;
  td3Att: number;
}

/** GameTeamYards + the extra per-game fields My Team needs (best-effort, 0 when absent). */
export interface GameTeamBox extends GameTeamYards {
  points: number;
  passTd: number;
  rushTd: number;
  /** Interceptions THROWN by this offense. */
  interceptions: number;
  /** Times this offense was sacked. */
  sacks: number;
  fumblesLost: number;
  turnovers: number;
  /** Red-zone trips (the "att" in "TD-att"). */
  redZoneAtt: number;
  drives: number;
}

const num = (s: string | undefined | null): number | null => {
  const n = parseFloat(String(s ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** "a-b" → [a, b]; anything else → null. */
const pair = (s: string | undefined): [number, number] | null => {
  const m = String(s ?? '').match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
};

function statVal(t: EspnSummaryTeam, name: string): number | null {
  const s = t.statistics?.find((x) => x.name === name);
  if (!s) return null;
  if (typeof s.value === 'number' && Number.isFinite(s.value)) return s.value;
  return num(s.displayValue);
}

function statDisplay(t: EspnSummaryTeam, name: string): string | undefined {
  return t.statistics?.find((x) => x.name === name)?.displayValue;
}

function categoryTotal(players: EspnSummaryPlayers | undefined, category: string, label: string): number {
  const cat = players?.statistics?.find((c) => c.name === category);
  const idx = cat?.labels?.indexOf(label) ?? -1;
  return idx >= 0 ? (num(cat?.totals?.[idx]) ?? 0) : 0;
}

/**
 * Both teams' box-score lines for one game, or `{ teams: null, missingTeam }`
 * when a REQUIRED yards field is missing (the caller logs + skips the game).
 */
export function parseGameBox(data: EspnSummaryResponse): { teams: GameTeamBox[] | null; missingTeam?: string } {
  const teams = data.boxscore?.teams ?? [];
  if (teams.length !== 2) return { teams: null };
  const scores = data.header?.competitions?.[0]?.competitors ?? [];

  const out: GameTeamBox[] = [];
  for (const t of teams) {
    const id = t.team?.id;
    const total = statVal(t, 'totalYards');
    const pass = statVal(t, 'netPassingYards');
    const rush = statVal(t, 'rushingYards');
    if (!id || total === null || pass === null || rush === null) return { teams: null, missingTeam: id ?? '?' };
    // Best-effort: a missing/odd value contributes 0/0 (doesn't skew the % denominator).
    const td3 = pair(statDisplay(t, 'thirdDownEff')) ?? [0, 0];
    const players = data.boxscore?.players?.find((p) => p.team?.id === id);
    out.push({
      teamId: id,
      total,
      pass,
      rush,
      td3Conv: td3[0],
      td3Att: td3[1],
      points: num(scores.find((c) => c.id === id)?.score) ?? 0,
      passTd: categoryTotal(players, 'passing', 'TD'),
      rushTd: categoryTotal(players, 'rushing', 'TD'),
      interceptions: statVal(t, 'interceptions') ?? 0,
      sacks: pair(statDisplay(t, 'sacksYardsLost'))?.[0] ?? 0,
      fumblesLost: statVal(t, 'fumblesLost') ?? 0,
      turnovers: statVal(t, 'turnovers') ?? 0,
      redZoneAtt: pair(statDisplay(t, 'redZoneAttempts'))?.[1] ?? 0,
      drives: statVal(t, 'totalDrives') ?? 0,
    });
  }
  return { teams: out };
}

/** Per-team aggregated yards allowed (season totals) + games counted. */
export interface YardsAllowed {
  total_yards: number;
  pass_yds: number;
  rush_yds: number;
  /** Opponent third-down conversions/attempts (for attempts-weighted %). */
  td3Conv: number;
  td3Att: number;
  games: number;
}

export interface YardsAllowedResult {
  allowed: Record<string, YardsAllowed>;
  gained: Record<string, { total: number; pass: number; rush: number }>;
  counted: number;
  skipped: number;
}

/**
 * Each team is ALLOWED its opponent's offensive yards + third-down eff; each
 * team GAINED its own (consistency bookkeeping). Keyed by app team name via
 * `idToName` (ESPN team id → name). Unknown teams / bad games are skipped.
 * Moved verbatim from espnStats._fetchDefenseYardsAllowed.
 */
export function aggregateYardsAllowed(
  games: ReadonlyArray<readonly GameTeamYards[] | null>,
  idToName: ReadonlyMap<string, string>,
): YardsAllowedResult {
  const allowed = new Map<string, YardsAllowed>();
  const gained = new Map<string, { total: number; pass: number; rush: number }>();

  const ensureAllowed = (name: string): YardsAllowed => {
    let v = allowed.get(name);
    if (!v) {
      v = { total_yards: 0, pass_yds: 0, rush_yds: 0, td3Conv: 0, td3Att: 0, games: 0 };
      allowed.set(name, v);
    }
    return v;
  };
  const ensureGained = (name: string) => {
    let v = gained.get(name);
    if (!v) {
      v = { total: 0, pass: 0, rush: 0 };
      gained.set(name, v);
    }
    return v;
  };

  let counted = 0;
  let skipped = 0;
  for (const g of games) {
    if (!g || g.length !== 2) {
      skipped++;
      continue;
    }
    const [x, y] = g;
    const nameX = idToName.get(x.teamId);
    const nameY = idToName.get(y.teamId);
    if (!nameX || !nameY) {
      skipped++;
      continue;
    }

    const aX = ensureAllowed(nameX);
    aX.total_yards += y.total;
    aX.pass_yds += y.pass;
    aX.rush_yds += y.rush;
    aX.td3Conv += y.td3Conv;
    aX.td3Att += y.td3Att;
    aX.games += 1;

    const aY = ensureAllowed(nameY);
    aY.total_yards += x.total;
    aY.pass_yds += x.pass;
    aY.rush_yds += x.rush;
    aY.td3Conv += x.td3Conv;
    aY.td3Att += x.td3Att;
    aY.games += 1;

    const gX = ensureGained(nameX);
    gX.total += x.total;
    gX.pass += x.pass;
    gX.rush += x.rush;
    const gY = ensureGained(nameY);
    gY.total += y.total;
    gY.pass += y.pass;
    gY.rush += y.rush;

    counted++;
  }

  return { allowed: Object.fromEntries(allowed), gained: Object.fromEntries(gained), counted, skipped };
}

/** One team's offense in one game, with its opponent (team abbreviations). */
export interface TeamGameLine {
  team: string;
  opponent: string;
  week: number;
  eventId: string;
  points: number;
  pointsAllowed: number;
  totalYards: number;
  passYds: number;
  rushYds: number;
  passTd: number;
  rushTd: number;
  interceptions: number;
  sacks: number;
  fumblesLost: number;
  turnovers: number;
  redZoneAtt: number;
  drives: number;
}

/** Final games (with week) → two lines each (one per team). Unknown teams / bad games skipped. */
export function toTeamGameLines(
  games: ReadonlyArray<{ week: number; eventId: string; teams: readonly GameTeamBox[] | null }>,
  idToAbbr: ReadonlyMap<string, string>,
): TeamGameLine[] {
  const out: TeamGameLine[] = [];
  for (const { week, eventId, teams } of games) {
    if (!teams || teams.length !== 2) continue;
    const [a, b] = teams;
    const abbrA = idToAbbr.get(a.teamId);
    const abbrB = idToAbbr.get(b.teamId);
    if (!abbrA || !abbrB) continue;
    for (const [me, opp, meAbbr, oppAbbr] of [
      [a, b, abbrA, abbrB],
      [b, a, abbrB, abbrA],
    ] as const) {
      out.push({
        team: meAbbr,
        opponent: oppAbbr,
        week,
        eventId,
        points: me.points,
        pointsAllowed: opp.points,
        totalYards: me.total,
        passYds: me.pass,
        rushYds: me.rush,
        passTd: me.passTd,
        rushTd: me.rushTd,
        interceptions: me.interceptions,
        sacks: me.sacks,
        fumblesLost: me.fumblesLost,
        turnovers: me.turnovers,
        redZoneAtt: me.redZoneAtt,
        drives: me.drives,
      });
    }
  }
  return out;
}
