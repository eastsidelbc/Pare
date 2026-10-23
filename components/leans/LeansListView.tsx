/**
 * LeansListView — the Leans list body (A2-bets-list / A2b-bets-list-saved), pure:
 * everything arrives as props (LeansScreen fetches). One 8px-gap column, 16px gutter:
 *
 *   PROP LEANS ───── 2 this week     ← book-line props that lean (B2, 2026-10-23), or a quiet note
 *   SUNDAY, OCT 25 ───────────────   ← day groups of GameCards
 *   21+ · Info only, not betting advice · Gambling problem? 1-800-GAMBLER
 */

import { LIST_CARD } from '@/components/myteam/style';
import type { EvaluatedProp } from '@/lib/leans/evaluate';
import type { GameLeans } from '@/lib/leans/gameLean';
import { LEANS_RECORD, recordText } from '@/lib/leans/record';
import type { Matchup } from '@/lib/schedule';
import MatchupCardSkeleton from '@/components/schedule/MatchupCardSkeleton';
import GameCard from './GameCard';
import LeansFooter from './LeansFooter';
import PropRow from './PropRow';
import { LeansLabel } from './ui';
import type { WeekGamesStatus } from './useWeekGames';

export interface DayGroup {
  label: string;
  games: Array<{ matchup: Matchup; leans: GameLeans | null }>;
}

export function groupByDay<T extends { matchup: Matchup }>(items: readonly T[]): Array<{ label: string; games: T[] }> {
  const out: Array<{ label: string; games: T[] }> = [];
  for (const it of items) {
    const label = it.matchup.kickoff.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const g = out.find((x) => x.label === label);
    if (g) g.games.push(it);
    else out.push({ label, games: [it] });
  }
  return out;
}

export interface LeansListViewProps {
  week: number;
  status: WeekGamesStatus;
  groups: DayGroup[];
  /** Props that lean (over / under) across the week's games. */
  props: EvaluatedProp[];
  propsState: 'loading' | 'ready' | 'error';
}

export default function LeansListView({ week, status, groups, props, propsState }: LeansListViewProps) {
  return (
    <div className="flex flex-col px-4" style={{ paddingTop: 14, gap: 8 }}>
      <LeansLabel style={{ margin: 0 }} note={props.length > 0 ? `${props.length} this week` : undefined}>
        Prop leans
      </LeansLabel>
      {props.length > 0 ? (
        <div data-props className="overflow-hidden" style={LIST_CARD}>
          {props.map((e, i) => (
            <PropRow key={e.prop.id} e={e} first={i === 0} />
          ))}
        </div>
      ) : (
        <p data-props-note style={{ ...LIST_CARD, padding: '12px 14px', fontSize: 12, fontWeight: 600, lineHeight: 1.45, color: 'var(--subtext)' }}>
          {propsState === 'loading'
            ? 'Checking this week’s prop lines…'
            : propsState === 'error'
              ? 'Prop lines didn’t load. Open a game to try again.'
              : 'No prop leans this week yet. Pare checks every posted line — open a game to see them all.'}
        </p>
      )}

      <p data-props-record style={{ margin: '0 4px', fontSize: 10.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--muted)' }}>
        How prop leans did on past seasons (book opening lines; return at the book’s prices): {recordText(LEANS_RECORD.props)}. Treat them as a read of the data, not an edge.
      </p>

      {status === 'loading' &&
        Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 18 : 0 }}>
            <MatchupCardSkeleton />
          </div>
        ))}

      {status === 'empty' && (
        <div
          className="flex flex-col items-center text-center"
          style={{ ...LIST_CARD, marginTop: 10, gap: 8, padding: '40px 24px' }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>No games this week</div>
          <div style={{ fontSize: 12, color: 'var(--subtext)' }}>Nothing scheduled for Week {week}.</div>
        </div>
      )}

      {status === 'ready' &&
        groups.map((g) => (
          <section key={g.label} className="contents">
            <LeansLabel style={{ margin: '10px 0 0' }}>{g.label}</LeansLabel>
            {g.games.map(({ matchup, leans }) => (
              <GameCard key={matchup.id} matchup={matchup} leans={leans} />
            ))}
          </section>
        ))}

      <LeansFooter />
    </div>
  );
}
