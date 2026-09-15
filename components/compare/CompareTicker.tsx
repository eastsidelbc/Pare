/**
 * CompareTicker — the compare header's center hint, as a horizontal scrolling
 * ticker (marquee). The motion catches the eye so people actually read the tips:
 * tap a logo to swap teams, tap a rank badge for detail. Gold text.
 *
 * Seamless loop: the text is rendered twice and the track slides by exactly one
 * copy (-50%) on repeat. Respects prefers-reduced-motion (static line, no
 * scroll). Soft edge fade so text enters/exits cleanly at the column edges.
 */

'use client';

import { useEffect, useState } from 'react';

const TIPS = ['Tap a team logo to change teams', 'Tap a rank badge for more info'];
const SEP = ' • '; // em-space · bullet · em-space
const TEXT = TIPS.join(SEP) + SEP; // trailing sep = spacing between loop copies
const DURATION_S = 3;

const EDGE_FADE =
  'linear-gradient(90deg, transparent 0, black 10px, black calc(100% - 10px), transparent 100%)';

export default function CompareTicker() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (reduced) {
    return (
      <div className="truncate px-1 text-center" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--gold)' }}>
        Tap logos to change teams · rank badges for info
      </div>
    );
  }

  return (
    <div
      className="relative h-3.5 overflow-hidden"
      style={{ WebkitMaskImage: EDGE_FADE, maskImage: EDGE_FADE }}
    >
      <div
        className="flex h-full items-center whitespace-nowrap will-change-transform"
        style={{
          // Content width (two copies) so translateX(-50%) lands on EXACTLY one
          // copy → seamless loop. Without this the track clamps to the column
          // width and the shift no longer equals a copy, causing a jump.
          width: 'max-content',
          animation: `ticker-marquee ${DURATION_S}s linear infinite`,
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--gold)',
        }}
      >
        <span>{TEXT}</span>
        <span aria-hidden>{TEXT}</span>
      </div>
    </div>
  );
}
