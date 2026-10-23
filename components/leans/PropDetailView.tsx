/**
 * PropDetailView — /leans/prop/[propId] body (B2-prop-lean-over, B2-no-lean), pure.
 * One deep card: the prop card body (PropBody) + "Why — 3 of 3 signals agree" (or
 * "Why no lean — signals split (1 of 3)") with the three checks; "How Pare makes a
 * lean" below it. (Edit line / Remove retired with typed lines, 2026-10-23.) The player row
 * opens the player-vs-defense screen. Under the checks: "Matchup data" (prop engine v2 facts +
 * the defense-vs-role and similar-defenses history rows — info only, no lean).
 */

'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import type { EvaluatedProp, WhyRow } from '@/lib/leans/evaluate';
import type { MatchupData as MatchupDataModel } from '@/lib/leans/matchupData';
import LeansFooter from './LeansFooter';
import MatchupData from './MatchupData';
import { PROP_CARD_STYLE, PropBody } from './PropCard';
import { SignalList } from './ui';

export const playerHref = (playerId: string, gameId: string) =>
  `/leans/player/${encodeURIComponent(playerId)}?game=${encodeURIComponent(gameId)}`;

export interface PropDetailViewProps {
  e: EvaluatedProp;
  why: readonly WhyRow[];
  /** The bundle is still loading (vs. loaded without this player). */
  loading: boolean;
  /** Prop engine v2 data rows; null = not available (no tables yet, anytime TD). */
  data?: MatchupDataModel | null;
}

export default function PropDetailView({ e, why, loading, data = null }: PropDetailViewProps) {
  const [how, setHow] = useState(false);
  const lean = e.lean;
  return (
    <div className="flex flex-col" style={{ padding: '2px 12px 0', gap: 8 }}>
      <div data-prop-detail className="flex flex-col" style={PROP_CARD_STYLE}>
        <PropBody e={e} why={why} nameHref={playerHref(e.prop.playerId, e.prop.gameId)} />
        {lean ? (
          <>
            <SignalList result={lean} />
            {lean.verdict === 'none' && (
              <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.45, color: 'var(--subtext)' }}>{lean.summary}</p>
            )}
            {lean.verdict === 'not-enough' && (
              <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.45, color: 'var(--subtext)' }}>
                {e.prop.playerName} has played {lean.season.games} game{lean.season.games === 1 ? '' : 's'} so far. Pare checks again after his next game.
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)' }}>{loading ? 'Checking the data…' : 'No data for this player yet.'}</p>
        )}
        {data && <MatchupData data={data} side={e.prop.side} opp={e.prop.opp} stat={e.prop.stat} />}
      </div>
      <button
        type="button"
        onClick={() => setHow((v) => !v)}
        aria-expanded={how}
        className="flex items-center justify-center touch-optimized active:opacity-70"
        style={{ gap: 6, minHeight: 44, fontSize: 12, fontWeight: 700, color: 'var(--gold-bright)' }}
      >
        <Info size={14} strokeWidth={2.2} aria-hidden />
        How Pare makes a lean
      </button>
      {how && (
        <div style={{ ...PROP_CARD_STYLE, fontSize: 12, fontWeight: 600, lineHeight: 1.45, color: 'var(--subtext)' }}>
          Pare checks the line three ways: his last 4 games, his whole season, and how many points this defense gives up to
          his position. It shows a lean only when all three point the same way — otherwise “No lean”. Fewer than 4 games
          played: “Not enough games yet”. It’s a read of past data, not a prediction or advice.
        </div>
      )}
      <LeansFooter />
    </div>
  );
}
