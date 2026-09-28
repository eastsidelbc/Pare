/**
 * Leaderboards — the third tab.
 *
 * Server component: fetches every board once via `getAllLeaderboards()` (ESPN,
 * 6h-cached) and renders the fixed-header + single-scroll shell used across the
 * app. Grouped into Offense / Defense / Special Teams sections.
 *
 * The polished, interactive card lives in `components/leaderboards/LeaderCard`
 * (client) — headshots, tap-to-expand to the full top 25, entrance animations.
 */

import { getAllLeaderboards, type LeaderSection } from '@/lib/leaders';
import LeaderCard from '@/components/leaderboards/LeaderCard';
import FantasyBoards from '@/components/leaderboards/FantasyBoards';

// Re-fetch (and re-render) on the same ~6h cadence as the underlying board fetch.
export const revalidate = 21600;

const SECTIONS: { key: LeaderSection; label: string }[] = [
  { key: 'fantasy', label: 'Fantasy (PPR)' },
  { key: 'offense', label: 'Offense' },
  { key: 'defense', label: 'Defense' },
  { key: 'special', label: 'Special Teams' },
];

export default async function LeaderboardsPage() {
  const boards = await getAllLeaderboards();

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100dvh', background: 'var(--bg)' }}>
      {/* Fixed top bar — matches the schedule header. */}
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
              Leaders
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
          {SECTIONS.map(({ key, label }) => {
            const sectionBoards = boards.filter((b) => b.section === key);
            if (sectionBoards.length === 0) return null;
            // Fantasy renders through a client component that owns the Total|PPG toggle.
            if (key === 'fantasy') {
              return <FantasyBoards key={key} boards={sectionBoards} label={label} />;
            }
            return (
              <section key={key}>
                <SectionLabel>{label}</SectionLabel>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {sectionBoards.map((board) => (
                    <LeaderCard key={board.key} board={board} />
                  ))}
                </div>
              </section>
            );
          })}
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
