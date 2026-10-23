/**
 * SplitsTable — the Standings "Splits" view (Wave B4): one division per card,
 * TEAM | HOME | ROAD | DIV | CONF | GB | DIFF. Same row recipe as the other views
 * (32px, tabular, team color on the abbreviation only, tap → team quick menu).
 * GB is computed against the division leader (lib/standings.ts withDivisionGamesBehind).
 */

'use client';

import { useFavorites } from '@/components/FavoritesProvider';
import type { DivisionStandings } from '@/lib/standings';
import { ClinchMark, EmptyRows, ListCard, Num, ROW_BASE, ROW_H, TeamAbbr } from './StandingsRow';

const COLUMNS = 'minmax(52px,1fr) repeat(4, minmax(0,.8fr)) minmax(0,.6fr) minmax(0,.75fr)';
const HEADS = ['TEAM', 'HOME', 'ROAD', 'DIV', 'CONF', 'GB', 'DIFF'];

export default function SplitsTable({ division }: { division: DivisionStandings }) {
  const { openQuickMenu } = useFavorites();
  const [conf, div] = division.label.split(' ');
  return (
    <ListCard prefix={conf} title={div}>
      {division.teams.length === 0 ? (
        <EmptyRows />
      ) : (
        <>
          <div
            className="grid items-center"
            style={{ ...ROW_BASE, gridTemplateColumns: COLUMNS, height: 24, borderBottom: '1px solid var(--hairline)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--subtext)' }}
          >
            {HEADS.map((h, i) => (
              <span key={h} className="whitespace-nowrap" style={{ textAlign: i === 0 ? 'left' : 'center' }}>
                {h}
              </span>
            ))}
          </div>
          {division.teams.map((t, i) => (
            <button
              key={t.abbr}
              type="button"
              onClick={() => openQuickMenu(t.abbr)}
              className="grid w-full items-center text-left touch-optimized active:opacity-60"
              aria-label={`${t.name}: home ${t.homeRecord}, road ${t.roadRecord}, division ${t.divRecord}, conference ${t.confRecord}, ${t.gamesBehind === '—' ? 'leads the division' : `${t.gamesBehind} games behind`}, point differential ${t.diff}. Open team menu`}
              style={{ ...ROW_BASE, gridTemplateColumns: COLUMNS, height: ROW_H, borderBottom: i === division.teams.length - 1 ? 'none' : '1px solid var(--hairline)' }}
            >
              <span className="flex min-w-0 items-center" style={{ gap: 4 }}>
                <TeamAbbr abbr={t.abbr} />
                <ClinchMark mark={t.clincher} />
              </span>
              <Num>{t.homeRecord}</Num>
              <Num>{t.roadRecord}</Num>
              <Num>{t.divRecord}</Num>
              <Num>{t.confRecord}</Num>
              <Num secondary>{t.gamesBehind}</Num>
              <Num secondary={t.diff.startsWith('-')}>{t.diff}</Num>
            </button>
          ))}
        </>
      )}
    </ListCard>
  );
}
