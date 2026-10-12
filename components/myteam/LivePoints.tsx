/**
 * Game-day points (P6, design-system §9.4 "Game day"). Assists the league app,
 * never replaces it: points beside each player's meter (the meter is never
 * hidden), a SMALL starters total in the STARTERS header, no total card, no
 * opponent score. Gold "+N.N" flashes once after a change (`.pare-flash`, none
 * under reduced motion).
 */

import type { LiveState } from '@/lib/myteam/livePoll';
import type { GameState } from '@/lib/schedule';

/** Per-row live info. `state: null` = no game this week (bye) or not on the schedule. */
export interface RowLive {
  state: GameState | null;
  /** ESPN short status, e.g. "Q3 8:12" (live). */
  clock: string;
  points: number | null;
  delta: number | null;
  seq: number;
}

/** Everything the roster screen needs for game day. */
export interface LiveView {
  /** Show the points column (a game of mine has kicked off, or points are loaded). */
  on: boolean;
  polling: boolean;
  allFinal: boolean;
  state: Pick<LiveState, 'points' | 'deltas' | 'seq' | 'stale' | 'updatedAt'>;
  /** Team abbr → this week's game state + clock (from ScheduleProvider, not a second ESPN poll). */
  gameByTeam: ReadonlyMap<string, { state: GameState; clock: string }>;
}

/** Mockup formatting: "17.0", "17.3", "17.32". */
export function formatPoints(n: number): string {
  const cents = Math.round(n * 100);
  return (cents / 100).toFixed(cents % 10 === 0 ? 1 : 2);
}

function Flash({ delta, seq, style }: { delta: number | null; seq: number; style?: React.CSSProperties }) {
  if (!delta || delta <= 0) return null;
  return (
    <span key={seq} data-flash className="pare-flash tabular-nums" style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold-bright)', ...style }}>
      +{delta.toFixed(1)}
    </span>
  );
}

/** 46px points column beside the meter. "—" before kickoff / on bye. */
export function LivePointsCell({ live }: { live: RowLive }) {
  const played = live.state === 'in' || live.state === 'post';
  const text = played && live.points !== null ? formatPoints(live.points) : '—';
  const ink = live.state === 'in' ? 'var(--text)' : live.state === 'post' ? 'color-mix(in srgb, var(--text) 80%, var(--subtext))' : 'var(--subtext)';
  return (
    <span data-live-points className="flex flex-none flex-col items-end" style={{ width: 46, gap: 1 }}>
      <span className="tabular-nums" style={{ fontSize: 15, fontWeight: 800, color: ink }}>
        {text}
      </span>
      <span className="flex" style={{ minHeight: 14 }}>
        {played && <Flash delta={live.delta} seq={live.seq} />}
      </span>
    </span>
  );
}

/** Line-2 status during game week: live dot + clock, "Final", else the kickoff time (caller's fallback). */
export function LiveStatus({ live, kickoff }: { live: RowLive; kickoff: string | null }) {
  if (live.state === 'in') {
    return (
      <span className="flex flex-none items-center" style={{ gap: 5 }}>
        <span aria-hidden className="pare-live-dot" />
        <span style={{ color: 'var(--text)', fontWeight: 800 }}>{live.clock || 'Live'}</span>
      </span>
    );
  }
  if (live.state === 'post') return <span className="flex-none">Final</span>;
  return kickoff ? <span className="flex-none">{kickoff}</span> : null;
}

/** "123.45 PTS" in the STARTERS header — small on purpose (the league app owns the big number). */
export function StartersTotal({ total, delta, seq }: { total: number; delta: number; seq: number }) {
  return (
    <span className="flex items-center" style={{ gap: 6 }}>
      <Flash delta={delta} seq={seq} />
      <span data-starters-total aria-live="polite" className="tabular-nums" style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold-bright)', letterSpacing: 0 }}>
        {total.toFixed(2)} PTS
      </span>
    </span>
  );
}

/** One quiet line under the week bar: LIVE · updated · every 60s / all final / last-good notice. */
export function LiveFreshness({ live }: { live: LiveView }) {
  const { polling, allFinal, state } = live;
  // The update TIME, not "n s ago" — no ticking timer needed to keep it true.
  const at = state.updatedAt !== null
    ? new Date(state.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ')
    : null;
  let text: string;
  if (state.stale) text = `Couldn't update — showing points from ${at ?? 'earlier'}`;
  else if (allFinal) text = 'All games final';
  else if (polling && at) text = `Updated ${at} · every 60s`;
  else if (polling) text = 'Updating every 60s';
  else text = 'No games live right now';
  return (
    <div data-live-freshness className="flex items-center" style={{ gap: 6, paddingTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>
      {polling && !state.stale && (
        <>
          <span aria-hidden className="pare-live-dot" />
          <span style={{ color: 'var(--text)', fontWeight: 800 }}>LIVE</span>
          <span aria-hidden>·</span>
        </>
      )}
      <span>{text}</span>
    </div>
  );
}
