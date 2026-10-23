/**
 * Box-score extras from ESPN's `summary` (already downloaded for the Home box score) —
 * pure + client-safe. Team stat rows, quarter scores, scoring plays, a sampled
 * win-probability line, defensive leaders, kicking, venue. Plan: Wave A in
 * docs/plans/check-datacatalog-md-and-come-vivid-bunny.md.
 */

import { normalizeTeamAbbr } from '@/lib/teams';

/** One two-sided team stat row ("Total yards 362 · 457"). `better` = the side that wins the row. */
export interface TeamStatRow {
  key: string;
  label: string;
  away: string;
  home: string;
  better: 'away' | 'home' | null;
}

export interface ScoringPlay {
  quarter: number;
  clock: string;
  team: string;
  /** "TD" / "FG" / "SF" … */
  kind: string;
  text: string;
  away: number;
  home: number;
}

/** A defender or kicker line ("8 tkl · 1.0 sk · 1 INT"). */
export interface ExtraLine {
  role: string;
  name: string;
  stat: string;
}

export interface GameExtras {
  away: string;
  home: string;
  /** Points per quarter (overtime included as a 5th entry). */
  quarters: { away: number[]; home: number[] } | null;
  teamStats: TeamStatRow[];
  scoring: ScoringPlay[];
  /** Home win chance 0–1 through the game, sampled to at most `WIN_PROB_POINTS`. */
  winProb: number[];
  defense: Record<string, ExtraLine[]>;
  kicking: Record<string, ExtraLine[]>;
  venue: { name: string; city: string | null; turf: boolean | null } | null;
}

/** Points kept from the per-play line — enough for a smooth sparkline, small on the wire. */
export const WIN_PROB_POINTS = 60;
/** Defenders shown per team. */
export const DEFENDERS_SHOWN = 2;

// ── ESPN shapes (only what we read) ──
interface EspnTeamStat {
  name?: string;
  displayValue?: string;
}
interface EspnAthleteStat {
  athlete?: { displayName?: string; shortName?: string; position?: { abbreviation?: string } };
  stats?: string[];
}
interface EspnCategory {
  name?: string;
  labels?: string[];
  athletes?: EspnAthleteStat[];
}
export interface EspnExtrasSource {
  header?: {
    competitions?: Array<{
      competitors?: Array<{ homeAway?: string; team?: { abbreviation?: string }; linescores?: Array<{ displayValue?: string; value?: number }> }>;
    }>;
  };
  boxscore?: {
    teams?: Array<{ team?: { abbreviation?: string }; statistics?: EspnTeamStat[] }>;
    players?: Array<{ team?: { abbreviation?: string }; statistics?: EspnCategory[] }>;
  };
  scoringPlays?: Array<{
    type?: { abbreviation?: string };
    text?: string;
    awayScore?: number;
    homeScore?: number;
    period?: { number?: number };
    clock?: { displayValue?: string };
    team?: { abbreviation?: string };
  }>;
  winprobability?: Array<{ homeWinPercentage?: number }>;
  gameInfo?: { venue?: { fullName?: string; address?: { city?: string; state?: string }; grass?: boolean } };
}

