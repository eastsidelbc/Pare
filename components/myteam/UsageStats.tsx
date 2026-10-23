/**
 * Usage tiles inside an expanded roster row / pinned card (Wave A2, lib/myteam/usage.ts):
 * league-scored pts/g, floor–ceiling, boom %, snap %, target share, WOPR — over the
 * Season / Last 4 window on the toggle. Tiles without data are left out; nothing renders
 * for K / DEF or a player with no games yet.
 */

import type { UsageMap } from '@/lib/myteam/usage';
import { summarizeUsage } from '@/lib/myteam/usage';
import type { FantasyPosition, RatingWindow } from '@/lib/myteam/types';

interface Tile {
  key: string;
  label: string;
  value: string;
  hint: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const one = (x: number) => x.toFixed(1);

export default function UsageStats({
  playerId,
  position,
  window,
  usage,
  compact = false,
}: {
  playerId: string;
  position: FantasyPosition | null;
  window: RatingWindow;
  usage: UsageMap | undefined;
  compact?: boolean;
}) {
  if (!usage || !position || position === 'K' || position === 'DEF') return null;
  const s = summarizeUsage(usage[playerId], window, position);
  if (s.games === 0) return null;

  const tiles: Tile[] = [];
  if (s.ptsPerGame !== null) tiles.push({ key: 'ppg', label: 'Pts / game', value: one(s.ptsPerGame), hint: `${s.games} game${s.games === 1 ? '' : 's'}` });
  if (s.floor !== null && s.ceiling !== null) tiles.push({ key: 'range', label: 'Floor – ceiling', value: `${one(s.floor)}–${one(s.ceiling)}`, hint: 'low week – high week' });
  if (s.boomPct !== null) tiles.push({ key: 'boom', label: 'Top-12 weeks', value: pct(s.boomPct), hint: `as a ${position}` });
  if (s.snapPct !== null) tiles.push({ key: 'snap', label: 'Snap share', value: pct(s.snapPct), hint: 'of team plays' });
  if (s.targetShare !== null) tiles.push({ key: 'tgt', label: 'Target share', value: pct(s.targetShare), hint: 'of team targets' });
  if (s.wopr !== null) tiles.push({ key: 'wopr', label: 'WOPR', value: s.wopr.toFixed(2), hint: 'targets + air yards' });
  if (tiles.length === 0) return null;

  return (
    <dl
      data-usage
      className="grid"
      aria-label={`Usage, ${window === 'last4' ? 'last 4 games' : 'this season'}`}
      style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--hairline)', background: 'var(--hairline)' }}
    >
      {tiles.map((t, i) => (
        // Odd count: the last tile spans the row, so no empty cell shows the hairline background.
        <div key={t.key} style={{ background: 'var(--nav-bg)', padding: compact ? '6px 10px' : '8px 10px', minHeight: 56, gridColumn: i === tiles.length - 1 && tiles.length % 2 === 1 ? 'span 2' : undefined }}>
          <dt style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{t.label}</dt>
          <dd className="tabular-nums" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
            {t.value}
          </dd>
          <dd style={{ fontSize: 10, fontWeight: 600, color: 'var(--subtext)' }}>{t.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
