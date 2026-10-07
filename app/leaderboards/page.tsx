/**
 * Leaderboards — the fourth tab (design-system §9.3 "Standings match").
 *
 * Server component: fetches every board once via `getAllLeaderboards()` and renders
 * the fixed-header + single-scroll shell used across the app.
 * Order: Fantasy (PPR) → Offense → Defense → Special Teams → ROOKIES divider →
 * Rookie Offense → Rookie Defense → Rookie Special Teams. Rookie boards are the same
 * stat boards filtered to first-year players; an empty rookie board is hidden, and
 * the whole Rookies block hides if none have data.
 * Header: "H1 · Inline" + a glass jump capsule (FAN · OFF · DEF · ST · R) — in-page
 * anchors into the one scroll region; the current section wears the gold ring (JumpNav).
 */

import { getAllLeaderboards, type LeaderBoard, type LeaderSection } from '@/lib/leaders';
import { getCurrentWeekInfo } from '@/lib/schedule';
import LeaderCard from '@/components/leaderboards/LeaderCard';
import FantasyBoards from '@/components/leaderboards/FantasyBoards';
import { LEADER_GRID } from '@/components/leaderboards/grid';
import CardGrid from '@/components/ui/CardGrid';
import SiteFooter from '@/components/SiteFooter';
import RefreshOnReturn from '@/components/leaderboards/RefreshOnReturn';
import JumpNav, { type JumpLink } from '@/components/leaderboards/JumpNav';
import { SectionLabel } from '@/components/standings/StandingsRow';

// Page ISR window: 5 min. (It was 21600 on paper, but the root layout's 5-min schedule
// fetch already pulled the real window down to 300s — now it says so.) Board DATA is
// fetch-cached 30 min in lib/leaders.ts + lib/fantasy.ts, so most re-renders are cheap.
// Must stay a literal.
export const revalidate = 300;

const SECTIONS: { key: LeaderSection; label: string; id: string }[] = [
  { key: 'offense', label: 'Offense', id: 'lb-off' },
  { key: 'defense', label: 'Defense', id: 'lb-def' },
  { key: 'special', label: 'Special Teams', id: 'lb-st' },
];

/** Header jump links → section ids. "R" only shows when the Rookies block does. */
const JUMPS: JumpLink[] = [
  { label: 'FAN', id: 'lb-fan', name: 'Fantasy' },
  { label: 'OFF', id: 'lb-off', name: 'Offense' },
  { label: 'DEF', id: 'lb-def', name: 'Defense' },
  { label: 'ST', id: 'lb-st', name: 'Special Teams' },
  { label: 'R', id: 'lb-rookies', name: 'Rookies' },
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

  // Stamp of this render — the client re-fetches on return once it's 10+ min old.
  const renderedAt = Date.now();

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'var(--app-h, 100dvh)', background: 'var(--bg-deep)' }}>
      <RefreshOnReturn renderedAt={renderedAt} />
      {/* Fixed top bar — §9 "H1 · Inline". */}
      <header
        className="flex-none border-b"
        style={{ background: 'var(--bg-deep)', borderColor: 'var(--hairline)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-[52px] w-full max-w-[1440px] items-center justify-between gap-2 px-3">
          <h1 className="whitespace-nowrap font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
            Pare
            <span
              className="ml-1.5 font-bold"
              style={{ fontSize: '9.5px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}
            >
              Leaders
            </span>
          </h1>
          <JumpNav
            links={JUMPS.filter((j) => (j.id === 'lb-fan' ? fantasy.length > 0 : j.id === 'lb-rookies' ? rookieGroups.length > 0 : true))}
          />
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
        <div className="mx-auto w-full max-w-[1440px] px-3 pt-1">
          {fantasy.length > 0 && <FantasyBoards id="lb-fan" boards={fantasy} label="Fantasy" />}

          {SECTIONS.map(({ key, label, id }) => (
            <BoardSection key={key} id={id} label={label} boards={boards.filter((b) => b.section === key)} />
          ))}

          {rookieGroups.length > 0 && (
            // One wrapper = one jump target, so "R" stays lit through all rookie sections.
            <div id="lb-rookies" style={{ scrollMarginTop: 8 }}>
              <RookiesDivider season={season} />
              {rookieGroups.map(({ key, label, boards: rb }) => (
                <BoardSection key={key} label={label} boards={rb} />
              ))}
            </div>
          )}
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}

function BoardSection({ label, boards, id }: { label: string; boards: LeaderBoard[]; id?: string }) {
  if (boards.length === 0) return null;
  return (
    <section id={id} className="mb-4" style={{ scrollMarginTop: 8 }}>
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