const num = (v: string | undefined): number | null => {
  const n = parseFloat((v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** "5-13" → 0.385; "29:06" → 1746 s; plain numbers as-is. */
function sortable(key: string, v: string): number | null {
  if (key === 'possessionTime') {
    const [m, s] = v.split(':').map(Number);
    return Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : null;
  }
  if (key === 'thirdDownEff' || key === 'fourthDownEff' || key === 'redZoneAttempts') {
    const [made, att] = v.split('-').map(Number);
    return att > 0 ? made / att : null;
  }
  if (key === 'totalPenaltiesYards') return num(v.split('-')[1]);
  return num(v);
}

/** The rows shown, in order. `lower` = fewer is better. */
const TEAM_ROWS: ReadonlyArray<{ key: string; label: string; lower?: boolean }> = [
  { key: 'totalYards', label: 'Total yards' },
  { key: 'yardsPerPlay', label: 'Yards / play' },
  { key: 'netPassingYards', label: 'Passing' },
  { key: 'rushingYards', label: 'Rushing' },
  { key: 'firstDowns', label: 'First downs' },
  { key: 'thirdDownEff', label: '3rd down' },
  { key: 'fourthDownEff', label: '4th down' },
  { key: 'redZoneAttempts', label: 'Red zone' },
  { key: 'turnovers', label: 'Turnovers', lower: true },
  { key: 'totalPenaltiesYards', label: 'Penalties', lower: true },
  { key: 'possessionTime', label: 'Possession' },
];

function teamStats(src: EspnExtrasSource, away: string, home: string): TeamStatRow[] {
  const byTeam = new Map<string, Map<string, string>>();
  for (const t of src.boxscore?.teams ?? []) {
    const m = new Map<string, string>();
    // First occurrence wins (`interceptions` appears twice).
    for (const s of t.statistics ?? []) if (s.name && s.displayValue !== undefined && !m.has(s.name)) m.set(s.name, s.displayValue);
    byTeam.set(normalizeTeamAbbr(t.team?.abbreviation), m);
  }
  const a = byTeam.get(away);
  const h = byTeam.get(home);
  if (!a || !h) return [];
  const rows: TeamStatRow[] = [];
  for (const r of TEAM_ROWS) {
    const av = a.get(r.key);
    const hv = h.get(r.key);
    if (av === undefined || hv === undefined) continue;
    const an = sortable(r.key, av);
    const hn = sortable(r.key, hv);
    let better: TeamStatRow['better'] = null;
    if (an !== null && hn !== null && an !== hn) better = (an > hn) !== !!r.lower ? 'away' : 'home';
    rows.push({ key: r.key, label: r.label, away: av, home: hv, better });
  }
  return rows;
}

function quarters(src: EspnExtrasSource, away: string, home: string): GameExtras['quarters'] {
  const comps = src.header?.competitions?.[0]?.competitors ?? [];
  const of = (abbr: string) => comps.find((c) => normalizeTeamAbbr(c.team?.abbreviation) === abbr)?.linescores?.map((l) => l.value ?? num(l.displayValue) ?? 0);
  const a = of(away);
  const h = of(home);
  return a?.length && h?.length ? { away: a, home: h } : null;
}

/** Even sample of a long series, always keeping the first and last point. */
export function sampleSeries(xs: readonly number[], max: number): number[] {
  if (xs.length <= max) return [...xs];
  const out: number[] = [];
  for (let i = 0; i < max; i++) out.push(xs[Math.round((i * (xs.length - 1)) / (max - 1))]);
  return out;
}

function categoryLines(src: EspnExtrasSource, name: string): Map<string, Array<{ a: EspnAthleteStat; get: (label: string) => number | null }>> {
  const out = new Map<string, Array<{ a: EspnAthleteStat; get: (label: string) => number | null }>>();
  for (const p of src.boxscore?.players ?? []) {
    const cat = (p.statistics ?? []).find((c) => c.name === name);
    if (!cat) continue;
    const labels = cat.labels ?? [];
    out.set(
      normalizeTeamAbbr(p.team?.abbreviation),
      (cat.athletes ?? []).map((a) => ({ a, get: (label: string) => num(a.stats?.[labels.indexOf(label)]) })),
    );
  }
  return out;
}

const nameOf = (a: EspnAthleteStat) => a.athlete?.shortName || a.athlete?.displayName || '—';

function defense(src: EspnExtrasSource): Record<string, ExtraLine[]> {
  const ints = categoryLines(src, 'interceptions');
  const out: Record<string, ExtraLine[]> = {};
  for (const [team, rows] of categoryLines(src, 'defensive')) {
    const intsOf = (n: string) => ints.get(team)?.find((r) => nameOf(r.a) === n)?.get('INT') ?? 0;
    const scored = rows.map((r) => {
      const tkl = r.get('TOT') ?? 0;
      const sk = r.get('SACKS') ?? 0;
      const int = intsOf(nameOf(r.a));
      // Impact order: a sack or a pick outweighs a few tackles.
      return { r, tkl, sk, int, score: tkl + sk * 4 + int * 6 };
    });
    out[team] = scored
      .filter((s) => s.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, DEFENDERS_SHOWN)
      .map(({ r, tkl, sk, int }) => ({
        role: r.a.athlete?.position?.abbreviation ?? 'DEF',
        name: nameOf(r.a),
        stat: [`${tkl} tkl`, sk > 0 ? `${sk} sk` : '', int > 0 ? `${int} INT` : ''].filter(Boolean).join(' · '),
      }));
  }
  return out;
}

function kicking(src: EspnExtrasSource): Record<string, ExtraLine[]> {
  const out: Record<string, ExtraLine[]> = {};
  for (const p of src.boxscore?.players ?? []) {
    const cat = (p.statistics ?? []).find((c) => c.name === 'kicking');
    if (!cat) continue;
    const labels = cat.labels ?? [];
    const at = (a: EspnAthleteStat, l: string) => a.stats?.[labels.indexOf(l)] ?? '';
    out[normalizeTeamAbbr(p.team?.abbreviation)] = (cat.athletes ?? []).map((a) => ({
      role: 'K',
      name: nameOf(a),
      stat: [`${at(a, 'FG')} FG`, at(a, 'LONG') ? `long ${at(a, 'LONG')}` : '', `${at(a, 'XP')} XP`].filter(Boolean).join(' · '),
    }));
  }
  return out;
}

/** Everything extra in one pass; null when the summary has none of it (pregame, ESPN hiccup). */
export function parseExtras(src: EspnExtrasSource): GameExtras | null {
  const comps = src.header?.competitions?.[0]?.competitors ?? [];
  const away = normalizeTeamAbbr(comps.find((c) => c.homeAway === 'away')?.team?.abbreviation);
  const home = normalizeTeamAbbr(comps.find((c) => c.homeAway === 'home')?.team?.abbreviation);
  if (!away || !home) return null;
  const venue = src.gameInfo?.venue;
  const out: GameExtras = {
    away,
    home,
    quarters: quarters(src, away, home),
    teamStats: teamStats(src, away, home),
    scoring: (src.scoringPlays ?? []).map((s) => ({
      quarter: s.period?.number ?? 0,
      clock: s.clock?.displayValue ?? '',
      team: normalizeTeamAbbr(s.team?.abbreviation),
      kind: s.type?.abbreviation ?? '',
      text: s.text ?? '',
      away: s.awayScore ?? 0,
      home: s.homeScore ?? 0,
    })),
    winProb: sampleSeries(
      (src.winprobability ?? []).map((w) => w.homeWinPercentage).filter((v): v is number => typeof v === 'number').map((v) => Math.round(v * 1000) / 1000),
      WIN_PROB_POINTS,
    ),
    defense: defense(src),
    kicking: kicking(src),
    venue: venue?.fullName
      ? { name: venue.fullName, city: [venue.address?.city, venue.address?.state].filter(Boolean).join(', ') || null, turf: typeof venue.grass === 'boolean' ? !venue.grass : null }
      : null,
  };
  const empty = !out.quarters && out.teamStats.length === 0 && out.scoring.length === 0 && out.winProb.length === 0;
  return empty ? null : out;
}
