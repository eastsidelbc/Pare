/**
 * MarketCard — "Market" under Game lines on the Leans game screen (Wave B1,
 * lib/leans/market.ts): how the spread and total moved since they opened, the win
 * chance the moneyline implies (book's cut removed), key numbers, weather, venue.
 * Market facts, not Pare picks (design-system §9.5 copy rules). Tokens only.
 */

import { FORMULA_CONFIG } from '@/lib/formulas/config';
import type { KeyNumberHit } from '@/lib/formulas/odds';
import { num, pct } from '@/lib/leans/format';
import { moved, type GameMarket, type MovingLine } from '@/lib/leans/market';
import type { Matchup } from '@/lib/schedule';
import { LIST_CARD } from '@/components/myteam/style';
import { LeansLabel, WHY_BOX } from './ui';

interface Row {
  key: string;
  label: string;
  /** One line, or several stacked lines (key numbers). */
  value: string | string[];
  sub: string | null;
}

const arrow = (l: MovingLine, fmt: (n: number) => string) =>
  l.open !== null && l.current !== null && l.open !== l.current ? `${fmt(l.open)} → ${fmt(l.current)}` : l.current !== null ? fmt(l.current) : l.open !== null ? fmt(l.open) : null;

/** Line with sign for spreads (−3, +4.5, PK). */
const spreadFmt = (n: number) => (n === 0 ? 'PK' : n > 0 ? `+${n}` : num(n));

function nearestKey(line: number, kind: 'spread' | 'total'): number {
  const keys = FORMULA_CONFIG.keyNumbers[kind];
  const v = Math.abs(line);
  return keys.reduce((best, k) => (Math.abs(k - v) < Math.abs(best - v) ? k : best), keys[0]);
}

function keyText(hit: KeyNumberHit, line: number | null, kind: 'spread' | 'total'): string | null {
  if (hit === 'none' || line === null) return null;
  const k = nearestKey(line, kind);
  const what = kind === 'spread' ? 'Spread' : 'Total';
  return hit === 'on' ? `${what} sits on ${k}` : `${what} is half a point from ${k}`;
}

export function marketRows(m: GameMarket, away: string, home: string): Row[] {
  const rows: Row[] = [];
  const spread = arrow(m.homeSpread, spreadFmt);
  if (spread) {
    const d = moved(m.homeSpread);
    rows.push({
      key: 'spread',
      label: `Spread (${home})`,
      value: spread,
      sub: d === null ? null : d === 0 ? 'Unchanged since it opened' : `Moved ${Math.abs(d)} toward ${d > 0 ? away : home}`,
    });
  }
  const total = arrow(m.total, (n) => String(n));
  if (total) {
    const d = moved(m.total);
    rows.push({ key: 'total', label: 'Total', value: total, sub: d === null ? null : d === 0 ? 'Unchanged since it opened' : `${d > 0 ? 'Up' : 'Down'} ${Math.abs(d)} since it opened` });
  }
  if (m.winChance) {
    rows.push({
      key: 'win',
      label: 'Win chance',
      value: `${away} ${pct(m.winChance.away)} · ${home} ${pct(m.winChance.home)}`,
      sub: 'From the moneyline, book’s cut removed',
    });
  }
  const keys = [keyText(m.keySpread, m.homeSpread.current ?? m.homeSpread.open, 'spread'), keyText(m.keyTotal, m.total.current ?? m.total.open, 'total')].filter(
    (t): t is string => t !== null,
  );
  if (keys.length > 0) rows.push({ key: 'keys', label: 'Key numbers', value: keys, sub: 'Games often land on these margins / totals' });
  if (m.weather && m.weather.tempF !== null) {
    const parts = [`${m.weather.tempF}°`];
    if (m.weather.gustMph !== null) parts.push(`gusts ${m.weather.gustMph} mph`);
    if (m.weather.precipPct !== null) parts.push(`${m.weather.precipPct}% rain`);
    rows.push({ key: 'weather', label: 'Weather', value: parts.join(' · '), sub: 'Forecast at kickoff' });
  }
  if (m.model) {
    const fav = m.model.homeMargin === null ? null : m.model.homeMargin >= 0 ? home : away;
    rows.push({
      key: 'model',
      label: 'ESPN model',
      value: `${away} ${pct(m.model.away)} · ${home} ${pct(m.model.home)}`,
      sub: fav && m.model.homeMargin !== null ? `ESPN’s power rating projects ${fav} by ${Math.abs(m.model.homeMargin).toFixed(1)}` : 'ESPN’s power rating (FPI)',
    });
  }
  if (m.venue) rows.push({ key: 'venue', label: 'Venue', value: m.venue.name, sub: m.venue.turf === null ? null : m.venue.turf ? 'Turf' : 'Grass' });
  return rows;
}

export default function MarketCard({ market, matchup }: { market: GameMarket | null; matchup: Matchup }) {
  if (!market) return null;
  const rows = marketRows(market, matchup.away.abbr, matchup.home.abbr);
  if (rows.length === 0) return null;
  return (
    <section data-market aria-label="Market" className="flex flex-col" style={{ gap: 6 }}>
      <LeansLabel style={{ margin: '8px 4px -2px' }}>Market</LeansLabel>
      <div style={{ ...LIST_CARD, padding: 10 }}>
        <dl style={WHY_BOX}>
          {rows.map((r, i) => (
            <div key={r.key} className="flex items-start justify-between" style={{ gap: 10, minHeight: 44, padding: '7px 10px', borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }}>
              <dt className="flex-none whitespace-nowrap" style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)', paddingTop: 1 }}>{r.label}</dt>
              <dd className="text-right" style={{ minWidth: 0 }}>
                {(Array.isArray(r.value) ? r.value : [r.value]).map((v) => (
                  <div key={v} className="tabular-nums" style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
                    {v}
                  </div>
                ))}
                {r.sub && <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.35 }}>{r.sub}</div>}
              </dd>
            </div>
          ))}
        </dl>
        <p style={{ margin: '8px 2px 0', fontSize: 10.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--muted)' }}>
          What the betting market says, as facts — not a Pare lean. Pare tested its own projections on two seasons; they didn’t beat these lines.
        </p>
      </div>
    </section>
  );
}
