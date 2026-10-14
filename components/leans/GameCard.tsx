/**
 * GameCard — one game in the Leans list (A2-bets-list): Home's Frame Row card
 * (MatchupCard, untouched, with `odds: null` so the 9px odds leave the centre) +
 * a 3-cell lines row (Spread · Total · Moneyline, 13px) + one 44px lean row,
 * all inside ONE Frame Row frame (1.5px team-color fade, radius 14, subtle G1
 * side glow — design-system §9.1). MatchupCard's own frame is switched off by
 * `.leans-frame-card` (app/globals.css).
 *
 * Tap the card → the game screen. Tap the lean row → the three checks open in place.
 */

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import MatchupCard from '@/components/schedule/MatchupCard';
import { getMatchupPalettes } from '@/lib/teamColors';
import { leanText, moneylineParts, spreadText, totalText } from '@/lib/leans/copy';
import type { GameLeans } from '@/lib/leans/gameLean';
import type { Matchup } from '@/lib/schedule';
import LeanPill from './LeanPill';
import { LABEL9, SignalList } from './ui';

export const gameHref = (id: string) => `/leans/${encodeURIComponent(id)}`;

function LinesRow({ matchup }: { matchup: Matchup }) {
  const ml = moneylineParts(matchup.odds, matchup.away.abbr, matchup.home.abbr);
  const cells: Array<[string, string]> = [
    ['Spread', spreadText(matchup.odds)],
    ['Total', totalText(matchup.odds)],
    ['Moneyline', ml?.main ?? '—'],
  ];
  return (
    <div data-lines className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderTop: '1px solid var(--hairline)' }}>
      {cells.map(([label, value], i) => (
        <div
          key={label}
          className="flex min-w-0 flex-col"
          style={{ gap: 3, padding: '7px 10px 8px', borderLeft: i > 0 ? '1px solid var(--hairline)' : 'none' }}
        >
          <span style={LABEL9}>{label}</span>
          <span className="truncate tabular-nums" style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GameCard({ matchup, leans }: { matchup: Matchup; leans: GameLeans | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { a, b } = useMemo(() => getMatchupPalettes(matchup.away.name, matchup.home.name), [matchup.away.name, matchup.home.name]);
  // Odds leave the card centre in this list only (they live in the lines row).
  const card = useMemo(() => ({ ...matchup, odds: null }), [matchup]);

  const head = leans?.headline;
  const ctx = {
    awayTeam: matchup.away.abbr,
    homeTeam: matchup.home.abbr,
    withNumber: true,
    total: matchup.odds?.overUnder ?? null,
    spreadLine: matchup.odds?.spreadLine ?? null,
  };
  const pill = head
    ? { verdict: head.result.verdict, text: leanText(head.result, { ...ctx, kind: head.line }) }
    : { verdict: leans?.notEnough ? ('not-enough' as const) : ('none' as const), text: leans?.notEnough ? 'Not enough games yet' : 'No lean' };
  const why = leans ? (head ? head.result.short : leans.headlineShort) : 'Checking the data…';
  const detail = head?.result ?? leans?.total ?? null;

  return (
    <div
      style={{
        padding: 1.5,
        borderRadius: 'var(--radius-lg)',
        background: `linear-gradient(90deg, ${a.line}, var(--frame-mid) 50%, ${b.line})`,
        boxShadow: `-9px 0 14px -10px rgba(${a.rgb}, 0.25), 9px 0 14px -10px rgba(${b.rgb}, 0.25)`,
      }}
    >
      <div
        className="overflow-hidden"
        style={{
          borderRadius: 'calc(var(--radius-lg) - 1.5px)',
          background: 'linear-gradient(90deg, var(--card-deep-a), var(--card-deep-mid) 50%, var(--card-deep-b))',
        }}
      >
        <div className="leans-frame-card">
          <MatchupCard matchup={card} onToggle={() => router.push(gameHref(matchup.id))} />
        </div>
        <LinesRow matchup={matchup} />
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          disabled={!leans}
          className="flex w-full items-center text-left touch-optimized active:opacity-80"
          style={{ gap: 8, minHeight: 44, padding: '0 10px 0 12px', borderTop: '1px solid var(--hairline)' }}
        >
          <LeanPill verdict={pill.verdict} text={pill.text} />
          <span className="min-w-0 flex-1 truncate" style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
            {why}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2.4}
            aria-hidden
            style={{ flex: 'none', color: 'var(--gold-bright)', transition: 'transform .18s ease', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </button>
        {open && detail && (
          <div style={{ padding: '0 12px 12px' }}>
            <SignalList result={detail} />
          </div>
        )}
      </div>
    </div>
  );
}
