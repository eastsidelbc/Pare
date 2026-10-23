/**
 * WaiverWatch — "Trending adds · free in your league" under the roster (Wave B5,
 * lib/myteam/waiver.ts): Sleeper's most-added players of the last 24h that nobody in
 * this league rosters. Same section heading + 62px list-row recipe as the roster (§9.4).
 * Static; hidden when there's nothing to show.
 */

import type { WaiverPlayer } from '@/lib/myteam/waiver';
import { addsText } from '@/lib/myteam/waiver';
import PositionCircle from './PositionCircle';
import { SectionHeading } from './RosterView';
import { LIST_CARD } from './style';

export default function WaiverWatch({ players }: { players: readonly WaiverPlayer[] | null | undefined }) {
  if (!players || players.length === 0) return null;
  return (
    <section data-waiver aria-label="Trending adds free in your league" style={{ paddingTop: 16 }}>
      <SectionHeading right={<span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>last 24h</span>}>TRENDING · FREE IN YOUR LEAGUE</SectionHeading>
      <ul className="overflow-hidden" style={LIST_CARD}>
        {players.map((p, i) => (
          <li
            key={p.playerId}
            className="flex items-center"
            style={{ minHeight: 62, gap: 12, padding: '8px 12px', borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }}
          >
            <PositionCircle player={{ playerId: p.playerId, name: p.name, position: p.position, nflTeam: p.team, group: 'bench', slot: null, injury: null }} />
            <div className="min-w-0 flex-1">
              <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>{[p.team ?? 'FA', p.position].join(' · ')}</div>
            </div>
            <div className="flex-none text-right">
              <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{addsText(p.adds)}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>adds</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
