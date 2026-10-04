/**
 * DivisionTable — one division card in the Standings "Division" view (design-system §9.2).
 *
 * ESPN columns: Team | W | L | (T) | PCT | PF | PA | STRK. Teams arrive already in
 * ESPN's official tiebreak order; the first row is the division leader and gets the
 * gold leader tint. No logos (team = seed chip + team-color abbreviation), no motion.
 */

import type { DivisionStandings } from '@/lib/standings';
import { EmptyRows, HeaderRow, ListCard, TeamRow } from './StandingsRow';

export default function DivisionTable({ division, showTies }: { division: DivisionStandings; showTies: boolean }) {
  const { label, teams } = division;
  const [conf, ...rest] = label.split(' ');

  return (
    <ListCard prefix={conf} title={rest.join(' ')}>
      {teams.length === 0 ? (
        <EmptyRows />
      ) : (
        <>
          <HeaderRow showTies={showTies} />
          {teams.map((t, i) => (
            <TeamRow key={t.abbr} team={t} showTies={showTies} leader={i === 0} last={i === teams.length - 1} />
          ))}
        </>
      )}
    </ListCard>
  );
}
