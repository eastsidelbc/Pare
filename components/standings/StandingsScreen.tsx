/**
 * StandingsScreen — client shell for the Standings tab (design-system §9.2).
 *
 * Fixed "H1 · Inline" header (Pare + NFL, and a Division / Conf / Playoffs glass
 * toggle) + the single scroll region. The page (server component) fetches once and
 * hands the data down; switching views is pure client state over the same data — no
 * refetch. The T column follows the league-wide rule (`leagueHasTies`).
 *
 * Freshness: coming back to the app/tab after 60s+ quietly re-fetches the page
 * (`useRefreshOnReturn`), so a game that ended while the app sat in the
 * background shows up without leaving the tab.
 */

'use client';

import { useMemo, useRef, useState } from 'react';
import { LayoutGroup } from 'framer-motion';
import type { ConferenceStandings } from '@/lib/standings';
import { leagueHasTies } from '@/lib/standingsViews';
import { useRefreshOnReturn } from '@/lib/hooks/useRefreshOnReturn';
import CardGrid from '@/components/ui/CardGrid';
import ActivePill from '@/components/ui/ActivePill';
import { GlassLabel, glassCapsule } from '@/components/ui/glassControl';
import DivisionTable from './DivisionTable';
import ConferenceTable from './ConferenceTable';
import PlayoffPicture from './PlayoffPicture';
import { SectionLabel } from './StandingsRow';

type View = 'division' | 'conference' | 'playoffs';

/** Refresh on return if the standings on screen are at least this old. */
const REFRESH_ON_RETURN_AFTER_MS = 60_000;

const VIEWS: ReadonlyArray<{ id: View; label: string }> = [
  { id: 'division', label: 'Division' },
  { id: 'conference', label: 'Conf' },
  { id: 'playoffs', label: 'Playoffs' },
];

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <LayoutGroup id="standings-view">
      <div
        role="group"
        aria-label="Standings view"
        className="flex flex-none items-center rounded-full"
        style={glassCapsule}
      >
        {VIEWS.map(({ id, label }) => {
          const on = id === view;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(id)}
              // pare-hit44: looks 30px tall, taps like 44px (Apple HIG).
              className="pare-hit44 touch-optimized relative rounded-full px-2 active:opacity-70"
              style={{ height: 30, fontSize: '11.5px' }}
            >
              {on && <ActivePill layoutId="standings-view" />}
              <GlassLabel active={on}>{label}</GlassLabel>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

export default function StandingsScreen({ conferences }: { conferences: ConferenceStandings[] }) {
  const [view, setView] = useState<View>('division');
  const mainRef = useRef<HTMLElement>(null);
  const showTies = useMemo(() => leagueHasTies(conferences), [conferences]);
  useRefreshOnReturn(conferences, REFRESH_ON_RETURN_AFTER_MS);

  const changeView = (v: View) => {
    setView(v);
    mainRef.current?.scrollTo({ top: 0 });
  };

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'var(--app-h, 100dvh)', background: 'var(--bg-deep)' }}>
      {/* Fixed top bar — §9 "H1 · Inline". */}
      <header
        className="flex-none border-b"
        style={{ background: 'var(--bg-deep)', borderColor: 'var(--hairline)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-[52px] w-full max-w-[1440px] items-center justify-between gap-2 px-4">
          <h1 className="whitespace-nowrap font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
            Pare
            <span
              className="ml-1.5 font-bold"
              style={{ fontSize: '9.5px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}
            >
              NFL
            </span>
          </h1>
          <ViewToggle view={view} onChange={changeView} />
        </div>
      </header>

      {/* The only scroll region. */}
      <main
        ref={mainRef}
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)',
        }}
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 pt-1">
          {view === 'division' &&
            conferences.map((conf) => (
              <section key={conf.conference} className="mb-4">
                <SectionLabel>{conf.conference}</SectionLabel>
                {/* 1 → 2 → 4 cards by width; 4 max = one conference per row on iPad landscape. */}
                <CardGrid minCard={270} maxCard={340} maxCols={4}>
                  {conf.divisions.map((division) => (
                    <DivisionTable key={division.label} division={division} showTies={showTies} />
                  ))}
                </CardGrid>
              </section>
            ))}

          {view === 'conference' && (
            <section className="mb-4">
              <SectionLabel>By seed</SectionLabel>
              <CardGrid minCard={300} maxCard={560} maxCols={2}>
                {conferences.map((conf) => (
                  <ConferenceTable key={conf.conference} conference={conf} showTies={showTies} />
                ))}
              </CardGrid>
            </section>
          )}

          {view === 'playoffs' && (
            <section className="mb-4">
              <SectionLabel>If the season ended today</SectionLabel>
              <CardGrid minCard={300} maxCard={560} maxCols={2}>
                {conferences.map((conf) => (
                  <PlayoffPicture key={conf.conference} conference={conf} />
                ))}
              </CardGrid>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
