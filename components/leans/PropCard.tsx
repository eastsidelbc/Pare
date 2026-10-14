/**
 * PropCard — a saved prop on the game screen (A2b-G2-closed "Props") and the top of
 * the prop detail (B2-prop-lean-over / B2-no-lean). Deep list card (radius 14), 12px
 * padding, 12px gaps:
 *
 *   (RB) Bijan Robinson              YOUR LINE
 *        ATL · @ LV · Rush yds          o85.5
 *   [↑ Data leans OVER]  Over in 3 of last 4 · 4 of 6 this season
 *   ● ● ● ○ ● ●   values + weeks
 *   ▂▄▆█ Great #30  LV allows the 3rd-most RB pts
 *   [ LV allows 132.1 rush yds / game    #29 ]
 *   [ Bijan averages 96.0 rush yds, last 4 — ]
 *
 * `children` = extra rows the detail adds (signals, actions). Card tap → detail.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import PositionCircle from '@/components/myteam/PositionCircle';
import { LIST_CARD } from '@/components/myteam/style';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import { allowsText } from '@/lib/leans/copy';
import type { EvaluatedProp, WhyRow } from '@/lib/leans/evaluate';
import { lineShort, PROP_STAT_LABEL } from '@/lib/leans/format';
import HitDots from './HitDots';
import LeanPill from './LeanPill';
import { circlePlayer, propHref } from './PropRow';
import TierBars from './TierBars';
import { Bolded, LABEL9, WHY_BOX } from './ui';

function pillFor(e: EvaluatedProp) {
  const v = e.lean?.verdict ?? 'none';
  if (v === 'over' || v === 'under') return { verdict: v, text: `Data leans ${v.toUpperCase()}` };
  if (v === 'not-enough') return { verdict: v, text: 'Not enough games yet' };
  return { verdict: 'none' as const, text: e.lean ? 'No lean' : 'Checking the data…' };
}

/** "Over in **3 of last 4** · 4 of 6 this season" for the user's side. */
function hitSummary(e: EvaluatedProp): { lead: string; season: string } | null {
  if (!e.lean) return null;
  const { last, season } = e.lean;
  const over = e.prop.side === 'over';
  const lastN = over ? last.over : last.games - last.over;
  const seasonN = over ? season.over : season.games - season.over;
  const word = e.prop.stat === 'anytime_td' ? (over ? 'TD' : 'No TD') : over ? 'Over' : 'Under';
  return { lead: `${word} in **${lastN} of last ${last.games}**`, season: `${seasonN} of ${season.games} this season` };
}

export function PropBody({ e, why, children }: { e: EvaluatedProp; why: readonly WhyRow[]; children?: ReactNode }) {
  const { prop } = e;
  const pill = pillFor(e);
  const sum = hitSummary(e);
  return (
    <>
      <div className="flex items-center" style={{ gap: 10, lineHeight: 'normal' }}>
        <PositionCircle player={circlePlayer(prop, e.player?.injury ?? null)} />
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{prop.playerName}</div>
          <div className="flex items-center whitespace-nowrap" style={{ marginTop: 3, gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
            <TeamAbbr abbr={prop.team} size={11} />
            <span>
              · {prop.home ? 'vs' : '@'} {prop.opp} · {PROP_STAT_LABEL[prop.stat]}
            </span>
          </div>
        </div>
        <div className="flex-none text-right">
          <div style={LABEL9}>Your line</div>
          <div className="tabular-nums" style={{ marginTop: 2, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
            {lineShort(prop.side, prop.line, prop.stat)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center" style={{ gap: 10, lineHeight: 'normal' }}>
        <LeanPill verdict={pill.verdict} text={pill.text} big />
        {sum && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
            <Bolded text={sum.lead} /> · <span style={{ color: 'var(--subtext)' }}>{sum.season}</span>
          </span>
        )}
      </div>

      {e.lean && e.lean.hits.length > 0 && <HitDots hits={e.lean.hits} side={prop.side} />}

      <TierBars rating={e.rating} note={allowsText(prop.opp, prop.position, e.rating, e.ratingOf)} />

      {why.length > 0 && (
        <dl data-why style={WHY_BOX}>
          {why.map((w, i) => (
            <div
              key={w.label}
              className="flex items-center justify-between"
              style={{ gap: 10, minHeight: 36, padding: '0 10px', borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }}
            >
              <dt style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)' }}>
                <Bolded text={w.label} />
              </dt>
              <dd className="flex-none tabular-nums" style={{ minWidth: 28, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>
                {w.rank}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </>
  );
}

export const PROP_CARD_STYLE = { ...LIST_CARD, padding: 12, gap: 12 } as const;

export default function PropCard({ e, why }: { e: EvaluatedProp; why: readonly WhyRow[] }) {
  return (
    <Link href={propHref(e.prop.id)} data-prop-card className="flex flex-col touch-optimized active:opacity-90" style={PROP_CARD_STYLE}>
      <PropBody e={e} why={why} />
    </Link>
  );
}
