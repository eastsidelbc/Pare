/**
 * DivisionStrip — compact standings at the top of Leaders (design-system §9.3):
 * one small card per division (NFC then AFC, ESPN tiebreak order), 4 rows of
 * team abbr + W-L, the leader row gold-tinted. Swipes sideways (snap per card,
 * bleeds to the screen edge); ~2.5 cards show at 393px so the cut-off card hints
 * there's more. Each card → /standings. Server component, no client JS.
 * Hidden when ESPN has never returned standings on this server.
 */

import Link from 'next/link';
import type { ConferenceStandings, TeamStanding } from '@/lib/standings';
import { ListCard, TeamAbbr } from '@/components/standings/StandingsRow';

const CARD_W = 148;
const ROW_H = 24;

function record(t: TeamStanding): string {
  return t.ties > 0 ? `${t.wins}-${t.losses}-${t.ties}` : `${t.wins}-${t.losses}`;
}

export default function DivisionStrip({ conferences }: { conferences: readonly ConferenceStandings[] }) {
  const divisions = conferences.flatMap((c) => c.divisions).filter((d) => d.teams.length > 0);
  if (divisions.length === 0) return null;

  return (
    <section aria-label="Division standings" className="mb-3">
      <div
        className="-mx-3 flex overflow-x-auto px-3"
        style={{
          gap: 8,
          paddingTop: 6,
          paddingBottom: 2,
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: 12,
          scrollbarWidth: 'none',
          overscrollBehaviorX: 'contain',
          // Horizontal swipes scroll the strip; vertical ones still scroll the page.
          touchAction: 'pan-x pan-y',
        }}
      >
        {divisions.map(({ label, teams }) => {
          const [conf, ...rest] = label.split(' ');
          return (
            <Link
              key={label}
              href="/standings"
              aria-label={`${label} standings: ${teams.map((t) => `${t.abbr} ${record(t)}`).join(', ')}`}
              className="flex-none touch-optimized active:opacity-80"
              style={{ width: CARD_W, scrollSnapAlign: 'start' }}
            >
              <ListCard prefix={conf} title={rest.join(' ')}>
                {teams.map((t, i) => (
                  <div
                    key={t.abbr}
                    className="flex items-center justify-between px-3"
                    style={{
                      height: ROW_H,
                      background: i === 0 ? 'var(--leader-tint)' : 'transparent',
                      borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
                    }}
                  >
                    <TeamAbbr abbr={t.abbr} size={12} />
                    <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                      {record(t)}
                    </span>
                  </div>
                ))}
              </ListCard>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
