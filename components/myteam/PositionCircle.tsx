/**
 * Position circle (design-system §9.4, P4 final mockup): 38px, 11/900 position
 * letters in `--pos-*` on its tint. A FLEX / SFLX starter shows the slot (the
 * real position moves to line 2 as "RB · "). Injury badge on the bottom-RIGHT
 * corner (right −6, bottom −4; 20×17, `--inj-*` fill, dark text, 2px ring).
 */

import type { RosterPlayer } from '@/lib/myteam/types';
import { slotLabel } from '@/lib/myteam/viewModel';
import { INJURY_COLOR, INJURY_LABEL, posColors } from './style';

export default function PositionCircle({ player, size = 38 }: { player: RosterPlayer; size?: number }) {
  const { fg, bg } = posColors(player.position);
  const text = slotLabel(player.slot) ?? player.position ?? '—';
  return (
    <span
      data-poscircle
      className="relative flex flex-none items-center justify-center rounded-full"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: 11, fontWeight: 900, letterSpacing: '-0.01em' }}
    >
      {text}
      {player.injury && (
        <span
          data-injury={player.injury}
          title={INJURY_LABEL[player.injury]}
          aria-label={INJURY_LABEL[player.injury]}
          className="absolute flex items-center justify-center rounded-full"
          style={{
            right: -6,
            bottom: -4,
            minWidth: 20,
            height: 17,
            padding: '0 3px',
            boxSizing: 'border-box',
            background: INJURY_COLOR[player.injury],
            color: 'var(--bg-deep)',
            border: '2px solid var(--card-deep-mid)',
            fontSize: 11,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: 0,
          }}
        >
          {player.injury}
        </span>
      )}
    </span>
  );
}
