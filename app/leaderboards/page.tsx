/**
 * Leaderboards — the fourth tab (design-system §9.3 "Standings match").
 *
 * Server component: fetches every board once via `getAllLeaderboards()` and renders
 * the fixed-header + single-scroll shell used across the app.
 * Order: Fantasy (PPR) → Offense → Defense → Special Teams → ROOKIES divider →
 * Rookie Offense → Rookie Defense → Rookie Special Teams. Rookie boards are the same
 * stat boards filtered to first-year players; an empty rookie board is hidden, and
 * the whole Rookies block hides if none have data.
 */

import { getAllLeaderboards, type LeaderBoard, type LeaderSection } from '@/lib/leaders';
import { getCurrentWeekInfo } from '@/lib/schedule';
import LeaderCard from '@/components/leaderboards/LeaderCard';
import FantasyBoards from '@/components/leaderboards/FantasyBoards';
import { LEADER_GRID } from '@/components/leaderboards/grid';
import CardGrid from '@/components/ui/CardGrid';
import { SectionLabel } from '@/components/standings/StandingsRow';

// Page-level ISR hint. NOTE: the effective page refresh is ~5 min, because the
// root layout's schedule fetch (5 min) is shorter and Next uses the smallest
// window on the page. The ESPN/Sleeper board DATA itself is still held ~6h at
// the fetch layer (lib/leaders.ts, lib/fantasy.ts), so re-renders are cheap.
export const revalidate = 21600;

const SECTIONS: { key: LeaderSection; label: string }[] = [
  { key: 'offense', label: 'Offense' },
  { key: 'defense', label: 'Defense' },
  { key: 'special', label: 'Special Teams' },
];

const ROOKIE_SECTIONS: { key: LeaderSection; label: string }[] = [
  { key: 'rookieOffense', label: 'Rookie Offense' },
  { key: 'rookieDefense', label: 'Rookie Defense' },
  { key: 'rookieSpecial', label: 'Rookie Special Teams' },
];

export default async function LeaderboardsPage() {
  const [boards, { season }] = await Promise.all([getAllLeaderboards(), getCurrentWeekInfo()]);

  const fantasy = boards.filter((b) => b.section === 'fantasy');
  const rookieGroups = ROOKIE_SECTIONS.map((s) => ({
    ...s,
    // Hide empty rookie boards (e.g. no rookie punter yet).
    boards: boards.filter((b) => b.section === s.key && b.leaders.length > 0),
  })).filter((s) => s.boards.length > 0);

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'var(--app-h, 100dvh)', background: 'var(--bg-deep)' }}>
      {/* Fixed top bar — §9 "H1 · Inline". */}
      <header
        className="flex-none border-b"
        style={{ background: 'var(--bg-deep)', borderColor: 'var(--hairline)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-[52px] w-full max-w-[1440px] items-center px-4">
          <h1 className="whitespace-nowrap font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
            Pare
            <span
              className="ml-1.5 font-bold"
              style={{ fontSize: '9.5px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}
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
        <div className="mx-auto w-full max-w-[1440px] px-4 pt-1">
          {fantasy.length > 0 && <FantasyBoards boards={fantasy} label="Fantasy (PPR)" />}

          {SECTIONS.map(({ key, label }) => (
            <BoardSection key={key} label={label} boards={boards.filter((b) => b.section === key)} />
          ))}

          {rookieGroups.length > 0 && (
            <>
              <RookiesDivider season={season} />
              {rookieGroups.map(({ key, label, boards: rb }) => (
                <BoardSection key={key} label={label} boards={rb} />
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function BoardSection({ label, boards }: { label: string; boards: LeaderBoard[] }) {
  if (boards.length === 0) return null;
  return (
    <section className="mb-4">
      <SectionLabel>{label}</SectionLabel>
      <CardGrid {...LEADER_GRID}>
        {boards.map((board) => (
          <LeaderCard key={board.key} board={board} />
        ))}
      </CardGrid>
    </section>
  );
}

/** Big divider before the rookie sections — same voice as the Home "WEEK n" divider (§9.7). */
function RookiesDivider({ season }: { season: number }) {
  return (
    <div className="mb-1 mt-6 flex items-center gap-2.5">
      <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text)' }}>
        Rookies
      </span>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--subtext)' }}>
        {season} class
      </span>
      <span className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
    </div>
  );
}
