/**
 * Post-game box score parsing for ESPN's `summary` payload — pure + client-safe.
 * The server (`lib/espnLive.ts`, `/api/live/summary`) parses; the browser
 * (`useGameSummary`) only renders the result.
 *
 * Aggregates each player's line ACROSS categories (a RB who caught passes shows
 * one combined line, not two) and includes receiving targets.
 *
 * Fantasy points are NOT computed here: every line leaves with `ppr: null`, and
 * /api/live/summary attaches Pare points (Sleeper `pts_ppr` + bonus flags,
 * lib/fantasyPoints.ts) at response time, then keeps the passer + top 3 skill.
 */

import { normalizeTeamAbbr } from '@/lib/teams';

export interface PlayerLine {
  /** Position label: QB / RB / WR / TE … */
  role: string;
  /** Short player name, e.g. "R. Stevenson". */
  name: string;
  /** Combined stat line, e.g. "18 car · 51 yd · 5/6 · 44 yd". */
  stat: string;
  /** Pare fantasy points (Sleeper), or null until Sleeper has the game / no match. */
  ppr: number | null;
}

/** A parsed line before points (server only) — the extra fields join + rank it, then `toWireSummary` drops them. */
export interface BoxLine extends PlayerLine {
  /** ESPN athlete id (Sleeper join key). */
  espnId?: string;
  /** Full name, e.g. "Rhamondre Stevenson" (Sleeper join fallback). */
  fullName: string;
  /** The team's passer (most attempts) — pinned first. */
  isPasser: boolean;
  /** Rush + rec yards — order before Sleeper has points. */
  scrimmageYds: number;
}

export interface TeamBox<L extends PlayerLine = PlayerLine> {
  abbr: string;
  lines: L[];
}

/** What the browser gets (`PlayerLine`); the server parses into `ParsedSummary` first. */
export interface GameSummary<L extends PlayerLine = PlayerLine> {
  byAbbr: Record<string, TeamBox<L>>;
  headline: string | null;
}

/** Parser output: the passer + every skill candidate, with join fields, `ppr: null`. */
export type ParsedSummary = GameSummary<BoxLine>;

// ── ESPN response shape (only what we read) ──
interface EspnAthleteStat {
  athlete?: {
    id?: string;
    displayName?: string;
    shortName?: string;
    position?: { abbreviation?: string };
  };
  stats?: string[];
}
interface EspnStatCategory {
  name?: string;
  labels?: string[];
  athletes?: EspnAthleteStat[];
}
interface EspnBoxTeam {
  team?: { abbreviation?: string };
  statistics?: EspnStatCategory[];
}
export interface EspnSummary {
  boxscore?: { players?: EspnBoxTeam[] };
  article?: { headline?: string };
  header?: { week?: number; season?: { year?: number } };
}

/** Aggregated per-player stats within one game. */
interface Agg {
  id: string;
  espnId?: string;
  name: string;
  fullName: string;
  pos: string;
  cmpAtt: string; // "23/33"
  passYds: number;
  passTd: number;
  int: number;
  passAtt: number;
  car: number;
  rushYds: number;
  rushTd: number;
  rec: number;
  tgts: number;
  recYds: number;
  recTd: number;
  fumLost: number;
}


