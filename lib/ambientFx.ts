/**
 * Ambient FX gate — pauses the looping Compare effects (#1 bar aura + sparks,
 * Power Surge storm) while the user is moving the screen, so a swipe or scroll
 * gets the whole frame budget. They resume as soon as the motion stops.
 *
 * No React state (nothing re-renders): the gate mirrors itself to
 * `<html data-fx="paused">`, which CSS reads to pause `.pare-fx-loop`
 * animations; canvas loops call `isAmbientPaused()` each frame.
 *
 * Usage: call `pauseAmbientFor(reason)` on every motion event (scroll, track
 * x change). Each call extends the pause; it clears `idleMs` after the last one.
 */

export type AmbientReason = 'swipe' | 'scroll';

/** Quiet time after the last motion event before effects resume (ms). */
export const AMBIENT_IDLE_MS = 150;

const active = new Set<AmbientReason>();
const timers = new Map<AmbientReason, ReturnType<typeof setTimeout>>();

/** Write the gate to <html> — only on a paused ↔ running flip, never per event. */
function sync(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (active.size > 0) root.dataset.fx = 'paused';
  else delete root.dataset.fx;
}

export function isAmbientPaused(): boolean {
  return active.size > 0;
}

/** Pause ambient effects; they resume `idleMs` after the last call for this reason. */
export function pauseAmbientFor(reason: AmbientReason, idleMs = AMBIENT_IDLE_MS): void {
  const wasPaused = active.size > 0;
  active.add(reason);
  if (!wasPaused) sync();
  const prev = timers.get(reason);
  if (prev) clearTimeout(prev);
  timers.set(reason, setTimeout(() => resumeAmbient(reason), idleMs));
}

/** Clear one reason now (e.g. on unmount). Effects run again once no reason is left. */
export function resumeAmbient(reason: AmbientReason): void {
  const t = timers.get(reason);
  if (t) clearTimeout(t);
  timers.delete(reason);
  if (!active.delete(reason)) return;
  if (active.size === 0) sync();
}
