/**
 * GameDetails — the "Game details" fold under a finished game's box score (Wave A,
 * docs/plans/check-datacatalog-md-and-come-vivid-bunny.md). Everything comes from the
 * summary PostGameBox already fetched (`GameSummary.extras`, lib/gameExtras.ts) — no
 * extra request. Collapsed by default so the accordion stays short; opens instantly
 * (no animation at rest, design-system §9.8).
 */

'use client';

import { ChevronDown } from 'lucide-react';
import { Fragment, useId, useState } from 'react';
import type { ExtraLine, GameExtras, ScoringPlay, TeamStatRow } from '@/lib/gameExtras';

const LABEL = { fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--muted)' } as const;

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="mb-1.5 mt-3 uppercase" style={LABEL}>
      {children}
    </div>
  );
}

function Quarters({ x }: { x: GameExtras }) {
  if (!x.quarters) return null;
  const n = Math.max(x.quarters.away.length, x.quarters.home.length);
  const heads = Array.from({ length: n }, (_, i) => (i < 4 ? `Q${i + 1}` : n - 4 > 1 ? `OT${i - 3}` : 'OT'));
  const total = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
  const cols = `44px repeat(${n}, 1fr) 40px`;
  const cell = { fontSize: '11px', color: 'var(--subtext)' } as const;
  const row = (abbr: string, xs: number[]) => (
    <div className="grid tabular-nums" style={{ gridTemplateColumns: cols }}>
      <span style={{ ...cell, color: 'var(--text)', fontWeight: 700 }}>{abbr}</span>
      {heads.map((h, i) => (
        <span key={h} className="text-center" style={cell}>
          {xs[i] ?? 0}
        </span>
      ))}
      <span className="text-right" style={{ ...cell, color: 'var(--text)', fontWeight: 800 }}>
        {total(xs)}
      </span>
    </div>
  );
  return (
    <div>
      <SectionTitle>Scoring by quarter</SectionTitle>
      <div className="grid" style={{ gridTemplateColumns: cols }}>
        <span />
        {heads.map((h) => (
          <span key={h} className="text-center" style={{ ...LABEL, letterSpacing: 0 }}>
            {h}
          </span>
        ))}
        <span className="text-right" style={{ ...LABEL, letterSpacing: 0 }}>
          T
        </span>
      </div>
      {row(x.away, x.quarters.away)}
      {row(x.home, x.quarters.home)}
    </div>
  );
}

const pct = (p: number) => `${Math.round(p * 100)}%`;

/** Home win chance through the game; 50% dashed midline. Static SVG, scales to the card width. */
function WinProb({ x }: { x: GameExtras }) {
  const pts = x.winProb;
  if (pts.length < 2) return null;
  const W = 100;
  const H = 40;
  const path = pts.map((p, i) => `${((i / (pts.length - 1)) * W).toFixed(2)},${((1 - p) * H).toFixed(2)}`).join(' ');
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const label = `${x.home} win chance during the game: low ${pct(lo)}, high ${pct(hi)}, final ${pct(pts[pts.length - 1])}`;
  return (
    <div>
      <SectionTitle>{`${x.home} win chance`}</SectionTitle>
      <div className="flex items-stretch gap-2">
        <div className="flex flex-col justify-between tabular-nums" style={{ fontSize: '9px', color: 'var(--muted)' }}>
          <span>{x.home}</span>
          <span>{x.away}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label} className="block h-10 min-w-0 flex-1">
          <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--hairline)" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
          <polyline points={path} fill="none" stroke="var(--gold)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function TeamStats({ rows, x }: { rows: TeamStatRow[]; x: GameExtras }) {
  if (rows.length === 0) return null;
  const side = (r: TeamStatRow, s: 'away' | 'home') => ({
    fontSize: '11.5px',
    fontWeight: r.better === s ? 800 : 600,
    color: r.better === s ? 'var(--text)' : 'var(--subtext)',
  });
  return (
    <div>
      <SectionTitle>Team stats</SectionTitle>
      <div className="grid tabular-nums" style={{ gridTemplateColumns: '1fr auto 1fr', columnGap: '12px', rowGap: '4px' }}>
        <span style={{ ...LABEL, letterSpacing: 0 }}>{x.away}</span>
        <span />
        <span className="text-right" style={{ ...LABEL, letterSpacing: 0 }}>
          {x.home}
        </span>
        {rows.map((r) => (
          <Fragment key={r.key}>
            <span style={side(r, 'away')}>{r.away}</span>
            <span className="text-center" style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
              {r.label}
            </span>
            <span className="text-right" style={side(r, 'home')}>
              {r.home}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function Scoring({ plays, x }: { plays: ScoringPlay[]; x: GameExtras }) {
  if (plays.length === 0) return null;
  return (
    <div>
      <SectionTitle>Scoring plays</SectionTitle>
      <ol className="space-y-2">
        {plays.map((p, i) => (
          <li key={i} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="tabular-nums" style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 700 }}>
                {`Q${p.quarter} ${p.clock} · ${p.team} ${p.kind}`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--subtext)', lineHeight: 1.35 }}>{p.text}</div>
            </div>
            <span className="flex-none tabular-nums" style={{ fontSize: '11px', color: 'var(--text)', fontWeight: 700 }} aria-label={`${x.away} ${p.away}, ${x.home} ${p.home}`}>
              {`${p.away}–${p.home}`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LineCell({ line, align }: { line: ExtraLine | undefined; align: 'left' | 'right' }) {
  if (!line) return <div />;
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <div className="truncate" style={{ fontSize: '11.5px', color: 'var(--text)', fontWeight: 600 }}>
        <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{line.role}</span> {line.name}
      </div>
      <div className="tabular-nums" style={{ fontSize: '10px', color: 'var(--subtext)', lineHeight: 1.35 }}>
        {line.stat}
      </div>
    </div>
  );
}

function Paired({ title, byTeam, x }: { title: string; byTeam: Record<string, ExtraLine[]>; x: GameExtras }) {
  const a = byTeam[x.away] ?? [];
  const h = byTeam[x.home] ?? [];
  const n = Math.max(a.length, h.length);
  if (n === 0) return null;
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: '24px', rowGap: '6px' }}>
        {Array.from({ length: n }, (_, i) => (
          <Fragment key={i}>
            <LineCell line={a[i]} align="left" />
            <LineCell line={h[i]} align="right" />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default function GameDetails({ extras }: { extras: GameExtras }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const venue = extras.venue
    ? [extras.venue.name, extras.venue.city, extras.venue.turf === null ? null : extras.venue.turf ? 'Turf' : 'Grass'].filter(Boolean).join(' · ')
    : null;
  return (
    <div>
      <button
        type="button"
        className="focus-ring flex w-full items-center justify-center gap-1.5"
        style={{ minHeight: 44, fontSize: '12px', fontWeight: 700, color: 'var(--subtext)' }}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        Game details
        <ChevronDown size={14} aria-hidden style={{ transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <div id={panelId} className="pb-1">
          <Quarters x={extras} />
          <WinProb x={extras} />
          <TeamStats rows={extras.teamStats} x={extras} />
          <Scoring plays={extras.scoring} x={extras} />
          <Paired title="Defense" byTeam={extras.defense} x={extras} />
          <Paired title="Kicking" byTeam={extras.kicking} x={extras} />
          {venue && (
            <p className="mt-3 text-center" style={{ fontSize: '10px', color: 'var(--muted)' }}>
              {venue}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
