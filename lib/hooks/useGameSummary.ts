/**
 * useGameSummary — post-game box score for a finished matchup, from ESPN's
 * public `summary` endpoint (CORS-open, browser-side, free).
 *
 * Aggregates each player's line ACROSS categories (a RB who caught passes shows
 * one combined line, not two), includes receiving targets, and computes
 * full-PPR fantasy points. Fetched lazily on first open and cached by event id.
 *
 * Full-PPR scoring (ESPN standard default):
 *   pass 0.04/yd, 4/TD, -2/INT · rush 0.1/yd, 6/TD ·
 *   rec 1/catch, 0.1/yd, 6/TD · -2/fumble lost
 */

'use client';

import { useEffect, useState } from 'react';

const SUMMARY_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';
const FETCH_TIMEOUT_MS = 8_000;

const ESPN_ABBR_ALIASES: Readonly<Record<string, string>> = { WSH: 'WAS' };

/** Full-PPR scoring weights. */
const PPR = {
  passYd: 0.04,
  passTd: 4,
  int: -2,
  rushYd: 0.1,
  rushTd: 6,
  rec: 1,
  recYd: 0.1,
  recTd: 6,
  fumLost: -2,
} as const;

export interface PlayerLine {
  /** Position label: QB / RB / WR / TE … */
  role: string;
  /** Short player name, e.g. "R. Stevenson". */
  name: string;
  /** Combined stat line, e.g. "18 car · 51 yd · 5/6 · 44 yd". */
  stat: string;
  /** Full-PPR fantasy points, one decimal. */
  ppr: number;
}

export interface TeamBox {
  abbr: string;
  lines: PlayerLine[];
}

export interface GameSummary {
  byAbbr: Record<string, TeamBox>;
  headline: string | null;
}

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
interface EspnSummary {
  boxscore?: { players?: EspnBoxTeam[] };
  article?: { headline?: string };
}

/** Aggregated per-player stats within one game. */
interface Agg {
  id: string;
  name: string;
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

const cache = new Map<string, GameSummary>();

const num = (v: string | undefined): number => {
  const n = parseFloat((v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function normAbbr(abbr: string | undefined): string {
  const key = (abbr ?? '').trim().toUpperCase();
  return ESPN_ABBR_ALIASES[key] ?? key;
}

function statAt(labels: string[], stats: string[], label: string): string | undefined {
  const i = labels.indexOf(label);
  return i >= 0 ? stats[i] : undefined;
}

function newAgg(a: EspnAthleteStat): Agg {
  return {
    id: a.athlete?.id ?? a.athlete?.displayName ?? Math.random().toString(36),
    name: a.athlete?.shortName || a.athlete?.displayName || '—',
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

function pprOf(a: Agg): number {
  const pts =
    a.passYds * PPR.passYd +
    a.passTd * PPR.passTd +
    a.int * PPR.int +
    a.rushYds * PPR.rushYd +
    a.rushTd * PPR.rushTd +
    a.rec * PPR.rec +
    a.recYds * PPR.recYd +
    a.recTd * PPR.recTd +
    a.fumLost * PPR.fumLost;
  return Math.round(pts * 10) / 10;
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

function parseTeam(entry: EspnBoxTeam): TeamBox {
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
  const toLine = (a: Agg): PlayerLine => ({
    role: roleOf(a),
    name: a.name,
    stat: statLine(a),
    ppr: pprOf(a),
  });

  // QB = the passer (most attempts), pinned first; then top skill players by PPR.
  const qb = all.filter((a) => a.passAtt > 0).sort((x, y) => y.passAtt - x.passAtt)[0];
  const skill = all
    .filter((a) => a !== qb && (a.car > 0 || a.rec > 0 || a.tgts > 0))
    .sort((x, y) => pprOf(y) - pprOf(x))
    .slice(0, 3);

  const lines = [qb, ...skill].filter((a): a is Agg => Boolean(a)).map(toLine);
  return { abbr: normAbbr(entry.team?.abbreviation), lines };
}

function parseSummary(data: EspnSummary): GameSummary {
  const byAbbr: Record<string, TeamBox> = {};
  for (const t of data.boxscore?.players ?? []) {
    const box = parseTeam(t);
    if (box.abbr) byAbbr[box.abbr] = box;
  }
  return { byAbbr, headline: data.article?.headline ?? null };
}

interface UseGameSummaryResult {
  data: GameSummary | null;
  loading: boolean;
  error: boolean;
}

export function useGameSummary(eventId: string | null): UseGameSummaryResult {
  const [data, setData] = useState<GameSummary | null>(() =>
    eventId ? cache.get(eventId) ?? null : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    const cached = cache.get(eventId);
    if (cached) {
      setData(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    setLoading(true);
    setError(false);

    fetch(`${SUMMARY_URL}?event=${eventId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: EspnSummary) => {
        if (cancelled) return;
        const parsed = parseSummary(json);
        cache.set(eventId, parsed);
        setData(parsed);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eventId]);

  return { data, loading, error };
}
