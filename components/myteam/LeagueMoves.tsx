/**
 * LeagueMoves — "League moves" under the waiver card (Wave C3, lib/myteam/leagueMoves.ts):
 * the league's latest completed adds, drops and trades, newest first; your own team in
 * gold-bright. Same section heading + list-card recipe as the roster (§9.4). Static.
 */

import type { LeagueMove } from '@/lib/myteam/leagueMoves';
import { agoText } from '@/lib/myteam/leagueMoves';
import { SectionHeading } from './RosterView';
import { LIST_CARD } from './style';

const KIND: Readonly<Record<LeagueMove['kind'], string>> = { trade: 'TRADE', waiver: 'WAIVER', free_agent: 'FREE AGENT' };

export default function LeagueMoves({ moves, now }: { moves: readonly LeagueMove[] | null | undefined; now: number }) {
  if (!moves || moves.length === 0) return null;
  return (
    <section data-moves aria-label="League moves" style={{ paddingTop: 16 }}>
      <SectionHeading>LEAGUE MOVES</SectionHeading>
      <ul className="overflow-hidden" style={LIST_CARD}>
        {moves.map((m, i) => (
          <li key={m.id} style={{ padding: '10px 12px', borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--muted)' }}>{KIND[m.kind]}</span>
              <span className="tabular-nums" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)' }}>{agoText(m.at, now)}</span>
            </div>
            {m.sides.map((s) => (
              <p key={s.team} style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, color: 'var(--subtext)' }}>
                <span style={{ fontWeight: 800, color: s.mine ? 'var(--gold-bright)' : 'var(--text)' }}>{s.team}</span>
                {s.adds.length > 0 && <span> · adds {s.adds.join(', ')}</span>}
                {s.drops.length > 0 && <span style={{ color: 'var(--muted)' }}> · drops {s.drops.join(', ')}</span>}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
