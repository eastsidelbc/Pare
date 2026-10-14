/**
 * AddLineSheet — "ADD A PROP LINE" (B2-add-line). BottomSheet recipe:
 *
 *   (RB) Bijan Robinson · ATL · @ LV                 Change
 *   STAT  [Rush yds] [Rec yds] [Receptions] [Rush + rec yds] [Anytime TD]
 *   LINE FROM YOUR BOOK [ 85.5 ]            ( Over | Under )   ← glass toggle
 *   ○ ● ● ○ ● ●   hit dots, live as you type
 *   Over in 3 of last 4 · 4 of 6 this season (updates as you type)
 *   [ Save & check the data ]
 *   Pare never sees your sportsbook. The line stays on this device.
 *
 * Saving writes to this device only (lib/leans/propStore.ts) — nothing is sent.
 * Edit mode (`initial`) keeps the prop id and the player.
 */

'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { LayoutGroup } from 'framer-motion';
import ActivePill from '@/components/ui/ActivePill';
import BottomSheet from '@/components/ui/BottomSheet';
import { GlassLabel, glassCapsule } from '@/components/ui/glassControl';
import PositionCircle from '@/components/myteam/PositionCircle';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import { LEAN_CONFIG } from '@/lib/leans/config';
import { gamesBefore } from '@/lib/leans/evaluate';
import { PROP_STAT_LABEL } from '@/lib/leans/format';
import { propHits } from '@/lib/leans/propLean';
import { newPropId, saveProp } from '@/lib/leans/propStore';
import type { LeansPlayer, PropSide, PropStat, SavedProp } from '@/lib/leans/types';
import type { Matchup } from '@/lib/schedule';
import HitDots from './HitDots';
import LeansFooter from './LeansFooter';
import { circlePlayer } from './PropRow';
import SheetHeader from './SheetHeader';
import { Bolded, LABEL9 } from './ui';

const STATS: readonly PropStat[] = ['rush_yd', 'rec_yd', 'rec', 'rush_rec_yd', 'anytime_td'];

/** Default stat by position: RB rush yds, WR/TE rec yds, QB rush yds. */
const defaultStat = (p: LeansPlayer | null): PropStat => (p?.position === 'WR' || p?.position === 'TE' ? 'rec_yd' : 'rush_yd');

/** A typed line → number, or null while it isn't a usable line (0 < line < 1000). */
export function parseLine(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && n < 1000 ? n : null;
}

export interface AddLineSheetProps {
  open: boolean;
  onClose: () => void;
  matchup: Matchup;
  player: LeansPlayer | null;
  /** Opens the player picker (hidden when editing). */
  onChangePlayer: () => void;
  /** Edit an existing prop (same id, same player). */
  initial?: SavedProp | null;
  onSaved: (prop: SavedProp) => void;
}

