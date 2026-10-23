/**
 * PlayerVsDefenseView — /leans/player/[playerId] body (B1-player-vs-defense), pure.
 * The matchup only (no lean here), in the Fantasy tab's expanded-row language:
 *
 *   (RB) Bijan Robinson · ATL · RB · Week 7 @ LV · Sun 3:05 PM
 *   WEEK 7 Oct 22 – Oct 26                     ( Season | Last 4 )
 *   [ ▂▄▆█ Great #30 | LV allows the 3rd-most RB pts / 29.6 PPR pts/g to RBs · #30 of 32
 *     why-stats ("Rush yds / game  132.1  #29")
 *     BIJAN · RUSH YDS, LAST 4   neutral --subtext bars (team color = identity, tier = matchup)
 *     NEXT 5 WEEKS               My Team week cells ]
 *   [ + Check a prop line for Bijan › ]
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { MatchupMeter, WeekCells } from '@/components/myteam/MatchupMeter';
import PositionCircle from '@/components/myteam/PositionCircle';
import { kickoffText, LIST_CARD, positionPlural, tierColor } from '@/components/myteam/style';
import WindowToggle from '@/components/myteam/WindowToggle';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import type { WhyStat } from '@/lib/myteam/defenseProfile';
import type { MatchupRating } from '@/lib/myteam/rating';
import type { RatingWindow } from '@/lib/myteam/types';
import type { MatchupCell } from '@/lib/myteam/viewModel';
import { allowsText } from '@/lib/leans/copy';
import { rankLabel } from '@/lib/leans/format';
import type { LeansPlayer } from '@/lib/leans/types';
import type { Matchup } from '@/lib/schedule';
import LeansFooter from './LeansFooter';
import { circlePlayer } from './PropRow';
import { LABEL9, WhyList } from './ui';

export interface PlayerVsDefenseViewProps {
  player: LeansPlayer;
  matchup: Matchup;
  window: RatingWindow;
  onWindow: (w: RatingWindow) => void;
  rating: MatchupRating | null;
  /** Teams ranked (for "#30 of 32", "3rd-most"). */
  of: number;
  why: readonly WhyStat[];
  /** The game week + the next weeks (game week first). */
  cells: readonly MatchupCell[];
  weekRange: string | null;
  /** Last-4 bars: the position's main stat. */
  bars: { label: string; games: ReadonlyArray<{ week: number; value: number }> };
  /** The game screen's Props section (book lines for this game). */
  propsHref: string;
}

const statValue = (s: WhyStat) => (Number.isFinite(s.value) ? s.value.toFixed(1) : '—');

/** Neutral bars (§9.5: team color is identity, tier colors mean matchup — bars are neither). */
function LastBars({ games }: { games: PlayerVsDefenseViewProps['bars']['games'] }) {
  const max = Math.max(1, ...games.map((g) => g.value));
  return (
    <div data-bars className="flex items-end" style={{ gap: 8, height: 100 }}>
      {games.map((g) => (
        <span key={g.week} className="flex flex-1 flex-col items-center" style={{ gap: 3, lineHeight: 'normal' }}>
          <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>{g.value}</span>
          <span
            aria-hidden
            style={{
              width: '100%',
              maxWidth: 44,
              height: Math.max(2, Math.round((Math.max(0, g.value) / max) * 55)),
              borderRadius: '6px 6px 2px 2px',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--subtext) 55%, transparent), color-mix(in srgb, var(--subtext) 18%, transparent))',
              border: '1px solid color-mix(in srgb, var(--subtext) 50%, transparent)',
            }}
          />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--subtext)' }}>W{g.week}</span>
        </span>
      ))}
    </div>
  );
}

export default function PlayerVsDefenseView({ player, matchup, window, onWindow, rating, of, why, cells, weekRange, bars, propsHref }: PlayerVsDefenseViewProps) {
  const home = player.team === matchup.home.abbr;
  const opp = home ? matchup.away.abbr : matchup.home.abbr;
  const first = player.name.split(/\s+/)[0];
  const gameCell = cells[0];
  return (
    <div className="flex flex-col" style={{ padding: '2px 12px 0', gap: 8 }}>
      <div className="flex items-center" style={{ ...LIST_CARD, padding: 12, gap: 12, lineHeight: 'normal' }}>
        <PositionCircle player={circlePlayer({ playerId: player.id, playerName: player.name, position: player.position, team: player.team }, player.injury)} />
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)' }}>{player.name}</div>
          <div className="flex flex-wrap items-center" style={{ marginTop: 3, gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--subtext)' }}>
            <TeamAbbr abbr={player.team} size={12} />
            <span>
              · {player.position} · Week {matchup.week} {home ? 'vs' : '@'} {opp} · {kickoffText(matchup.kickoff.toISOString())}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ padding: '2px 2px 0', lineHeight: 'normal' }}>
        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', color: 'var(--text)' }}>
          WEEK {matchup.week}{' '}
          {weekRange && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0, color: 'var(--subtext)' }}>{weekRange}</span>}
        </span>
        <WindowToggle value={window} onChange={onWindow} />
      </div>

      <div className="flex flex-col" style={{ ...LIST_CARD, padding: 12, gap: 12 }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          {gameCell && <MatchupMeter cell={gameCell} />}
          <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--subtext)' }}>
            <b style={{ color: 'var(--text)', fontWeight: 800 }}>{allowsText(opp, player.position, rating, of)}</b>
            {rating && (
              <>
                <br />
                <span className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color: tierColor(rating.tier) }}>
                  {rating.perGame.toFixed(1)}
                </span>{' '}
                PPR pts/g to {positionPlural(player.position)} · {rankLabel(rating.rank, rating.isTied)} of {of}
              </>
            )}
          </span>
        </div>

        <WhyList rows={why.map((s) => ({ label: `${s.label} / ${s.unit}`, value: statValue(s), rank: Number.isFinite(s.rank) ? rankLabel(s.rank, s.isTied) : '—' }))} />

        {bars.games.length > 0 && (
          <>
            <div style={LABEL9}>
              {first} · {bars.label}, last {bars.games.length}
            </div>
            <LastBars games={bars.games} />
          </>
        )}

        {cells.length > 0 && (
          <>
            <div style={LABEL9}>Next {cells.length} weeks</div>
            <WeekCells cells={cells} />
          </>
        )}
      </div>

      <Link
        href={propsHref}
        className="flex items-center touch-optimized active:opacity-80"
        style={{
          gap: 8,
          height: 48,
          padding: '0 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--frame-mid)',
          background: 'var(--card-deep-a)',
          color: 'var(--text)',
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        <span>See prop lines for {first}</span>
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden style={{ marginLeft: 'auto', color: 'var(--gold-bright)' }} />
      </Link>
      <LeansFooter />
    </div>
  );
}
