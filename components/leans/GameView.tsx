/**
 * GameView — the Leans game screen body (G2: A2b-G2-closed / -open, B2-game-line-lean,
 * B2-empty), pure. Order (DECISIONS §4):
 *
 *   FALCONS            RAIDERS       ← MatchupHero (wordmarks, NOT tappable here)
 *   Sun, Oct 25 · 3:05 PM · CBS
 *   ( ⇄ Compare these teams ▾ )      ← glass button; opens Offense + Defense in place
 *   [ Game lines ]                   ← Neon Frame card, rows open in place
 *   MARKET ───────                   ← line movement, no-vig win chance, key numbers, weather (B1)
 *   PROPS ───────                    ← the book's lines for this game: leans first, the rest behind "Show all" (B2)
 *   footer
 */

import { useState, type ReactNode } from 'react';
import { ChevronDown, GitCompareArrows } from 'lucide-react';
import MatchupHero from '@/components/compare/MatchupHero';
import { LIST_CARD } from '@/components/myteam/style';
import type { EvaluatedProp, WhyRow } from '@/lib/leans/evaluate';
import { isLean } from '@/lib/leans/autoProps';
import type { GameLeans, LeagueForm } from '@/lib/leans/gameLean';
import type { GameMarket } from '@/lib/leans/market';
import { formatKickoff, type Matchup } from '@/lib/schedule';
import { getMatchupPalettes } from '@/lib/teamColors';
import GameLinesCard, { type LineKind } from './GameLinesCard';
import LeansFooter from './LeansFooter';
import MarketCard from './MarketCard';
import PropCard from './PropCard';
import { LeansLabel } from './ui';

const noop = () => {};

export function kickoffLine(m: Matchup): string {
  const date = m.kickoff.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const parts = [date, formatKickoff(m.kickoff).time];
  if (m.state === 'in') parts[1] = m.statusDetail || 'Live';
  if (m.state === 'post') parts[1] = 'Final';
  // Upper-case like Home's card label (ESPN sends "Fox", "CBS", "Prime").
  if (m.network && m.state === 'pre') parts.push(m.network.toUpperCase());
  return parts.join(' · ');
}

export interface GameViewProps {
  matchup: Matchup;
  leans: GameLeans | null;
  league: LeagueForm | null;
  openLine: LineKind | null;
  onToggleLine: (k: LineKind) => void;
  statsOpen: boolean;
  onToggleStats: () => void;
  /** The inline Compare pane (container-built; shown while `statsOpen`). */
  compare: ReactNode;
  /** This game's props from the book feed, leans first (GameScreen sorts). */
  props: ReadonlyArray<{ e: EvaluatedProp; why: WhyRow[] }>;
  propsState?: 'loading' | 'ready' | 'error';
  /** Market facts (lib/leans/market.ts); the card hides while null. */
  market?: GameMarket | null;
}

export default function GameView({ matchup, leans, league, openLine, onToggleLine, statsOpen, onToggleStats, compare, props, propsState = 'ready', market = null }: GameViewProps) {
  const { a, b } = getMatchupPalettes(matchup.away.name, matchup.home.name);
  const [showAll, setShowAll] = useState(false);
  const leaning = props.filter(({ e }) => isLean(e));
  const shown = showAll ? props : leaning;
  const hidden = props.length - leaning.length;
  return (
    <div className="flex flex-col" style={{ padding: '2px 12px 0', gap: 8 }}>
      <MatchupHero
        teamA={matchup.away.name}
        teamB={matchup.home.name}
        teamARecord={matchup.awayRecord}
        teamBRecord={matchup.homeRecord}
        paletteA={a}
        paletteB={b}
        allTeams={[]}
        onTeamAChange={noop}
        onTeamBChange={noop}
        size="lg"
        interactive={false}
      />
      <div className="text-center tabular-nums" style={{ marginTop: -4, fontSize: 11, fontWeight: 600, color: 'var(--subtext)', lineHeight: 'normal' }}>
        {kickoffLine(matchup)}
      </div>
      <div className="flex justify-center" style={{ marginTop: -2 }}>
        <button
          type="button"
          onClick={onToggleStats}
          aria-expanded={statsOpen}
          className="inline-flex items-center rounded-full touch-optimized active:opacity-70"
          style={{
            height: 36,
            padding: '0 14px',
            gap: 6,
            background: 'var(--nav-bg)',
            border: '1px solid var(--glass-edge)',
            color: 'var(--gold-bright)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <GitCompareArrows size={15} strokeWidth={2.2} aria-hidden />
          {statsOpen ? 'Hide team stats' : 'Compare these teams'}
          <ChevronDown size={14} strokeWidth={2.6} aria-hidden style={{ transition: 'transform .18s ease', transform: statsOpen ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>

      {statsOpen && <div data-team-stats style={{ margin: '0 -12px' }}>{compare}</div>}

      <GameLinesCard matchup={matchup} leans={leans} league={league} open={openLine} onToggle={onToggleLine} />
      <MarketCard market={market} matchup={matchup} />

      <LeansLabel style={{ margin: '8px 4px -2px' }} note={props.length > 0 ? `${props.length} line${props.length === 1 ? '' : 's'}` : undefined}>
        <span id="props">Props</span>
      </LeansLabel>
      <div className="flex flex-col" style={{ padding: '0 4px', gap: 8 }}>
        {shown.map(({ e, why }) => (
          <PropCard key={e.prop.id} e={e} why={why} />
        ))}
        {props.length > 0 && leaning.length === 0 && !showAll && (
          <p data-props-note style={{ ...LIST_CARD, padding: '12px 14px', fontSize: 12, fontWeight: 600, lineHeight: 1.45, color: 'var(--subtext)' }}>
            No prop leans in this game — the data splits on every posted line.
          </p>
        )}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="flex items-center justify-center touch-optimized active:opacity-70"
            style={{ ...LIST_CARD, minHeight: 44, gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--gold-bright)' }}
          >
            {showAll ? 'Show leans only' : `Show all ${props.length} lines`}
            <ChevronDown size={14} strokeWidth={2.6} aria-hidden style={{ transform: showAll ? 'rotate(180deg)' : 'none' }} />
          </button>
        )}
        {props.length === 0 && (
          <div data-props-empty className="flex flex-col items-center text-center" style={{ ...LIST_CARD, padding: '18px 16px', gap: 8, lineHeight: 'normal' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
              {propsState === 'loading' ? 'Checking prop lines…' : propsState === 'error' ? 'Prop lines didn’t load' : 'No prop lines yet'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)', lineHeight: 1.45 }}>
              {propsState === 'error'
                ? 'Leave and reopen this game in a moment to try again.'
                : 'Lines show up here once books post them — usually a few days before kickoff. Pare checks each one against every game this season.'}
            </span>
          </div>
        )}
      </div>
      <LeansFooter />
    </div>
  );
}
