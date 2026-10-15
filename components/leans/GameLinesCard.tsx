/**
 * GameLinesCard — "Game lines" on the game screen (A2b-G2, B2-game-line-lean):
 * a Neon Frame card (2px team-color frame, radius 20, both teams' 34px glows —
 * design-system §8) with three rows, Spread · Total · Moneyline. Each row: label,
 * the line (15/800), its lean pill, and one reason line. Tap a row → it opens in
 * place (5% gold tint): the last-4 numbers behind it + the three checks. One open at
 * a time; the open row trades its one-line reason for the detail.
 */

'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronUp, Info } from 'lucide-react';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import { leanText, moneylineParts, spreadText, totalText } from '@/lib/leans/copy';
import { marginCells, type LineCell } from '@/lib/leans/evaluate';
import { lineFor, type GameLeans, type LeagueForm } from '@/lib/leans/gameLean';
import type { LeanResult } from '@/lib/leans/types';
import type { Matchup } from '@/lib/schedule';
import { getMatchupPalettes } from '@/lib/teamColors';
import LeanPill from './LeanPill';
import { Bolded, LABEL9, SignalList } from './ui';

export type LineKind = 'spread' | 'total' | 'moneyline';

function Cells({ rows, title }: { rows: Array<{ team: string; cells: LineCell[] }>; title: string }) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <div style={LABEL9}>{title}</div>
      <div className="grid items-center" style={{ gap: 4, gridTemplateColumns: '34px repeat(4, minmax(0, 1fr))', fontSize: 12, fontWeight: 800 }}>
        {rows.map(({ team, cells }) => [
          <TeamAbbr key={`${team}-t`} abbr={team} size={12} />,
          ...Array.from({ length: 4 }, (_, i) => {
            const c = cells[i];
            return (
              <span
                key={`${team}-${i}`}
                data-cell={c?.ok ? 'ok' : 'no'}
                className="tabular-nums text-center"
                style={{
                  padding: '6px 0',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--nav-bg)',
                  border: '1px solid var(--hairline)',
                  color: c?.ok ? 'var(--text)' : 'var(--subtext)',
                  lineHeight: 'normal',
                }}
              >
                {c ? `${c.text}${c.ok ? ' ✓' : ''}` : '—'}
              </span>
            );
          }),
        ])}
      </div>
    </div>
  );
}

interface RowProps {
  kind: LineKind;
  label: string;
  value: ReactNode;
  result: LeanResult | null;
  pill: string;
  open: boolean;
  first: boolean;
  onToggle: () => void;
  detail: ReactNode;
}

