/**
 * SplitsTable — the Standings "Splits" view (Wave B4): one division per card,
 * TEAM | HOME | ROAD | DIV | CONF | GB | DIFF | LUCK. LUCK = wins − Pythagorean wins from points
 * for / against (lib/formulas/team.ts pythagLuck): + won more than the scoring says. Same row recipe as the other views
 * (32px, tabular, team color on the abbreviation only, tap → team quick menu).
 * GB is computed against the division leader (lib/standings.ts withDivisionGamesBehind).
 */

'use client';

import { useFavorites } from '@/components/FavoritesProvider';
import { pythagLuck } from '@/lib/formulas/team';
import type { DivisionStandings } from '@/lib/standings';
import { ClinchMark, EmptyRows, ListCard, Num, ROW_BASE, ROW_H, TeamAbbr } from './StandingsRow';

const COLUMNS = 'minmax(46px,1fr) repeat(4, minmax(0,.8fr)) minmax(0,.55fr) minmax(0,.7fr) minmax(0,.7fr)';
const HEADS = ['TEAM', 'HOME', 'ROAD', 'DIV', 'CONF', 'GB', 'DIFF', 'LUCK'];

/** One decimal with a real minus; rounds first so −0.04 reads "0.0", not "−0.0". */
export function signedLuck(x: number): string {
  const r = (Math.sign(x) * Math.round(Math.abs(x) * 10)) / 10; // symmetric: ±0.75 → ±0.8
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(1)}`;
}

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
          {division.teams.map((t, i) => {
            const games = t.wins + t.losses + t.ties;
            const luck = games > 0 ? pythagLuck(t.wins, games, t.pointsFor, t.pointsAgainst, t.ties) : null;
            return (
            <button
              key={t.abbr}
              type="button"
              onClick={() => openQuickMenu(t.abbr)}
              className="grid w-full items-center text-left touch-optimized active:opacity-60"
              aria-label={`${t.name}: home ${t.homeRecord}, road ${t.roadRecord}, division ${t.divRecord}, conference ${t.confRecord}, ${t.gamesBehind === '—' ? 'leads the division' : `${t.gamesBehind} games behind`}, point differential ${t.diff}${luck === null ? '' : `, luck ${signedLuck(luck)} wins`}. Open team menu`}
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
              <Num secondary={luck === null || luck < 0}>{luck === null ? '—' : signedLuck(luck)}</Num>
            </button>
            );
          })}
        </>
      )}
    </ListCard>
  );
}
