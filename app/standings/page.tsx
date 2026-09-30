/**
 * Standings — the fourth tab.
 *
 * Server component: fetches the full league standings once via `getStandings()`
 * (ESPN, ~1h-cached) and renders the same fixed-header + single-scroll shell used
 * across the app. Grouped AFC → NFC, each conference showing its four division
 * boxes stacked (East, North, South, West).
 */

import { getStandings } from '@/lib/standings';
import DivisionTable from '@/components/standings/DivisionTable';

// Re-render on the same ~1h cadence as the underlying standings fetch.
export const revalidate = 3600;

export default async function StandingsPage() {
  const conferences = await getStandings();

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'var(--app-h, 100dvh)', background: 'var(--bg)' }}>
      {/* Fixed top bar — matches the schedule / leaders header. */}
      <header
        className="flex-none border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-14 w-full max-w-[600px] items-center justify-between px-4">
          <h1 className="font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
            Pare
            <span
              className="ml-1.5 font-bold"
              style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}
            >
              Standings
            </span>
          </h1>
        </div>
      </header>

      {/* The only scroll region. */}
      <main
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)',
        }}
      >
        <div className="mx-auto w-full max-w-[600px] px-4 pt-4 space-y-6">
          {conferences.map((conf) => (
            <section key={conf.conference}>
              <SectionLabel>{conf.conference}</SectionLabel>
              <div className="space-y-3">
                {conf.divisions.map((division) => (
                  <DivisionTable key={division.label} division={division} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span
        className="font-black tracking-tight"
        style={{ fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)' }}
      >
        {children}
      </span>
      <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
    </div>
  );
}
