/**
 * Debug Trace Helper for Mobile Dropdown Audit
 * 
 * Lightweight, removable probes for diagnosing dropdown positioning issues.
 * Only active when NEXT_PUBLIC_DEBUG_UI=1
 * 
 * Created: 2025-10-09
 * Branch: audit/mobile-dropdowns-2025-10
 * Spec: parescript.txt
 */

/**
 * Timestamped debug logger (only in debug mode)
 */
export const d = (...args: any[]) => {
  if (process.env.NEXT_PUBLIC_DEBUG_UI !== '1') return;
  const ts = new Date().toISOString().slice(11, 23);
  // eslint-disable-next-line no-console
  console.debug(`[UI ${ts}]`, ...args);
};

/**
 * Dump element's bounding box coordinates
 */
export function dumpBox(el: Element | null, tag: string) {
  if (!el || process.env.NEXT_PUBLIC_DEBUG_UI !== '1') return;
  const r = (el as HTMLElement).getBoundingClientRect();
  d(tag, { x: r.x, y: r.y, w: r.width, h: r.height });
}

/**
 * Find first clipping ancestor (overflow, transform, filter, contain, isolation)
 */
export function firstClip(el: HTMLElement | null): HTMLElement | null {
  if (process.env.NEXT_PUBLIC_DEBUG_UI !== '1') return null;
  
  let cur = el?.parentElement ?? null;
  while (cur) {
    const cs = getComputedStyle(cur);
    if (
      cs.overflowX !== 'visible' ||
      cs.overflowY !== 'visible' ||
      cs.transform !== 'none' ||
      cs.filter !== 'none' ||
      cs.contain !== 'none' ||
      cs.isolation !== 'auto'
    ) {
      d('clip-ancestor', {
        node: cur.tagName,
        class: cur.className,
        styles: {
          overflowX: cs.overflowX,
          overflowY: cs.overflowY,
          transform: cs.transform,
          filter: cs.filter,
          contain: cs.contain,
          isolation: cs.isolation
        }
      });
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

/**
 * Dump Floating UI state
 */
export function dumpFloatingState(
  context: any,
  refs: any,
  floatingStyles: any,
  placement: string,
  side: 'teamA' | 'teamB'
) {
  if (process.env.NEXT_PUBLIC_DEBUG_UI !== '1') return;
  
  d('floating:state', {
    side,
    placement,
    isOpen: context.open,
    floatingStyles,
    refElement: refs.reference.current ? 'attached' : 'null',
    floatingElement: refs.floating.current ? 'attached' : 'null'
  });
  
  dumpBox(refs.reference.current, `ref:${side}`);
  dumpBox(refs.floating.current, `menu:${side}:before-update`);
  
  // Check after next animation frame
  requestAnimationFrame(() => {
    dumpBox(refs.floating.current, `menu:${side}:after-update`);
  });
}

/**
 * Dump computed styles of dropdown menu
 */
export function dumpMenuStyles(el: HTMLElement | null, tag: string) {
  if (!el || process.env.NEXT_PUBLIC_DEBUG_UI !== '1') return;
  
  const cs = getComputedStyle(el);
  d(tag, {
    position: cs.position,
    top: cs.top,
    left: cs.left,
    zIndex: cs.zIndex,
    maxHeight: cs.maxHeight,
    transform: cs.transform,
    width: cs.width,
    height: cs.height
  });
}

/**
 * Trace state transitions
 */
export function traceStateChange(
  component: string,
  oldState: any,
  newState: any,
  trigger: string
) {
  if (process.env.NEXT_PUBLIC_DEBUG_UI !== '1') return;
  
  d(`state:${component}`, {
    trigger,
    from: oldState,
    to: newState
  });
}

