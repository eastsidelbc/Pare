/**
 * StormCrackle — the Power Surge effect (Storm Crackle lab, option B·9
 * "web steady, edge flares").
 *
 * Drawn on one team's half of a Compare card when that team is powered
 * (lib/powerSurge). Two layers in the team's color:
 *   B2 plasma web  — faint arcs jumping between drifting points, always on (45%)
 *   B1 edge arcs   — arcs crawling along the card edge, flaring in at random
 *                    for 0.5–1.1 s, then resting 1.5–3.5 s
 * at "Subtle" intensity. A CSS mask fades everything out toward the middle.
 *
 * LOOPS while seen (Kobe's call 2026-10-23 — reverses the Pass 2 "play then
 * settle"; recorded in design-system §9.8). Kept cheap instead:
 *   - one shared rAF for every storm on screen, and a storm only joins it while
 *     its canvas is on screen (IntersectionObserver) → nothing runs off screen
 *   - 30 fps for the first INTRO_S, then 20 fps (arcs re-roll at ~12 Hz anyway)
 *   - skips frames while the tab is hidden or the user is swiping / scrolling
 *     (lib/ambientFx)
 *   - no ctx.shadowBlur (a Gaussian blur per stroke was the costliest call):
 *     the glow is faked with wide, faint strokes under a white core
 *   - node glows are one pre-rendered sprite, edge gradient cached per size
 * prefers-reduced-motion → one still glow, no loop.
 * Purely decorative → aria-hidden, pointer-events none.
 */

'use client';

import { memo, useEffect, useRef } from 'react';
import { boltPoints, type Point } from '@/lib/powerSurge';
import { isAmbientPaused } from '@/lib/ambientFx';

interface StormCrackleProps {
  /** Which half: 'a' = left (team A), 'b' = right (team B, drawn mirrored). */
  side: 'a' | 'b';
  /** Team color as "r, g, b" (BarPalette.rgb). */
  rgb: string;
}

const INTENSITY = 0.6; // "Subtle" from the lab
const WEB_LEVEL = 0.45; // B2 steady level
const INTRO_FPS = 30;
const AMBIENT_FPS = 20;
/** Punchier frame rate for this long after the storm appears (seconds). */
const INTRO_S = 4;
const FADE_S = 0.3;
const NODE_R = 16; // node glow radius (px)

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// ---------------------------------------------------------- shared frame clock
// One requestAnimationFrame drives every visible storm (instead of one each).
type Tick = (now: number) => void;
const ticks = new Set<Tick>();
let rafId = 0;
function runTicks(now: number) {
  ticks.forEach((fn) => fn(now));
  rafId = ticks.size > 0 ? requestAnimationFrame(runTicks) : 0;
}
function subscribeFrame(fn: Tick): () => void {
  ticks.add(fn);
  if (!rafId) rafId = requestAnimationFrame(runTicks);
  return () => {
    ticks.delete(fn);
    if (ticks.size === 0 && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };
}

interface State {
  env: [number, number]; // smoothed [edge, web] levels
  flareOn: boolean;
  flareUntil: number;
  edgeArcs: Point[][];
  edgeNext: number;
  edgeGlow: CanvasGradient | null; // cached per size (reset on resize)
  nodes: { x: number; y: number; vx: number; vy: number }[];
  webArcs: Point[][];
  webNext: number;
}

/** Bolt with a faked glow: two wide faint team-color strokes, a color body, a white core. */
function strokeBolt(ctx: CanvasRenderingContext2D, pts: Point[], rgb: string, a: number, w: number) {
  if (a <= 0.01) return;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = `rgba(${rgb}, ${a * 0.12})`;
  ctx.lineWidth = w * 9;
  ctx.stroke();
  ctx.strokeStyle = `rgba(${rgb}, ${a * 0.3})`;
  ctx.lineWidth = w * 5;
  ctx.stroke();
  ctx.strokeStyle = `rgba(${rgb}, ${a * 0.9})`;
  ctx.lineWidth = w * 2.6;
  ctx.stroke();
  ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** Pre-render the node glow once; frames stamp it with drawImage + globalAlpha. */
function makeGlowSprite(rgb: string, dpr: number): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  const px = Math.ceil(NODE_R * 2 * dpr);
  sprite.width = px;
  sprite.height = px;
  const g = sprite.getContext('2d');
  if (g) {
    const r = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
    r.addColorStop(0, `rgba(${rgb}, 0.35)`);
    r.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = r;
    g.fillRect(0, 0, px, px);
  }
  return sprite;
}

function frame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  dt: number,
  s: State,
  rgb: string,
  sprite: HTMLCanvasElement,
) {
  // Program B·9: steady web, random edge flares.
  if (t > s.flareUntil) {
    s.flareOn = !s.flareOn;
    s.flareUntil = t + (s.flareOn ? rnd(0.5, 1.1) : rnd(1.5, 3.5));
  }
  const k = Math.min(1, dt / FADE_S);
  s.env[0] += ((s.flareOn ? 1 : 0) - s.env[0]) * k;
  s.env[1] += (WEB_LEVEL - s.env[1]) * k;
  const edge = Math.min(1, s.env[0] * INTENSITY * 1.05);
  const web = Math.min(1, s.env[1] * INTENSITY * 1.05);

  // B1 — arcs along the half's outer border (top, outer side, bottom).
  if (edge > 0.02) {
    const per = 2 * (h + w);
    const pt = (u: number): Point => {
      let d = (((u % 1) + 1) % 1) * per;
      if (d < w) return [d, 3];
      d -= w;
      if (d < h) return [3, d];
      d -= h;
      if (d < w) return [d, h - 3];
      d -= w;
      return [3, h - d];
    };
    if (t > s.edgeNext) {
      s.edgeArcs = [];
      for (let i = 0; i < 4; i++) {
        const u = Math.random();
        const [x0, y0] = pt(u);
        const [x1, y1] = pt(u + rnd(0.03, 0.07));
        s.edgeArcs.push(boltPoints(x0, y0, x1, y1, 12, 4));
      }
      s.edgeNext = t + 0.07;
    }
    if (!s.edgeGlow) {
      s.edgeGlow = ctx.createLinearGradient(0, 0, w * 0.4, 0);
      s.edgeGlow.addColorStop(0, `rgba(${rgb}, 0.12)`);
      s.edgeGlow.addColorStop(1, `rgba(${rgb}, 0)`);
    }
    ctx.globalAlpha = edge;
    ctx.fillStyle = s.edgeGlow;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    s.edgeArcs.forEach((p) => strokeBolt(ctx, p, rgb, rnd(0.45, 0.9) * edge, 1));
  }

  // B2 — plasma web between drifting nodes.
  if (s.nodes.length === 0) {
    s.nodes = Array.from({ length: 7 }, () => ({ x: rnd(0, w * 0.8), y: rnd(0, h), vx: rnd(-12, 12), vy: rnd(-12, 12) }));
  }
  for (const n of s.nodes) {
    n.x += n.vx * dt;
    n.y += n.vy * dt;
    if (n.x < 0 || n.x > w * 0.85) n.vx *= -1;
    if (n.y < 0 || n.y > h) n.vy *= -1;
  }
  if (web > 0.02) {
    if (t > s.webNext) {
      s.webArcs = [];
      for (let i = 0; i < 3; i++) {
        const a = s.nodes[Math.floor(rnd(0, s.nodes.length))];
        const b = s.nodes[Math.floor(rnd(0, s.nodes.length))];
        if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < 130) s.webArcs.push(boltPoints(a.x, a.y, b.x, b.y, 16, 4));
      }
      s.webNext = t + 0.09;
    }
    ctx.globalAlpha = web;
    for (const n of s.nodes) ctx.drawImage(sprite, n.x - NODE_R, n.y - NODE_R, NODE_R * 2, NODE_R * 2);
    ctx.globalAlpha = 1;
    s.webArcs.forEach((p) => strokeBolt(ctx, p, rgb, rnd(0.4, 0.8) * web, 0.9));
  }
}

