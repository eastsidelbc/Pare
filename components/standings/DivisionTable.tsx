/**
 * DivisionTable — one clean standings box for a single division (e.g. "AFC East").
 *
 * ESPN-style columns: Team | W | L | T | PCT | PF | PA | Strk. The division
 * leader (first row, already sorted upstream) gets a subtle gold tint. Styled
 * with the app's design tokens so it matches the schedule / leaders shells.
 *
 * The row is a single grid that fills the card edge-to-edge: the team column
 * flexes to take the left side, the seven stat columns share the rest. Card
 * width is kept tight by the page (see app/standings/page.tsx), so the columns
 * stay close together without any hand-tuned pixel widths.
 */

'use client';

import { motion } from 'framer-motion';
import TeamLogo from '@/components/TeamLogo';
import type { DivisionStandings } from '@/lib/standings';

/** Team column flexes a bit wider than a stat column (room for logo + abbr);
 *  the seven stat columns split the remaining width evenly. */
// W/L/T are 1 digit (narrow); PCT holds "1.000" (needs more room); PF/PA/STRK normal.
const COLS = 'minmax(60px,1.3fr) repeat(3, minmax(0,0.75fr)) minmax(0,1.4fr) repeat(3, minmax(0,1fr))';

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-center tabular-nums"
      style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--muted)' }}
    >
      {children}
    </span>
  );
}

function Stat({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <span
      className="text-center tabular-nums leading-none"
      style={{ fontSize: '12px', fontWeight: 600, color: dim ? 'var(--muted)' : 'var(--text)' }}
    >
      {children}
    </span>
  );
}

export default function DivisionTable({ division }: { division: DivisionStandings }) {
  const { label, teams } = division;

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Division title */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3
          style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)' }}
        >
          {label}
        </h3>
      </div>

      {teams.length === 0 ? (
        <div className="px-3 py-4 text-center" style={{ fontSize: '12px', color: 'var(--muted)' }}>
          Standings unavailable
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div
            className="grid items-center gap-1 px-2 py-1.5 border-b"
            style={{ gridTemplateColumns: COLS, borderColor: 'var(--border)' }}
          >
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--muted)' }}>
              TEAM
            </span>
            <HeaderCell>W</HeaderCell>
            <HeaderCell>L</HeaderCell>
            <HeaderCell>T</HeaderCell>
            <HeaderCell>PCT</HeaderCell>
            <HeaderCell>PF</HeaderCell>
            <HeaderCell>PA</HeaderCell>
            <HeaderCell>STRK</HeaderCell>
          </div>

          {/* Team rows */}
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {teams.map((t, i) => (
              <motion.div
                key={t.abbr}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="grid items-center gap-1 px-2 py-2"
                style={{
                  gridTemplateColumns: COLS,
                  background: i === 0 ? 'color-mix(in srgb, var(--gold) 6%, transparent)' : 'transparent',
                }}
              >
                {/* Team: logo + abbr */}
                <div className="flex min-w-0 items-center gap-2">
                  <TeamLogo teamName={t.name} size="22" />
                  <span
                    className="truncate font-bold tracking-tight"
                    style={{ fontSize: '13px', color: 'var(--text)' }}
                  >
                    {t.abbr}
                  </span>
                </div>
                <Stat>{t.wins}</Stat>
                <Stat>{t.losses}</Stat>
                <Stat dim={t.ties === 0}>{t.ties}</Stat>
                <Stat>{t.pct}</Stat>
                <Stat dim>{t.pointsFor}</Stat>
                <Stat dim>{t.pointsAgainst}</Stat>
                <Stat dim={t.streak.startsWith('L')}>{t.streak}</Stat>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