const num = (v: string | undefined): number => {
  const n = parseFloat((v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function normAbbr(abbr: string | undefined): string {
  return normalizeTeamAbbr(abbr);
}

function statAt(labels: string[], stats: string[], label: string): string | undefined {
  const i = labels.indexOf(label);
  return i >= 0 ? stats[i] : undefined;
}

function newAgg(a: EspnAthleteStat): Agg {
  return {
    id: a.athlete?.id ?? a.athlete?.displayName ?? Math.random().toString(36),
    ...(a.athlete?.id ? { espnId: a.athlete.id } : {}),
    name: a.athlete?.shortName || a.athlete?.displayName || '—',
    fullName: a.athlete?.displayName || a.athlete?.shortName || '',
    pos: a.athlete?.position?.abbreviation ?? '',
    cmpAtt: '',
    passYds: 0,
    passTd: 0,
    int: 0,
    passAtt: 0,
    car: 0,
    rushYds: 0,
    rushTd: 0,
    rec: 0,
    tgts: 0,
    recYds: 0,
    recTd: 0,
    fumLost: 0,
  };
}

function roleOf(a: Agg): string {
  if (a.pos) return a.pos;
  if (a.passAtt > 0) return 'QB';
  if (a.car >= a.rec) return 'RB';
  return 'WR';
}

/** Build the combined stat line, one segment per phase the player contributed. */
function statLine(a: Agg): string {
  const segs: string[] = [];
  if (a.passAtt > 0) {
    let s = `${a.cmpAtt} · ${a.passYds} yd`;
    if (a.passTd > 0) s += ` · ${a.passTd} TD`;
    if (a.int > 0) s += ` · ${a.int} INT`;
    segs.push(s);
  }
  if (a.car > 0) {
    let s = `${a.car} car · ${a.rushYds} yd`;
    if (a.rushTd > 0) s += ` · ${a.rushTd} TD`;
    segs.push(s);
  }
  if (a.rec > 0 || a.tgts > 0) {
    let s = `${a.rec}/${a.tgts} · ${a.recYds} yd`;
    if (a.recTd > 0) s += ` · ${a.recTd} TD`;
    segs.push(s);
  }
  return segs.join('  ·  ');
}

function parseTeam(entry: EspnBoxTeam): TeamBox<BoxLine> {
  const cats = entry.statistics ?? [];
  const cat = (name: string) => cats.find((c) => c.name === name);
  const players = new Map<string, Agg>();
  const get = (a: EspnAthleteStat): Agg => {
    const id = a.athlete?.id ?? a.athlete?.displayName ?? '';
    let agg = players.get(id);
    if (!agg) {
      agg = newAgg(a);
      players.set(id, agg);
    }
    return agg;
  };

  const passing = cat('passing');
  for (const a of passing?.athletes ?? []) {
    const l = passing!.labels ?? [];
    const s = a.stats ?? [];
    const agg = get(a);
    agg.cmpAtt = statAt(l, s, 'C/ATT') ?? '';
    agg.passYds = num(statAt(l, s, 'YDS'));
    agg.passTd = num(statAt(l, s, 'TD'));
    agg.int = num(statAt(l, s, 'INT'));
    agg.passAtt = num((agg.cmpAtt.split('/')[1] ?? '').trim());
  }

  const rushing = cat('rushing');
  for (const a of rushing?.athletes ?? []) {
    const l = rushing!.labels ?? [];
    const s = a.stats ?? [];
    const agg = get(a);
    agg.car = num(statAt(l, s, 'CAR'));
    agg.rushYds = num(statAt(l, s, 'YDS'));
    agg.rushTd = num(statAt(l, s, 'TD'));
  }

  const receiving = cat('receiving');
  for (const a of receiving?.athletes ?? []) {
    const l = receiving!.labels ?? [];
    const s = a.stats ?? [];
    const agg = get(a);
    agg.rec = num(statAt(l, s, 'REC'));
    agg.tgts = num(statAt(l, s, 'TGTS'));
    agg.recYds = num(statAt(l, s, 'YDS'));
    agg.recTd = num(statAt(l, s, 'TD'));
  }

  const fumbles = cat('fumbles');
  for (const a of fumbles?.athletes ?? []) {
    const l = fumbles!.labels ?? [];
    const s = a.stats ?? [];
    const agg = players.get(a.athlete?.id ?? a.athlete?.displayName ?? '');
    if (agg) agg.fumLost = num(statAt(l, s, 'LOST'));
  }

  const all = [...players.values()];
  // QB = the passer (most attempts), pinned first; then EVERY skill candidate —
  // /api/live/summary ranks them by Sleeper points and keeps the top 3.
  const qb = all.filter((a) => a.passAtt > 0).sort((x, y) => y.passAtt - x.passAtt)[0];
  const toLine = (a: Agg): BoxLine => ({
    role: roleOf(a),
    name: a.name,
    stat: statLine(a),
    ppr: null,
    ...(a.espnId ? { espnId: a.espnId } : {}),
    fullName: a.fullName,
    isPasser: a === qb,
    scrimmageYds: a.rushYds + a.recYds,
  });
  const skill = all.filter((a) => a !== qb && (a.car > 0 || a.rec > 0 || a.tgts > 0));

  const lines = [qb, ...skill].filter((a): a is Agg => Boolean(a)).map(toLine);
  return { abbr: normAbbr(entry.team?.abbreviation), lines };
}

export function parseSummary(data: EspnSummary): ParsedSummary {
  const byAbbr: Record<string, TeamBox<BoxLine>> = {};
  for (const t of data.boxscore?.players ?? []) {
    const box = parseTeam(t);
    if (box.abbr) byAbbr[box.abbr] = box;
  }
  return { byAbbr, headline: data.article?.headline ?? null };
}

/** Drop the server-only join fields (they'd grow the response ~75%). */
export function toWireSummary(summary: GameSummary<PlayerLine>): GameSummary {
  const byAbbr: Record<string, TeamBox> = {};
  for (const [key, box] of Object.entries(summary.byAbbr)) {
    byAbbr[key] = { abbr: box.abbr, lines: box.lines.map(({ role, name, stat, ppr }) => ({ role, name, stat, ppr })) };
  }
  return { byAbbr, headline: summary.headline };
}

/** Season + week of the game (ESPN summary `header`), or null when ESPN omits them. */
export function summaryWeek(raw: EspnSummary): { season: number; week: number } | null {
  const season = raw.header?.season?.year;
  const week = raw.header?.week;
  return typeof season === 'number' && typeof week === 'number' ? { season, week } : null;
}

/** Status part of the summary payload (only what isSummaryFinal reads). */
export interface EspnSummaryStatus {
  header?: { competitions?: { status?: { type?: { completed?: boolean } } }[] };
}

/** True once ESPN marks the game final — its box score won't change any more. */
export function isSummaryFinal(raw: EspnSummaryStatus): boolean {
  return raw.header?.competitions?.[0]?.status?.type?.completed === true;
}
