/**
 * PlayerPickerSheet — "PICK A PLAYER" (B1-player-picker). BottomSheet recipe (plain
 * dim, no blur). Search box → RESULTS (full name, "ATL · @ LV · Sun 3:05 PM"); below,
 * everyone in this game (both rosters' prop-eligible players) with My Team's matchup
 * meter (MatchupMeter, reused as-is) and injury badge. Tap → the add-a-line sheet.
 */

'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import { MatchupMeter } from '@/components/myteam/MatchupMeter';
import PositionCircle from '@/components/myteam/PositionCircle';
import { LIST_CARD } from '@/components/myteam/style';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import type { MatchupCell } from '@/lib/myteam/viewModel';
import { LEAN_CONFIG } from '@/lib/leans/config';
import { ratingFor } from '@/lib/leans/evaluate';
import type { LeansBundle, LeansPlayer } from '@/lib/leans/types';
import { shortPlayerName } from '@/lib/playerName';
import { formatKickoff, type Matchup } from '@/lib/schedule';
import { circlePlayer } from './PropRow';
import SheetHeader from './SheetHeader';
import { LeansLabel } from './ui';

/** Normalized for search: lower-case, no dots / apostrophes / accents. */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.'’-]/g, '').toLowerCase();

export function matchesQuery(name: string, q: string): boolean {
  const query = norm(q.trim());
  if (!query) return false;
  return norm(name)
    .split(/\s+/)
    .some((part) => part.startsWith(query)) || norm(name).includes(query);
}

function PlayerRow({
  p,
  cell,
  sub,
  full,
  first,
  onPick,
}: {
  p: LeansPlayer;
  cell: MatchupCell;
  sub: string;
  full: boolean;
  first: boolean;
  onPick: (p: LeansPlayer) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(p)}
      aria-label={`${p.name}, ${p.team} ${p.position}`}
      className="flex w-full items-center text-left touch-optimized active:opacity-80"
      style={{ gap: 10, minHeight: full ? 56 : 52, padding: '0 12px', borderTop: first ? 'none' : '1px solid var(--hairline)', lineHeight: 'normal' }}
    >
      <PositionCircle player={circlePlayer({ playerId: p.id, playerName: p.name, position: p.position, team: p.team }, p.injury)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {full ? p.name : shortPlayerName(p.name)}
        </span>
        <span className="flex items-center" style={{ marginTop: 2, gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
          <TeamAbbr abbr={p.team} size={11} />
          <span>· {sub}</span>
        </span>
      </span>
      <MatchupMeter cell={cell} />
    </button>
  );
}

export default function PlayerPickerSheet({
  open,
  onClose,
  matchup,
  bundle,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  matchup: Matchup;
  bundle: LeansBundle | null;
  onPick: (p: LeansPlayer) => void;
}) {
  const [q, setQ] = useState('');
  const away = matchup.away.abbr;
  const home = matchup.home.abbr;
  const players = useMemo(
    () => (bundle?.players ?? []).filter((p) => p.team === away || p.team === home).sort((a, b) => (a.team === b.team ? 0 : a.team === away ? -1 : 1)),
    [bundle, away, home],
  );
  const cells = useMemo(() => {
    const out = new Map<string, MatchupCell>();
    if (!bundle) return out;
    for (const p of players) {
      const isHome = p.team === home;
      const opp = isHome ? away : home;
      const { rating } = ratingFor(bundle, p.position, opp, matchup.week, LEAN_CONFIG.prop.tierWindow);
      out.set(p.id, { week: matchup.week, kind: 'game', opp, home: isHome, kickoff: matchup.kickoff.toISOString(), rating });
    }
    return out;
  }, [bundle, players, home, away, matchup.week, matchup.kickoff]);

  const results = q.trim() ? players.filter((p) => matchesQuery(p.name, q)) : [];
  const { day, time } = formatKickoff(matchup.kickoff);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Pick a player"
      grab="header"
      header={<SheetHeader title="Pick a player" onClose={onClose} />}
      style={{ height: 'min(640px, calc(var(--app-h, 100dvh) - 40px))' }}
    >
      <div className="flex min-h-0 flex-1 flex-col" style={{ padding: '0 16px' }}>
        <label className="flex flex-none items-center" style={{ gap: 8, height: 44, padding: '0 12px', marginBottom: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--nav-bg)' }}>
          <Search size={16} strokeWidth={2.2} aria-hidden style={{ color: 'var(--subtext)' }} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players in this game"
            aria-label="Search players"
            autoComplete="off"
            enterKeyHint="search"
            className="leans-search min-w-0 flex-1 bg-transparent outline-none"
            style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}
          />
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', overscrollBehavior: 'contain' }}>
          {q.trim() !== '' && (
            <>
              <LeansLabel style={{ margin: '4px 0' }}>Results</LeansLabel>
              {results.length > 0 ? (
                <div className="overflow-hidden" style={LIST_CARD}>
                  {results.map((p, i) => {
                    const cell = cells.get(p.id);
                    return cell ? (
                      <PlayerRow key={p.id} p={p} cell={cell} full first={i === 0} sub={`${p.team === home ? 'vs' : '@'} ${p.team === home ? away : home} · ${day} ${time}`} onPick={onPick} />
                    ) : null;
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--subtext)', padding: '6px 2px' }}>No player in this game matches “{q.trim()}”.</p>
              )}
            </>
          )}
          <LeansLabel style={{ margin: '12px 0 4px' }}>
            In this game · {away} @ {home}
          </LeansLabel>
          {players.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--subtext)', padding: '6px 2px' }}>{bundle ? 'No player data for this game yet.' : 'Loading players…'}</p>
          ) : (
            <div className="overflow-hidden" style={LIST_CARD}>
              {players.map((p, i) => {
                const cell = cells.get(p.id);
                return cell ? <PlayerRow key={p.id} p={p} cell={cell} full={false} first={i === 0} sub={p.position} onPick={onPick} /> : null;
              })}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
