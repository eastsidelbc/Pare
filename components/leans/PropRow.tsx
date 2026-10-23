/**
 * PropRow — one prop in the Leans list's PROP LEANS card (A2b-bets-list-saved):
 * position circle · name + "▲85.5 rush yds · ATL @ LV" · lean pill over "3 of last 4" · ›.
 * 62px row (My Team row recipe, §9.4). Tap → the prop detail.
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import PositionCircle from '@/components/myteam/PositionCircle';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import { shortPlayerName } from '@/lib/playerName';
import type { EvaluatedProp } from '@/lib/leans/evaluate';
import { PROP_STAT_SHORT } from '@/lib/leans/format';
import { LEAN_CONFIG } from '@/lib/leans/config';
import type { SavedProp } from '@/lib/leans/types';
import type { InjuryTag, RosterPlayer } from '@/lib/myteam/types';
import LeanPill from './LeanPill';
import PropLine from './PropLine';

export const propHref = (id: string) => `/leans/prop/${encodeURIComponent(id)}`;

/** Position circle input from a saved prop (+ the live injury tag when known). */
export function circlePlayer(prop: Pick<SavedProp, 'playerId' | 'playerName' | 'position' | 'team'>, injury: InjuryTag | null = null): RosterPlayer {
  return { playerId: prop.playerId, name: prop.playerName, position: prop.position, nflTeam: prop.team, group: 'starter', slot: null, injury };
}

/** "3 of last 4" for the side shown (the lean's side; over when there's no lean). */
export function lastText(e: EvaluatedProp): string {
  if (!e.lean) return '—';
  const { over, games } = e.lean.last;
  const n = e.prop.side === 'over' ? over : games - over;
  return `${n} of last ${games || LEAN_CONFIG.lastN}`;
}

export function propPill(e: EvaluatedProp): { verdict: Parameters<typeof LeanPill>[0]['verdict']; text: string } {
  const v = e.lean?.verdict;
  if (v === 'over' || v === 'under') return { verdict: v, text: v.toUpperCase() };
  if (v === 'not-enough') return { verdict: v, text: 'Not enough games' };
  return { verdict: 'none', text: 'No lean' };
}

export default function PropRow({ e, first }: { e: EvaluatedProp; first: boolean }) {
  const { prop } = e;
  const pill = propPill(e);
  return (
    <Link
      href={propHref(prop.id)}
      className="flex items-center touch-optimized active:opacity-80"
      style={{ gap: 10, minHeight: 62, padding: '8px 12px', borderTop: first ? 'none' : '1px solid var(--hairline)' }}
    >
      <PositionCircle player={circlePlayer(prop, e.player?.injury ?? null)} />
      <div className="min-w-0 flex-1" style={{ lineHeight: 'normal' }}>
        <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }} title={prop.playerName}>
          {prop.playerName.length > 15 ? shortPlayerName(prop.playerName) : prop.playerName}
        </div>
        <div className="flex items-center whitespace-nowrap" style={{ marginTop: 3, gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
          <b className="inline-flex items-center" style={{ gap: 4, color: 'var(--text)', fontWeight: 800 }}>
            <PropLine side={prop.side} line={prop.line} stat={prop.stat} />
            {prop.stat === 'anytime_td' ? null : <span>{PROP_STAT_SHORT[prop.stat]}</span>}
          </b>
          <span>·</span>
          <TeamAbbr abbr={prop.team} size={11} />
          <span>
            {prop.home ? 'vs' : '@'} {prop.opp}
          </span>
        </div>
      </div>
      <div className="flex flex-none flex-col items-end" style={{ gap: 4, lineHeight: 'normal' }}>
        <LeanPill verdict={pill.verdict} text={pill.text} />
        <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>
          {lastText(e)}
        </span>
      </div>
      <ChevronRight size={16} strokeWidth={2.4} aria-hidden style={{ flex: 'none', color: 'var(--subtext)' }} />
    </Link>
  );
}
