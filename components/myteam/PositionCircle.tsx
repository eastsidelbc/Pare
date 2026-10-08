/**
 * Position circle (design-system §9.4): 38px, position letters in `--pos-*` on
 * its tint. A FLEX / SFLX starter shows the slot in the player's position color
 * (the real position moves to the row's line 2). Injury letter badge on the
 * corner (`--inj-*` fill, `--bg-deep` text).
 */

import type { RosterPlayer } from '@/lib/myteam/types';
import { slotLabel } from '@/lib/myteam/viewModel';
import { INJURY_COLOR, INJURY_LABEL, posColors } from './style';

export default function PositionCircle({ player, size = 38 }: { player: RosterPlayer; size?: number }) {
  const { fg, bg } = posColors(player.position);
  const text = slotLabel(player.slot) ?? player.position ?? '—';
  return (
    <span className="relative flex-none" style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{ background: bg, color: fg, fontSize: text.length > 3 ? 10 : 12, fontWeight: 900, letterSpacing: '0.02em' }}
      >
        {text}
      </span>
      {player.injury && (
        <span
          data-injury={player.injury}
          title={INJURY_LABEL[player.injury]}
          aria-label={INJURY_LABEL[player.injury]}
          className="absolute flex items-center justify-center rounded-full"
          style={{
            right: -4,
            bottom: -3,
            minWidth: 17,
            height: 17,
            padding: '0 3px',
            background: INJURY_COLOR[player.injury],
            color: 'var(--bg-deep)',
            border: '2px solid var(--card-deep-mid)',
            fontSize: 9,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {player.injury}
        </span>
      )}
    </span>
  );
}
