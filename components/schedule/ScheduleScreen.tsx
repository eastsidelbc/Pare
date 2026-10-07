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
 *
 * INITIAL SNAP:
 *  When ScheduleProvider seeds week N-1 server-side (min = N-1), the DOM starts
 *  at the top showing week N-1. pendingScrollWeek = N, and the mount
 *  useIsoLayoutEffect snaps instantly to week N before the browser paints.
 *  The user lands on the current week and can immediately scroll up to N-1
 *  without a visible flash or jump.
 */

'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// Layout effects must run before paint on the client (scroll restore/anchor),
// but useLayoutEffect warns during SSR — pick the safe one per environment.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { useSchedule, type WeekStatus } from './ScheduleProvider';
import WeekControl from './WeekControl';
import WeekSection from './WeekSection';
import { Star } from 'lucide-react';
import { useFavorites } from '@/components/FavoritesProvider';
import SiteFooter from '@/components/SiteFooter';

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
  } = useSchedule();

  // Header star → Your-teams sheet. Filled gold once at least one team is picked.
  const { teams: favTeams, openSheet } = useFavorites();

  const mainRef = useRef<HTMLElement>(null);
  const sectionEls = useRef<Map<number, HTMLElement>>(new Map());
  const tickingRef = useRef(false);
  const activeWeekRef = useRef(activeWeek);
  activeWeekRef.current = activeWeek;

  // Last scroll offset, to detect direction. The top edge-loader only fires
  // when actually scrolling UP toward the top — never on the first downward
  // touch from the resting seed, which used to yank in the previous week.
  const lastScrollTopRef = useRef(0);

  // Prepend anchoring: captured ONLY on scroll-driven prepends.
  const anchorRef = useRef<{ h: number; t: number } | null>(null);
  const prevMinRef = useRef(min);

  // While a jump is animating, the edge auto-loader is paused so a prepend +
  // anchor can't hijack the scroll and cancel it. Released shortly after
  // scrolling settles.
  const jumpingRef = useRef(false);
  const jumpEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endJumpSoon = useCallback((delay: number) => {
    if (jumpEndTimer.current) clearTimeout(jumpEndTimer.current);
    jumpEndTimer.current = setTimeout(() => {
      jumpingRef.current = false;
    }, delay);
  }, []);

  // Tracks whether the mount useIsoLayoutEffect has already handled the initial
  // snap — so the pendingScrollWeek useEffect doesn't fire smooth on first run.
  const isInitialMount = useRef(true);

  // Captures scroll height after a skeleton prepend so we can correct again
  // when the skeleton inflates into real content (Fix C).
  const postSkeletonScrollHeightRef = useRef<number | null>(null);
  const prevMinStatusRef = useRef<WeekStatus | null>(null);

  // Live scores now poll inside <ScheduleProvider> (layout-mounted) so they
  // keep updating on every screen — Home cards AND the Compare preset pills.

  const registerSection = useCallback((week: number, el: HTMLElement | null) => {
    if (el) sectionEls.current.set(week, el);
    else sectionEls.current.delete(week);
  }, []);

  // On mount: restore a saved scroll offset, OR snap instantly to the pending
  // week (current week N when N-1 is seeded above it). Runs before paint so
  // there is no visible flash of the wrong week.
  useIsoLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    // Navigation restore takes precedence (user is returning from Compare).
    if (scrollTopRef.current > 0) {
      el.scrollTop = scrollTopRef.current;
      return;
    }
    // Initial seed: snap to the current week instantly before first paint.
    if (pendingScrollWeek != null) {
      const node = sectionEls.current.get(pendingScrollWeek);
      if (node) {
        node.scrollIntoView({ block: 'start', behavior: 'instant' });
        isInitialMount.current = false;
        clearPendingScroll();
      }
    }
  }, []);

  // Anchor the scroll when a scroll-driven prepend added content above.
  useIsoLayoutEffect(() => {
    const el = mainRef.current;
    if (el && min < prevMinRef.current && anchorRef.current) {
      const { h, t } = anchorRef.current;
      el.scrollTop = t + (el.scrollHeight - h);
      // Record height at skeleton time so we can correct again when the
      // skeleton inflates to real content (Fix C).
      postSkeletonScrollHeightRef.current = el.scrollHeight;
      anchorRef.current = null;
    }
    prevMinRef.current = min;
  }, [min]);

  // Fix C: when the top week transitions from skeleton→ready, the content
  // grows and the viewport jumps up. Correct by adding the height delta.
  const minWeekStatus = weeks[min]?.status ?? null;
  useIsoLayoutEffect(() => {
    const el = mainRef.current;
    if (
      el &&
      minWeekStatus === 'ready' &&
      prevMinStatusRef.current === 'loading' &&
      postSkeletonScrollHeightRef.current !== null
    ) {
      el.scrollTop += el.scrollHeight - postSkeletonScrollHeightRef.current;
      postSkeletonScrollHeightRef.current = null;
    }
    prevMinStatusRef.current = minWeekStatus;
  }, [minWeekStatus]);

  // Jump (arrows / dropdown) → scroll to the target. On the very first jump
  // (initial mount snap that the useIsoLayoutEffect above didn't catch because
  // WeekSection refs weren't registered in time), use 'instant'. All subsequent
  // jumps use 'smooth'. Retries across a few frames until the section is
  // mounted, then ALWAYS clears the request.
  useEffect(() => {
    if (pendingScrollWeek == null) return;
    let tries = 0;
    let raf = 0;
    const attempt = () => {
      const node = sectionEls.current.get(pendingScrollWeek);
      if (node) {
        const behavior: ScrollBehavior = isInitialMount.current ? 'instant' : 'smooth';
        isInitialMount.current = false;
        if (behavior === 'smooth') {
          jumpingRef.current = true;
          endJumpSoon(700);
        }
        node.scrollIntoView({ block: 'start', behavior });
        clearPendingScroll();
      } else if (tries++ < 20) {
        raf = requestAnimationFrame(attempt); // wait for the section to mount
      } else {
        clearPendingScroll(); // give up cleanly — never leave it stuck
      }
    };
    attempt();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pendingScrollWeek, clearPendingScroll, endJumpSoon]);

  // Release the jump timer on unmount.
  useEffect(() => () => {
    if (jumpEndTimer.current) clearTimeout(jumpEndTimer.current);
  }, []);

  const onScroll = useCallback(() => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    requestAnimationFrame(() => {
      tickingRef.current = false;
      const el = mainRef.current;
      if (!el) return;

      // 1) Remember where we are (for restore across navigation) + direction.
      const prevTop = lastScrollTopRef.current;
      const scrollingUp = el.scrollTop < prevTop;
      lastScrollTopRef.current = el.scrollTop;
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

      // While a jump is animating, pause edge-loading so a prepend/anchor can't
      // hijack the scroll; keep pushing the release out until scrolling settles.
      if (jumpingRef.current) {
        endJumpSoon(150);
        return;
      }

      // 3) Edge → lazy-load neighbor weeks (both self-guard against re-entry).
      if (scrollingUp && el.scrollTop < EDGE_PX) {
        // Guard: only capture anchor ONCE per prepend cycle — overwriting it on
        // every rAF frame during a continuous upward swipe corrupts the delta
        // calculation (Fix B).
        if (!anchorRef.current) {
          anchorRef.current = { h: el.scrollHeight, t: el.scrollTop };
        }
        prependWeek();
      }
      if (el.scrollHeight - el.scrollTop - el.clientHeight < EDGE_PX) {
        appendWeek();
      }
    });
  }, [orderedWeeks, scrollTopRef, setActiveWeek, prependWeek, appendWeek, endJumpSoon]);

  let idxBase = 0;

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'var(--app-h, 100dvh)', background: 'var(--bg-deep)' }}>
      {/* Fixed top bar — Pare (left) + week control (right, replaces season). */}
      <header
        className="flex-none border-b"
        style={{ background: 'var(--bg-deep)', borderColor: 'var(--hairline)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-[52px] w-full max-w-[600px] items-center justify-between px-4">
          <h1 className="font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
            Pare
            <span
              className="ml-1.5 font-bold"
              style={{ fontSize: '9.5px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}
            >
              NFL
            </span>
          </h1>
          <div className="flex items-center" style={{ gap: 2 }}>
            <button
              type="button"
              onClick={openSheet}
              aria-label={favTeams.length ? `Your teams (${favTeams.length})` : 'Pick your teams'}
              className="flex items-center justify-center rounded-full touch-optimized active:opacity-70"
              style={{ width: 44, height: 44 }}
            >
              <Star
                size={20}
                strokeWidth={1.8}
                fill={favTeams.length ? 'currentColor' : 'none'}
                style={{ color: 'var(--gold-bright)' }}
                aria-hidden
              />
            </button>
            <WeekControl
              activeWeek={activeWeek}
              onStep={(dir) => jumpToWeek(activeWeek + dir)}
              onJump={(w) => jumpToWeek(w)}
            />
          </div>
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
                isCurrentWeek={w === currentNflWeek}
              />
            );
          })}
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
