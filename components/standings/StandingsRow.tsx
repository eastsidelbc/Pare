/**
 * StandingsRow — the shared row recipe for every Standings view (design-system §9.2,
 * Round 3 "R2 · Standards-fixed").
 *
 * One 32px grid row: seed chip + team abbreviation | W | L | (T) | PCT | PF | PA | STRK.
 * Numbers are white + tabular; PF/PA and a losing streak use --subtext (secondary,
 * still ≥ 4.5:1). Team color lives on the abbreviation only (rows stay neutral, §9.5).
 * Static — no animation.
 */

import type { CSSProperties } from 'react';
import type { TeamStanding } from '@/lib/standings';
import { seedKind } from '@/lib/standingsViews';
import { getListTeamColor } from '@/lib/teamColors';

export const ROW_H = 32;

/** Columns: team · W · L · (T) · PCT · PF · PA · STRK. PCT keeps a 38px floor so "1.000" never clips. */
export function rowColumns(showTies: boolean): string {
  return [
    'minmax(64px,1.25fr)',
    'minmax(0,.5fr)',
    'minmax(0,.5fr)',
    ...(showTies ? ['minmax(0,.42fr)'] : []),
    'minmax(38px,1.1fr)',
    'minmax(0,.85fr)',
    'minmax(0,.85fr)',
    'minmax(0,.9fr)',
  ].join(' ');
}

const ROW_BASE: CSSProperties = { paddingLeft: 8, paddingRight: 8, columnGap: 4 };

/** Seed chip: filled = division winner (1–4), outlined = wild card (5–7). Others: blank, or a quiet number when `showOutSeed`. */
export function SeedChip({ seed, showOutSeed = false }: { seed: number | null; showOutSeed?: boolean }) {
  const kind = seedKind(seed);
  const base: CSSProperties = {
    width: 18, height: 18, flex: 'none', borderRadius: 5, display: 'grid', placeItems: 'center',
    fontSize: '10px', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
  };
  if (kind === 'division') return <span style={{ ...base, color: 'var(--text)', background: 'var(--seed-chip)' }}>{seed}</span>;
  if (kind === 'wildcard') return <span style={{ ...base, color: 'var(--subtext)', boxShadow: 'inset 0 0 0 1px var(--seed-edge)' }}>{seed}</span>;
  return (
    <span aria-hidden={!showOutSeed} style={{ ...base, color: showOutSeed && seed != null ? 'var(--subtext)' : 'transparent' }}>
      {seed ?? ''}
    </span>
  );
}

/** Small-caps column header row (10px, --subtext). */
export function HeaderRow({ showTies }: { showTies: boolean }) {
  const cols = ['TEAM', 'W', 'L', ...(showTies ? ['T'] : []), 'PCT', 'PF', 'PA', 'STRK'];
  return (
    <div
      className="grid items-center"
      style={{
        ...ROW_BASE, gridTemplateColumns: rowColumns(showTies), height: 24,
        borderBottom: '1px solid var(--hairline)',
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--subtext)',
      }}
    >
      {cols.map((c, i) => (
        <span key={c} className="whitespace-nowrap" style={{ textAlign: i === 0 ? 'left' : 'center' }}>{c}</span>
      ))}
    </div>
  );
}

function Num({ children, secondary }: { children: React.ReactNode; secondary?: boolean }) {
  return (
    <span
      className="overflow-hidden whitespace-nowrap text-center tabular-nums"
      style={{ fontSize: '12px', fontWeight: secondary ? 600 : 700, color: secondary ? 'var(--subtext)' : 'var(--text)' }}
    >
      {children}
    </span>
  );
}

/** Team abbreviation in its list-safe team color (≥ 4.5:1, lib/teamColors getListTeamColor). */
export function TeamAbbr({ abbr, size = 13 }: { abbr: string; size?: number }) {
  return (
    <span
      className="whitespace-nowrap"
      style={{ fontSize: `${size}px`, fontWeight: 900, lineHeight: 1, letterSpacing: '0.01em', color: getListTeamColor(abbr) ?? 'var(--text)' }}
    >
      {abbr}
    </span>
  );
}

interface TeamRowProps {
  team: TeamStanding;
  showTies: boolean;
  /** Division leader → gold tint (Division view only, §9.2). */
  leader?: boolean;
  /** Conference views show 8–16 as quiet numbers. */
  showOutSeed?: boolean;
  last?: boolean;
}

export function TeamRow({ team: t, showTies, leader = false, showOutSeed = false, last = false }: TeamRowProps) {
  const seedLabel = t.seed == null ? '' : t.seed <= 7 ? `, seed ${t.seed}` : `, seed ${t.seed}, outside the playoffs`;
  return (
    <div
      className="grid items-center"
      aria-label={`${t.name}${seedLabel}: ${t.wins} wins, ${t.losses} losses${t.ties ? `, ${t.ties} ties` : ''}`}
      style={{
        ...ROW_BASE, gridTemplateColumns: rowColumns(showTies), height: ROW_H,
        background: leader ? 'var(--leader-tint)' : 'transparent',
        borderBottom: last ? 'none' : '1px solid var(--hairline)',
      }}
    >
      <div className="flex min-w-0 items-center overflow-hidden" style={{ gap: 6 }}>
        <SeedChip seed={t.seed} showOutSeed={showOutSeed} />
        <TeamAbbr abbr={t.abbr} />
      </div>
      <Num>{t.wins}</Num>
      <Num>{t.losses}</Num>
      {showTies && <Num>{t.ties}</Num>}
      <Num>{t.pct}</Num>
      <Num secondary>{t.pointsFor}</Num>
      <Num secondary>{t.pointsAgainst}</Num>
      <Num secondary={t.streak.startsWith('L')}>{t.streak}</Num>
    </div>
  );
}

/** Deep list card shell + title ("AFC NORTH" with the conference muted). */
export function ListCard({ prefix, title, children }: { prefix?: string; title: string; children: React.ReactNode }) {
  return (
    <div
      className="min-w-0 overflow-hidden"
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--hairline)',
        background: 'linear-gradient(90deg, var(--card-deep-a), var(--card-deep-mid) 50%, var(--card-deep-b))',
      }}
    >
      <h3
        className="px-3"
        style={{
          paddingTop: 9, paddingBottom: 8, borderBottom: '1px solid var(--hairline)',
          fontSize: '10px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)',
        }}
      >
        {prefix && <span style={{ color: 'var(--subtext)', marginRight: 5 }}>{prefix}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}

export function EmptyRows({ children = 'Standings unavailable' }: { children?: React.ReactNode }) {
  return (
    <div className="px-3 py-4 text-center" style={{ fontSize: '12px', color: 'var(--subtext)' }}>
      {children}
    </div>
  );
}

/** "D1 · Gold rule" section label (§9.7). */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2 mt-3 flex items-center gap-2"
      style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}
    >
      {children}
      <span className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
    </div>
  );
}
