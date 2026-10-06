/**
 * JumpNav — the Leaders header jump capsule (FAN · OFF · DEF · ST · R) with a
 * "you are here" marker (client).
 *
 * Each link is a plain in-page anchor into the page's one scroll region (<main>).
 * The section you're reading gets the active look shared by every glass toggle in the
 * app (gold-bright text + 1.5px gold ring + 8% gold), and it follows you as you scroll.
 *
 * How "current section" is decided: on scroll (passive, at most once per frame) take the
 * last section whose top has reached the top band of the scroll area; at the very bottom
 * the last section wins (Rookies can be too short to reach the top). Reads 5 rects per
 * frame, no state change unless the section actually changes. The swap is instant —
 * no animation on a dense screen (§9.8).
 */

'use client';

import { useEffect, useRef, useState } from 'react';

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

  useEffect(() => {
    const sections = linksRef.current
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null);
    const scroller = sections[0]?.closest('main');
    if (!scroller || sections.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
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

    update();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);

  return (
    <nav
      aria-label="Jump to section"
      className="flex flex-none items-center rounded-full"
      style={{ height: 36, padding: 3, gap: 2, background: 'var(--nav-bg)', border: '1px solid var(--glass-edge)' }}
    >
      {links.map((l) => {
        const on = l.id === active;
        return (
          <a
            key={l.id}
            href={`#${l.id}`}
            onClick={() => setActive(l.id)}
            aria-label={`Jump to ${l.name}`}
            aria-current={on ? 'location' : undefined}
            // 30px drawn, 44px tap area (Apple HIG), at least 30px wide.
            className="pare-hit44 touch-optimized flex items-center justify-center rounded-full px-2 font-bold active:opacity-70"
            style={{
              height: 30, minWidth: 30, fontSize: '11px', letterSpacing: '0.06em', textDecoration: 'none',
              color: on ? 'var(--gold-bright)' : 'var(--subtext)',
              background: on ? 'color-mix(in srgb, var(--gold-bright) 8%, transparent)' : 'transparent',
              boxShadow: on ? 'inset 0 0 0 1.5px var(--gold-bright)' : 'none',
            }}
          >
            {l.label}
          </a>
        );
      })}
    </nav>
  );
}
