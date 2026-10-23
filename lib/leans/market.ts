/**
 * Leans market facts (Wave B1) — pure + client-safe. What the betting market itself says
 * about a game: how the spread and total moved since they opened, the win chance the
 * moneyline implies with the book's cut removed, whether a line sits on a key number,
 * plus weather + venue. Facts only — no Pare prediction (the 2024+2025 backtest showed
 * Pare's own projections don't beat closing lines: docs/devnotes/2026-10-23-leans-backtest.md).
 *
 * Source: ESPN Core `/events/{id}/competitions/{id}/odds` (first pregame book with a line;
 * in-game "Live" books skipped) + site `/summary` `gameInfo` (weather is pregame only).
 */

import { impliedProb, nearKeyNumber, noVig, type KeyNumberHit } from '@/lib/formulas/odds';
import { pregameBook, type EspnCoreOdds, type EspnTeamOdds } from '@/lib/espnCoreOdds';
import { parseAmericanOdds } from '@/lib/espnScoreboard';

export type { EspnCoreOdds } from '@/lib/espnCoreOdds';

export interface MovingLine {
  open: number | null;
  current: number | null;
}

export interface GameMarket {
  /** Home team's spread (−3 = home favored by 3). */
  homeSpread: MovingLine;
  total: MovingLine;
  moneyline: { away: MovingLine; home: MovingLine };
  /** No-vig win chance from the current moneyline (falls back to the opener). */
  winChance: { away: number; home: number } | null;
  keySpread: KeyNumberHit;
  keyTotal: KeyNumberHit;
  weather: { tempF: number | null; gustMph: number | null; precipPct: number | null } | null;
  venue: { name: string; turf: boolean | null } | null;
}

// ── ESPN shapes: odds in lib/espnCoreOdds.ts ──
export interface EspnGameInfo {
  gameInfo?: {
    venue?: { fullName?: string; grass?: boolean };
    weather?: { temperature?: number; gust?: number; precipitation?: number };
  };
}

/** "+4.5" / "-3" / "EVEN" / "PK" → number (pick'em = 0). */
export function parseLine(raw: string | undefined): number | null {
  if (raw == null) return null;
  const s = raw.trim().toUpperCase();
  if (s === 'EVEN' || s === 'PK' || s === 'PICK') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const finite = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n : null);

export function parseMarket(odds: EspnCoreOdds | null | undefined, info: EspnGameInfo | null | undefined): GameMarket | null {
  const book = pregameBook(odds);
  const v = info?.gameInfo?.venue;
  const w = info?.gameInfo?.weather;
  const venue = v?.fullName ? { name: v.fullName, turf: typeof v.grass === 'boolean' ? !v.grass : null } : null;
  const weather = w ? { tempF: finite(w.temperature), gustMph: finite(w.gust), precipPct: finite(w.precipitation) } : null;
  if (!book) return venue || weather ? emptyMarket(venue, weather) : null;

  const h = book.homeTeamOdds;
  const a = book.awayTeamOdds;
  const homeSpread = { open: parseLine(h?.open?.pointSpread?.american), current: parseLine(h?.current?.pointSpread?.american) };
  const total = { open: parseLine(book.open?.total?.american), current: parseLine(book.current?.total?.american) ?? finite(book.overUnder) };
  const ml = (t: EspnTeamOdds | undefined) => ({
    open: parseAmericanOdds(t?.open?.moneyLine?.american),
    current: parseAmericanOdds(t?.current?.moneyLine?.american) ?? finite(t?.moneyLine),
  });
  const moneyline = { away: ml(a), home: ml(h) };

  const pick = (s: MovingLine) => s.current ?? s.open;
  const pa = impliedProb(pick(moneyline.away) ?? 0);
  const ph = impliedProb(pick(moneyline.home) ?? 0);
  const nv = pa !== null && ph !== null ? noVig(pa, ph) : null;
  const spreadNow = pick(homeSpread);
  const totalNow = pick(total);
  return {
    homeSpread,
    total,
    moneyline,
    winChance: nv ? { away: nv.a, home: nv.b } : null,
    keySpread: spreadNow === null ? 'none' : nearKeyNumber(spreadNow, 'spread'),
    keyTotal: totalNow === null ? 'none' : nearKeyNumber(totalNow, 'total'),
    weather,
    venue,
  };
}

function emptyMarket(venue: GameMarket['venue'], weather: GameMarket['weather']): GameMarket {
  const none = { open: null, current: null };
  return { homeSpread: none, total: none, moneyline: { away: none, home: none }, winChance: null, keySpread: 'none', keyTotal: 'none', weather, venue };
}

/** Points the line moved (current − open), or null when either end is missing. */
export function moved(l: MovingLine): number | null {
  return l.open === null || l.current === null ? null : l.current - l.open;
}