export default function AddLineSheet({ open, onClose, matchup, player, onChangePlayer, initial = null, onSaved }: AddLineSheetProps) {
  const fieldId = useId();
  const [stat, setStat] = useState<PropStat>(initial?.stat ?? defaultStat(player));
  const [side, setSide] = useState<PropSide>(initial?.side ?? 'over');
  const [raw, setRaw] = useState(initial ? String(initial.line) : '');
  const [failed, setFailed] = useState(false);

  // A new player (picker) resets the stat to his position's default; editing keeps the saved one.
  useEffect(() => {
    if (!initial) setStat(defaultStat(player));
  }, [player, initial]);
  useEffect(() => {
    if (open && initial) {
      setStat(initial.stat);
      setSide(initial.side);
      setRaw(String(initial.line));
    }
    if (open) setFailed(false);
  }, [open, initial]);

  const td = stat === 'anytime_td';
  const line = td ? LEAN_CONFIG.prop.anytimeTdLine : parseLine(raw);
  const hits = useMemo(
    () => (player && line != null ? propHits(gamesBefore(player, matchup.week), stat, line) : []),
    [player, line, stat, matchup.week],
  );
  const lastHits = hits.slice(-LEAN_CONFIG.lastN);
  const count = (list: typeof hits) => list.filter((h) => (side === 'over' ? h.over : !h.over)).length;
  const word = td ? (side === 'over' ? 'TD' : 'No TD') : side === 'over' ? 'Over' : 'Under';

  const team = player?.team ?? '';
  const home = team === matchup.home.abbr;
  const opp = home ? matchup.away.abbr : matchup.home.abbr;

  const save = () => {
    if (!player || line == null) return;
    const prop: SavedProp = {
      id: initial?.id ?? newPropId(),
      gameId: matchup.id,
      week: matchup.week,
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      team,
      opp,
      home,
      stat,
      side,
      line,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    if (saveProp(prop)) onSaved(prop);
    else setFailed(true);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Add a prop line"
      grab="header"
      header={<SheetHeader title={initial ? 'Edit prop line' : 'Add a prop line'} onClose={onClose} />}
      style={{ maxHeight: 'calc(var(--app-h, 100dvh) - 40px)' }}
    >
      <div className="overflow-y-auto" style={{ padding: '0 16px calc(env(safe-area-inset-bottom) + 16px)', overscrollBehavior: 'contain', lineHeight: 'normal' }}>
        <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
          {player ? (
            <>
              <PositionCircle player={circlePlayer({ playerId: player.id, playerName: player.name, position: player.position, team }, player.injury)} />
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{player.name}</div>
                <div className="flex items-center" style={{ marginTop: 2, gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
                  <TeamAbbr abbr={team} size={11} />
                  <span>· {home ? 'vs' : '@'} {opp}</span>
                </div>
              </div>
            </>
          ) : (
            <span className="flex-1" style={{ fontSize: 14, fontWeight: 700, color: 'var(--subtext)' }}>Pick a player from this game</span>
          )}
          {!initial && (
            <button
              type="button"
              onClick={onChangePlayer}
              className="pare-hit44 touch-optimized active:opacity-70"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-bright)' }}
            >
              {player ? 'Change' : 'Pick'}
            </button>
          )}
        </div>

        <div style={{ ...LABEL9, marginBottom: 6 }}>Stat</div>
        <div role="radiogroup" aria-label="Stat" className="flex flex-wrap" style={{ gap: 6, marginBottom: 12 }}>
          {STATS.map((s) => {
            const on = s === stat;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setStat(s)}
                className="pare-hit44 inline-flex items-center whitespace-nowrap rounded-full touch-optimized active:opacity-70"
                style={{
                  height: 32,
                  padding: '0 11px',
                  border: '1px solid var(--glass-edge)',
                  background: on ? 'color-mix(in srgb, var(--gold-bright) 8%, transparent)' : 'var(--nav-bg)',
                  boxShadow: on ? 'inset 0 0 0 1.5px var(--gold-bright)' : 'none',
                  color: on ? 'var(--gold-bright)' : 'var(--glass-off)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {PROP_STAT_LABEL[s]}
              </button>
            );
          })}
        </div>

        <div className="flex items-end" style={{ gap: 10, marginBottom: 10 }}>
          <div className="min-w-0 flex-1">
            <label htmlFor={fieldId} style={{ ...LABEL9, display: 'block', marginBottom: 6 }}>
              {td ? 'Line (1+ TD)' : 'Line from your book'}
            </label>
            <input
              id={fieldId}
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              placeholder={td ? '0.5' : 'e.g. 85.5'}
              value={td ? String(LEAN_CONFIG.prop.anytimeTdLine) : raw}
              disabled={td}
              onChange={(e) => setRaw(e.target.value)}
              className="w-full tabular-nums outline-none"
              style={{
                height: 48,
                padding: '0 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--seed-edge)',
                background: 'var(--nav-bg)',
                color: 'var(--text)',
                fontSize: 16,
                fontWeight: 800,
                opacity: td ? 0.7 : 1,
              }}
            />
          </div>
          <LayoutGroup id="leans-side">
            <div role="group" aria-label="Over or under" className="flex flex-none items-center rounded-full" style={glassCapsule}>
              {(['over', 'under'] as const).map((s) => {
                const on = s === side;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSide(s)}
                    className="pare-hit44 touch-optimized relative rounded-full active:opacity-70"
                    style={{ height: 30, padding: '0 13px', fontSize: '11.5px' }}
                  >
                    {on && <ActivePill layoutId="leans-side" />}
                    <GlassLabel active={on}>{s === 'over' ? 'Over' : 'Under'}</GlassLabel>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        <div className="flex items-center" style={{ minHeight: 36, marginBottom: 12 }}>
          {hits.length > 0 ? (
            <div className="flex-1">
              <HitDots hits={hits} side={side} />
            </div>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--subtext)' }}>
              {player ? (line == null ? 'Type the line to see his games' : 'No games played yet') : 'Pick a player to see his games'}
            </span>
          )}
        </div>
        {hits.length > 0 && (
          <div aria-live="polite" style={{ margin: '-4px 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
            <Bolded text={`${word} in **${count(lastHits)} of last ${lastHits.length}**`} /> ·{' '}
            <span style={{ color: 'var(--subtext)' }}>
              {count(hits)} of {hits.length} this season
            </span>{' '}
            <span style={{ color: 'var(--subtext)', fontWeight: 600 }}>(updates as you type)</span>
          </div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={!player || line == null}
          className="flex w-full items-center justify-center touch-optimized active:opacity-80"
          style={{
            gap: 8,
            height: 48,
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--gold-bright)',
            background: 'color-mix(in srgb, var(--gold-bright) 10%, transparent)',
            color: 'var(--gold-bright)',
            fontSize: 15,
            fontWeight: 800,
            opacity: !player || line == null ? 0.45 : 1,
          }}
        >
          Save &amp; check the data
        </button>
        {failed && (
          <p role="alert" style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--red)', textAlign: 'center' }}>
            Couldn&apos;t save on this device (private browsing or storage full).
          </p>
        )}
        <p style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: 'var(--subtext)', textAlign: 'center' }}>
          Pare never sees your sportsbook. The line stays on this device.
        </p>
        <LeansFooter />
      </div>
    </BottomSheet>
  );
}
