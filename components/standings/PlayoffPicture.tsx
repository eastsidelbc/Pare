/**
 * PlayoffPicture — the Standings "Playoffs" view for one conference (design-system §9.2):
 * seeds 1–7 ("BYE" for #1, DIV / WC tags), the Wild Card round (7@2, 6@3, 5@4) and the
 * first teams out. Seeds are ESPN's (`playoffSeed`), so this is "if the season ended today".
 */

import TeamIdentity from '@/components/ui/TeamIdentity';
import type { ConferenceStandings, TeamStanding } from '@/lib/standings';
import { DIVISION_WINNER_SEEDS, playoffPicture } from '@/lib/standingsViews';
import { EmptyRows, HeaderRow, ListCard, ROW_H, SeedChip, TeamAbbr, TeamRow } from './StandingsRow';

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3"
      style={{
        paddingTop: 9, paddingBottom: 6, borderBottom: '1px solid var(--hairline)',
        fontSize: '9px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--subtext)',
      }}
    >
      {children}
    </div>
  );
}

const record = (t: TeamStanding) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

function SeedRow({ team: t, last }: { team: TeamStanding; last: boolean }) {
  const tag = t.seed === 1 ? 'BYE' : (t.seed ?? 99) <= DIVISION_WINNER_SEEDS ? 'DIV' : 'WC';
  return (
    <div
      className="grid items-center px-2.5"
      style={{
        gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,.8fr) minmax(38px,.8fr) 36px', columnGap: 4, height: ROW_H,
        borderBottom: last ? 'none' : '1px solid var(--hairline)',
      }}
    >
      <div className="flex min-w-0 items-center overflow-hidden" style={{ gap: 6 }}>
        <SeedChip seed={t.seed} />
        <TeamIdentity abbr={t.abbr} surface="standings" size={20} decorative withName>
          <TeamAbbr abbr={t.abbr} />
        </TeamIdentity>
        <span className="truncate" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--subtext)' }}>{t.nickname}</span>
      </div>
      <span className="text-center tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{record(t)}</span>
      <span className="text-center tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{t.pct}</span>
      <span
        className="text-right"
        style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', color: tag === 'BYE' ? 'var(--text)' : 'var(--subtext)' }}
      >
        {tag}
      </span>
    </div>
  );
}

function Side({ team: t, right }: { team: TeamStanding; right?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${right ? 'flex-row-reverse' : ''}`}>
      <SeedChip seed={t.seed} />
      <TeamIdentity abbr={t.abbr} surface="standings" size={22} decorative withName>
        <TeamAbbr abbr={t.abbr} size={15} />
      </TeamIdentity>
      <span className="tabular-nums" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--subtext)' }}>{record(t)}</span>
    </div>
  );
}

export default function PlayoffPicture({ conference }: { conference: ConferenceStandings }) {
  const { seeds, wildCard, hunt } = playoffPicture(conference);

  return (
    <ListCard prefix={conference.conference} title="Playoff picture">
      {seeds.length === 0 ? (
        <EmptyRows>Seeds unavailable</EmptyRows>
      ) : (
        <>
          <SubLabel>Seeds</SubLabel>
          {seeds.map((t, i) => <SeedRow key={t.abbr} team={t} last={i === seeds.length - 1} />)}
          {wildCard.length > 0 && (
            <>
              <SubLabel>Wild Card round</SubLabel>
              {wildCard.map(([away, home], i) => (
                <div
                  key={away.abbr}
                  className="grid items-center px-3"
                  style={{ gridTemplateColumns: '1fr 26px 1fr', height: 44, borderBottom: i === wildCard.length - 1 ? 'none' : '1px solid var(--hairline)' }}
                  aria-label={`${away.name} at ${home.name}`}
                >
                  <Side team={away} />
                  <span className="text-center" style={{ fontSize: '10px', fontWeight: 800, color: 'var(--subtext)' }}>@</span>
                  <Side team={home} right />
                </div>
              ))}
            </>
          )}
          {hunt.length > 0 && (
            <>
              <SubLabel>In the hunt</SubLabel>
              <HeaderRow showTies={false} />
              {hunt.map((t, i) => <TeamRow key={t.abbr} team={t} showTies={false} showOutSeed last={i === hunt.length - 1} />)}
            </>
          )}
        </>
      )}
    </ListCard>
  );
}