function stillGlow(ctx: CanvasRenderingContext2D, w: number, h: number, rgb: string) {
  const g = ctx.createLinearGradient(0, 0, w * 0.6, 0);
  g.addColorStop(0, `rgba(${rgb}, ${0.22 * INTENSITY})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

const MASK = {
  a: 'linear-gradient(90deg, #000 0%, #000 32%, transparent 100%)',
  b: 'linear-gradient(270deg, #000 0%, #000 32%, transparent 100%)',
} as const;

function StormCrackle({ side, rgb }: StormCrackleProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const s: State = {
      env: [0, 0], flareOn: false, flareUntil: 0, edgeArcs: [], edgeNext: 0, edgeGlow: null,
      nodes: [], webArcs: [], webNext: 0,
    };

    const prepare = () => {
      ctx.setTransform(side === 'b' ? -dpr : dpr, 0, 0, dpr, side === 'b' ? w * dpr : 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    };
    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      s.edgeGlow = null; // gradient spans the old width
      if (reduced && w > 0) {
        prepare();
        stillGlow(ctx, w, h, rgb);
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();
    if (reduced) return () => ro.disconnect();

    const sprite = makeGlowSprite(rgb, dpr);
    const start = performance.now();
    let last = 0;
    let acc = 0;
    const tick = (now: number) => {
      if (!last) {
        last = now;
        return;
      }
      acc += Math.min(0.05, (now - last) / 1000);
      last = now;
      const fps = now - start < INTRO_S * 1000 ? INTRO_FPS : AMBIENT_FPS;
      if (acc < 1 / fps || document.hidden || isAmbientPaused() || w === 0) return;
      prepare();
      // Cap the step so nodes don't jump after a long pause (swipe, hidden tab).
      frame(ctx, w, h, now / 1000, Math.min(acc, 0.1), s, rgb, sprite);
      acc = 0;
    };

    // Join the shared frame clock only while the canvas is on screen.
    let unsubscribe: (() => void) | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !unsubscribe) {
        last = 0;
        unsubscribe = subscribeFrame(tick);
      } else if (!e.isIntersecting && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    });
    io.observe(cv);

    return () => {
      unsubscribe?.();
      io.disconnect();
      ro.disconnect();
    };
  }, [side, rgb]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 z-0"
      style={{
        ...(side === 'a' ? { left: 0, right: '50%' } : { left: '50%', right: 0 }),
        WebkitMaskImage: MASK[side],
        maskImage: MASK[side],
      }}
    >
      <canvas ref={ref} className="block h-full w-full" />
    </div>
  );
}

export default memo(StormCrackle);
