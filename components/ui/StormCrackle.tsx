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
 * Cost control: one small canvas per powered half, ~30 fps, paused while off
 * screen or the tab is hidden. prefers-reduced-motion → one still glow, no loop.
 * PERF (Pass 2): PLAY ON CHANGE, THEN SETTLE — the storm plays for PLAY_S
 * seconds after it mounts (card appears / team swap → new color re-runs the
 * effect), fades out, then leaves the still glow and STOPS the frame loop.
 * Before, it drew forever (~1/3 of the phone's idle CPU in the audit).
 * Purely decorative → aria-hidden, pointer-events none.
 */

'use client';

import { memo, useEffect, useRef } from 'react';
import { boltPoints, type Point } from '@/lib/powerSurge';

interface StormCrackleProps {
  /** Which half: 'a' = left (team A), 'b' = right (team B, drawn mirrored). */
  side: 'a' | 'b';
  /** Team color as "r, g, b" (BarPalette.rgb). */
  rgb: string;
}

const INTENSITY = 0.6; // "Subtle" from the lab
const WEB_LEVEL = 0.45; // B2 steady level
const FPS = 30;
const FADE_S = 0.3;
/** How long the storm plays before settling into the still glow (seconds). */
const PLAY_S = 4;
/** Fade-out time after PLAY_S before the loop stops (seconds). */
const SETTLE_S = 0.6;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface State {
  env: [number, number]; // smoothed [edge, web] levels
  flareOn: boolean;
  flareUntil: number;
  edgeArcs: Point[][];
  edgeNext: number;
  nodes: { x: number; y: number; vx: number; vy: number }[];
  webArcs: Point[][];
  webNext: number;
}

function strokeBolt(ctx: CanvasRenderingContext2D, pts: Point[], rgb: string, a: number, w: number) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.shadowColor = `rgba(${rgb}, ${a})`;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = `rgba(${rgb}, ${a * 0.9})`;
  ctx.lineWidth = w * 2.6;
  ctx.stroke();
  ctx.shadowBlur = 6;
  ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

function frame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  dt: number,
  s: State,
  rgb: string,
  settling = false,
) {
  // Program B·9: steady web, random edge flares. While settling, both fade to 0.
  if (settling) {
    s.flareOn = false;
  } else if (t > s.flareUntil) {
    s.flareOn = !s.flareOn;
    s.flareUntil = t + (s.flareOn ? rnd(0.5, 1.1) : rnd(1.5, 3.5));
  }
  const k = Math.min(1, dt / FADE_S);
  s.env[0] += ((s.flareOn ? 1 : 0) - s.env[0]) * k;
  s.env[1] += ((settling ? 0 : WEB_LEVEL) - s.env[1]) * k;
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
    const g = ctx.createLinearGradient(0, 0, w * 0.4, 0);
    g.addColorStop(0, `rgba(${rgb}, ${0.12 * edge})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
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
    for (const n of s.nodes) {
      const r = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 16);
      r.addColorStop(0, `rgba(${rgb}, ${0.35 * web})`);
      r.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = r;
      ctx.fillRect(n.x - 16, n.y - 16, 32, 32);
    }
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
    const s: State = { env: [0, 0], flareOn: false, flareUntil: 0, edgeArcs: [], edgeNext: 0, nodes: [], webArcs: [], webNext: 0 };

    const prepare = () => {
      ctx.setTransform(side === 'b' ? -dpr : dpr, 0, 0, dpr, side === 'b' ? w * dpr : 0, 0);
      ctx.clearRect(0, 0, w, h);
    };
    let settled = false;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      if ((reduced || settled) && w > 0) {
        prepare();
        stillGlow(ctx, w, h, rgb);
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();
    if (reduced) return () => ro.disconnect();

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);

    let raf = 0;
    const start = performance.now();
    let last = start;
    let acc = 0;
    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      // Done playing → draw the still glow once and stop the loop for good.
      if (elapsed > PLAY_S + SETTLE_S) {
        settled = true;
        if (w > 0) {
          prepare();
          stillGlow(ctx, w, h, rgb);
        }
        return;
      }
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      if (acc < 1 / FPS || !visible || document.hidden || w === 0) return;
      prepare();
      frame(ctx, w, h, now / 1000, acc, s, rgb, elapsed > PLAY_S);
      // Settling: lay the still glow underneath so the hand-off is seamless.
      if (elapsed > PLAY_S) stillGlow(ctx, w, h, rgb);
      acc = 0;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
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
