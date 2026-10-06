/**
 * JumpNav — the Leaders header jump capsule (FAN · OFF · DEF · ST · R) with a
 * "you are here" marker (client).
 *
 * Each link is a plain in-page anchor into the page's one scroll region (<main>).
 * The section you're reading wears the glass-toggle active look shared with the bottom
 * nav (sliding gold pill — `ActivePill` 'leaders-jump' — + gold-bright 700 label), and
 * it follows you as you scroll.
 *
 * How "current section" is decided: on scroll (passive, at most once per frame) take the
 * last section whose top has reached the top band of the scroll area; at the very bottom
 * the last section wins (Rookies can be too short to reach the top). Reads 5 rects per
 * frame, no state change unless the section actually changes — so the pill slides only
 * when the section changes, never per scroll frame (§9.8).
 *
 * Tap lock: a tapped link stays lit until the reader scrolls by hand (wheel / touch /
 * key). Otherwise a section too short to reach the top band (e.g. ST above a short
 * Rookies block) would flip to the bottom rule right after the jump, and the pill would
 * slide twice.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { LayoutGroup } from 'framer-motion';
import ActivePill from '@/components/ui/ActivePill';
import { GlassLabel, glassCapsule } from '@/components/ui/glassControl';

export interface JumpLink {
  label: string;
  id: string;
  name: string;
}

/** A section counts as "current" once its top is within this many px of the scroll area's top. */
const ACTIVE_BAND_PX = 64;

export default function JumpNav({ links }: { links: JumpLink[] }) {
  const [active, setActive] = useState(links[0]?.id ?? '');
  const ids = links.map((l) => l.id).join(',');
  const linksRef = useRef(links);
  linksRef.current = links;
  /** True between a link tap and the reader's next manual scroll. */
  const tapLockRef = useRef(false);

  useEffect(() => {
    const sections = linksRef.current
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null);
    const scroller = sections[0]?.closest('main');
    if (!scroller || sections.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      if (tapLockRef.current) return;
      const top = scroller.getBoundingClientRect().top;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      let current = sections[0].id;
      if (atBottom) {
        current = sections[sections.length - 1].id;
      } else {
        for (const s of sections) {
          if (s.getBoundingClientRect().top - top <= ACTIVE_BAND_PX) current = s.id;
          else break;
        }
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const unlock = () => {
      tapLockRef.current = false;
    };

    update();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('wheel', unlock, { passive: true });
    scroller.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('wheel', unlock);
      scroller.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);

  return (
    <LayoutGroup id="leaders-jump">
      <nav aria-label="Jump to section" className="flex flex-none items-center rounded-full" style={glassCapsule}>
        {links.map((l) => {
          const on = l.id === active;
          return (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={() => {
                tapLockRef.current = true;
                setActive(l.id);
              }}
              aria-label={`Jump to ${l.name}`}
              aria-current={on ? 'location' : undefined}
              // 30px drawn, 44px tap area (Apple HIG), at least 30px wide.
              className="pare-hit44 touch-optimized relative flex items-center justify-center rounded-full px-2 active:opacity-70"
              style={{ height: 30, minWidth: 30, fontSize: '11px', textDecoration: 'none' }}
            >
              {on && <ActivePill layoutId="leaders-jump" />}
              <GlassLabel active={on} style={{ letterSpacing: '0.06em' }}>
                {l.label}
              </GlassLabel>
            </a>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
