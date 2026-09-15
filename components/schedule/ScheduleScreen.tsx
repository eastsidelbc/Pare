/**
 * ScheduleScreen — the Home screen shell + the continuous multi-week scroll.
 *
 * State lives in <ScheduleProvider> (in layout.tsx) so it survives navigation;
 * this component owns only the DOM: the fixed header (Pare + WeekControl), the
 * single scroll region, and the scroll mechanics.
 *
 * Scroll mechanics (one rAF-throttled handler):
 *   • save scroll offset (for restore after navigating away and back);
 *   • detect the in-view week → drives the header label;
 *   • near the top/bottom → lazy-load the neighbor week (append / prepend).
 * Prepending inserts content ABOVE the viewport, so we anchor the scroll (keep
 * the same games under the user's eyes) — but ONLY for scroll-driven prepends,
 * not when the user deliberately jumped there.
 *
 * Respects the global shell rule: header + footer fixed, only this <main>
 * scrolls, no page scroll / bounce.
 */

'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// Layout effects must run before paint on the client (scroll restore/anchor),
// but useLayoutEffect warns during SSR — pick the safe one per environment.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { useSchedule } from './ScheduleProvider';
import WeekControl from './WeekControl';
import WeekSection from './WeekSection';
import { useLiveScores } from '@/lib/hooks/useLiveScores';

/** Distance (px) from an edge at which we start loading the neighbor week. */
const EDGE_PX = 700;
/** Trigger line (px below the scroller top) that decides the "active" week. */
const ACTIVE_BAND = 90;

export default function ScheduleScreen() {
  const {
    weeks,
    orderedWeeks,
    min,
    activeWeek,
    currentNflWeek,
    allMatchups,
    stats,
    openId,
    toggleOpen,
    scrollTopRef,
    pendingScrollWeek,
    clearPendingScroll,
    setActiveWeek,
    appendWeek,
    prependWeek,
    jumpToWeek,
    patchLiveMatchups,
  } = useSchedule();

  const mainRef = useRef<HTMLElement>(null);
  const sectionEls = useRef<Map<number, HTMLElement>>(new Map());
  const tickingRef = useRef(false);
  const activeWeekRef = useRef(activeWeek);
  activeWeekRef.current = activeWeek;

  // Prepend anchoring: captured ONLY on scroll-driven prepends.
  const anchorRef = useRef<{ h: number; t: number } | null>(null);
  const prevMinRef = useRef(min);

  // Live scores — polls the current NFL week while any loaded game is live,
  // and merges by id into the window. Free (direct to ESPN, browser-side).
  useLiveScores(currentNflWeek, allMatchups, patchLiveMatchups);

  const registerSection = useCallback((week: number, el: HTMLElement | null) => {
    if (el) sectionEls.current.set(week, el);
    else sectionEls.current.delete(week);
  }, []);

  // Restore scroll offset on (re)mount — before paint, so there's no flash.
  useIsoLayoutEffect(() => {
    const el = mainRef.current;
    if (el && scrollTopRef.current > 0) el.scrollTop = scrollTopRef.current;
  }, []);

  // Anchor the scroll when a scroll-driven prepend added content above.
  useIsoLayoutEffect(() => {
    const el = mainRef.current;
    if (el && min < prevMinRef.current && anchorRef.current) {
      const { h, t } = anchorRef.current;
      el.scrollTop = t + (el.scrollHeight - h);
      anchorRef.current = null;
    }
    prevMinRef.current = min;
  }, [min]);

  // Scroll to a week the user jumped to, once it's loaded + rendered.
  useEffect(() => {
    if (pendingScrollWeek == null) return;
    const node = sectionEls.current.get(pendingScrollWeek);
    const entry = weeks[pendingScrollWeek];
    if (node && entry && entry.status !== 'loading') {
      node.scrollIntoView({ block: 'start', behavior: 'smooth' });
      clearPendingScroll();
    }
  }, [pendingScrollWeek, weeks, clearPendingScroll]);

  const onScroll = useCallback(() => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    requestAnimationFrame(() => {
      tickingRef.current = false;
      const el = mainRef.current;
      if (!el) return;

      // 1) Remember where we are (for restore across navigation).
      scrollTopRef.current = el.scrollTop;

      // 2) Which week is under the trigger line? (sections are ascending)
      const contTop = el.getBoundingClientRect().top;
      let active = orderedWeeks[0];
      for (const w of orderedWeeks) {
        const node = sectionEls.current.get(w);
        if (!node) continue;
        const top = node.getBoundingClientRect().top - contTop;
        if (top <= ACTIVE_BAND) active = w;
        else break;
      }
      if (active != null && active !== activeWeekRef.current) setActiveWeek(active);

      // 3) Edge → lazy-load neighbor weeks (both self-guard against re-entry).
      if (el.scrollTop < EDGE_PX) {
        anchorRef.current = { h: el.scrollHeight, t: el.scrollTop };
        prependWeek();
      }
      if (el.scrollHeight - el.scrollTop - el.clientHeight < EDGE_PX) {
        appendWeek();
      }
    });
  }, [orderedWeeks, scrollTopRef, setActiveWeek, prependWeek, appendWeek]);

  let idxBase = 0;

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100dvh', background: 'var(--bg)' }}>
      {/* Fixed top bar — Pare (left) + week control (right, replaces season). */}
      <header
        className="flex-none border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-14 w-full max-w-[600px] items-center justify-between px-4">
          <h1 className="font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
            Pare
            <span
              className="ml-1.5 font-bold"
              style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}
            >
              NFL
            </span>
          </h1>
          <WeekControl
            activeWeek={activeWeek}
            onStep={(dir) => jumpToWeek(activeWeek + dir)}
            onJump={(w) => jumpToWeek(w)}
          />
        </div>
      </header>

      {/* The ONLY scroll region. */}
      <main
        ref={mainRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)',
        }}
      >
        <div className="mx-auto w-full max-w-[600px] px-4 pt-4">
          {orderedWeeks.map((w) => {
            const entry = weeks[w];
            if (!entry) return null;
            const base = idxBase;
            idxBase += entry.matchups.length;
            return (
              <WeekSection
                key={w}
                entry={entry}
                indexBase={base}
                openId={openId}
                onToggle={toggleOpen}
                offenseData={stats.offenseData}
                defenseData={stats.defenseData}
                statsLoading={stats.isLoading}
                offenseLoading={stats.isLoadingOffense}
                defenseLoading={stats.isLoadingDefense}
                registerSection={registerSection}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