function LineRow({ kind, label, value, result, pill, open, first, onToggle, detail }: RowProps) {
  return (
    <div
      data-line-row={kind}
      style={{
        borderTop: first ? 'none' : '1px solid var(--hairline)',
        background: open ? 'color-mix(in srgb, var(--gold-bright) 4%, transparent)' : 'transparent',
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        disabled={!result}
        className="block w-full text-left touch-optimized active:opacity-80"
        style={{ padding: open ? '9px 10px 0 12px' : '9px 10px 10px 12px', lineHeight: 'normal' }}
      >
        <div className="flex items-center" style={{ gap: 10, minHeight: 32 }}>
          <div className="min-w-0 flex-1">
            <div style={LABEL9}>{label}</div>
            <div className="whitespace-nowrap tabular-nums" style={{ marginTop: 3, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
              {value}
            </div>
          </div>
          <LeanPill verdict={result?.verdict ?? 'none'} text={result ? pill : '—'} />
          {open && <ChevronUp size={16} strokeWidth={2.4} aria-hidden style={{ color: 'var(--gold-bright)', flex: 'none' }} />}
        </div>
        {!open && result && (
          <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, color: 'var(--subtext)', lineHeight: 1.35 }}>
            <Bolded text={result.summary} />
          </div>
        )}
      </button>
      {open && result && (
        <div className="flex flex-col" style={{ gap: 10, padding: '10px 10px 12px 12px' }}>
          {detail}
          <SignalList result={result} />
        </div>
      )}
    </div>
  );
}

export default function GameLinesCard({
  matchup,
  leans,
  league,
  open,
  onToggle,
}: {
  matchup: Matchup;
  leans: GameLeans | null;
  league: LeagueForm | null;
  open: LineKind | null;
  onToggle: (kind: LineKind) => void;
}) {
  const [note, setNote] = useState(false);
  const { a, b } = useMemo(() => getMatchupPalettes(matchup.away.name, matchup.home.name), [matchup.away.name, matchup.home.name]);
  const away = matchup.away.abbr;
  const home = matchup.home.abbr;
  const odds = matchup.odds;
  const ml = moneylineParts(odds, away, home);
  const ctx = { awayTeam: away, homeTeam: home, total: odds?.overUnder ?? null, spreadLine: odds?.spreadLine ?? null };
  const sl = odds?.spreadLine ?? null;

  const spreadDetail =
    league && leans ? (
      <Cells
        title={`Point margins, last 4 (line ${spreadText(odds)})`}
        rows={[
          { team: away, cells: marginCells(league, away, odds ? lineFor('away', away, home, sl) : null) },
          { team: home, cells: marginCells(league, home, odds ? lineFor('home', away, home, sl) : null) },
        ].map((r) => (leans.spread.readSide === (r.team === away ? 'away' : 'home') ? r : { ...r, cells: r.cells.map((c) => ({ ...c, ok: false })) }))}
      />
    ) : null;
  const totalDetail =
    leans && odds?.overUnder != null ? (
      <Cells
        title={`Game totals, last 4 (line ${odds.overUnder})`}
        rows={(['away', 'home'] as const).map((s) => ({
          team: s === 'away' ? away : home,
          cells: leans.total.cells[s].map((c) => ({ week: c.week, text: String(c.total), ok: leans.total.dir === 'over' ? c.over : c.under })),
        }))}
      />
    ) : null;
  const mlDetail =
    league && leans ? (
      <Cells
        title="Point margins, last 4 (✓ = won)"
        rows={[
          { team: away, cells: marginCells(league, away, null) },
          { team: home, cells: marginCells(league, home, null) },
        ]}
      />
    ) : null;

  return (
    <section
      aria-label="Game lines"
      style={{
        padding: 2,
        borderRadius: 'var(--radius-xl)',
        background: `linear-gradient(90deg, ${a.line}, var(--frame-mid) 50%, ${b.line})`,
        boxShadow: `-12px 4px 34px rgba(${a.rgb}, 0.34), 12px 4px 34px rgba(${b.rgb}, 0.34), var(--shadow-pop)`,
      }}
    >
      <div
        className="overflow-hidden"
        style={{
          borderRadius: 'calc(var(--radius-xl) - 2px)',
          background: 'linear-gradient(90deg, var(--card-deep-a) 0%, var(--card-deep-mid) 50%, var(--card-deep-b) 100%)',
          boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--text) 6%, transparent)',
        }}
      >
        <div className="flex items-center justify-between" style={{ height: 28, padding: '0 6px 0 12px' }}>
          <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)' }}>Game lines</h3>
          <button
            type="button"
            onClick={() => setNote((v) => !v)}
            aria-expanded={note}
            className="pare-hit44 flex items-center touch-optimized active:opacity-70"
            style={{ gap: 4, paddingRight: 6, fontSize: 10, fontWeight: 700, color: 'var(--subtext)' }}
          >
            One line per game <Info size={14} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        {note && (
          <p style={{ margin: '0 12px 8px', fontSize: 11, fontWeight: 600, lineHeight: 1.4, color: 'var(--subtext)' }}>
            Pare shows one line per game, from its data feed. The line you see may differ — that&apos;s what Props are for.
          </p>
        )}
        <LineRow
          kind="spread"
          label="Spread"
          value={spreadText(odds)}
          result={leans?.spread ?? null}
          pill={leans ? leanText(leans.spread, { ...ctx, kind: 'spread', withNumber: true }) : '—'}
          open={open === 'spread'}
          first
          onToggle={() => onToggle('spread')}
          detail={spreadDetail}
        />
        <LineRow
          kind="total"
          label="Total"
          value={totalText(odds)}
          result={leans?.total ?? null}
          pill={leans ? leanText(leans.total, { ...ctx, kind: 'total' }) : '—'}
          open={open === 'total'}
          first={false}
          onToggle={() => onToggle('total')}
          detail={totalDetail}
        />
        <LineRow
          kind="moneyline"
          label="Moneyline"
          value={
            ml ? (
              <>
                {ml.main}
                {ml.other && <small style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}> / {ml.other}</small>}
              </>
            ) : (
              '—'
            )
          }
          result={leans?.moneyline ?? null}
          pill={leans ? leanText(leans.moneyline, { ...ctx, kind: 'moneyline' }) : '—'}
          open={open === 'moneyline'}
          first={false}
          onToggle={() => onToggle('moneyline')}
          detail={mlDetail}
        />
      </div>
    </section>
  );
}

