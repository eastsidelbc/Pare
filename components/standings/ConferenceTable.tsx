/**
 * ConferenceTable — the Standings "Conf" view: one conference as a 16-team list in
 * ESPN seed order, with a dashed "Playoff line" after seed 7 (design-system §9.2).
 */

import type { ConferenceStandings } from '@/lib/standings';
import { conferenceBySeed, PLAYOFF_SEEDS } from '@/lib/standingsViews';
import { EmptyRows, HeaderRow, ListCard, TeamRow } from './StandingsRow';

function PlayoffLine() {
  return (
    <div
      className="flex items-center gap-2 px-2.5"
      style={{
        height: 20, borderBottom: '1px solid var(--hairline)',
        fontSize: '9px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--subtext)',
      }}
    >
      <span className="flex-1" style={{ borderTop: '1px dashed var(--seed-edge)' }} />
      Playoff line
      <span className="flex-1" style={{ borderTop: '1px dashed var(--seed-edge)' }} />
    </div>
  );
}

export default function ConferenceTable({ conference, showTies }: { conference: ConferenceStandings; showTies: boolean }) {
  const teams = conferenceBySeed(conference);

  return (
    <ListCard prefix={conference.conference} title="Conference">
      {teams.length === 0 ? (
        <EmptyRows />
      ) : (
        <>
          <HeaderRow showTies={showTies} />
          {teams.map((t, i) => (
            <div key={t.abbr}>
              <TeamRow team={t} showTies={showTies} showOutSeed last={i === teams.length - 1} />
              {t.seed === PLAYOFF_SEEDS && i < teams.length - 1 && <PlayoffLine />}
            </div>
          ))}
        </>
      )}
    </ListCard>
  );
}
