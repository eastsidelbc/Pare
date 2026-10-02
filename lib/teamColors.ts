/**
 * Team colors for the Compare bars (Round 5 "R" neon split-capsule design).
 *
 * Every team gets a `bar` color (the one that reads best on a near-black
 * background — usually the primary, sometimes the iconic accent, e.g. Bears
 * orange) and an `alt` color used when two teams in a matchup clash.
 *
 * Three rules (see docs/design-system.md → "Team colors"):
 *   1. LIFT — dark brand colors (navy, burgundy) vanish on black, so they are
 *      lightened until they hit ≥ MIN_CONTRAST against the Compare background.
 *   2. CLASH — if both teams' colors are too close (e.g. KC red vs TB red), the
 *      RIGHT-side team switches to its `alt` color.
 *   3. FALLBACK — if they still clash, or a team is unknown (e.g. "League
 *      Average"), use Pare's classic green (left) / fire (right).
 *
 * Pure functions, no React — unit-tested in lib/__tests__/teamColors.test.ts.
 * Hex values are brand data (like the team registry), not design tokens.
 */

import { getTeamByName } from '@/lib/teams';

interface TeamColorSource {
  /** The color the team's bar wears (pre-lift). */
  bar: string;
  /** Second choice for when the bar color clashes with the opponent. */
  alt: string;
}

/** Keyed by team abbreviation (lib/teams.ts). */
const TEAM_COLORS: Readonly<Record<string, TeamColorSource>> = {
  ARI: { bar: '#97233F', alt: '#FFB612' },
  ATL: { bar: '#A71930', alt: '#A5ACAF' },
  BAL: { bar: '#241773', alt: '#9E7C0C' },
  BUF: { bar: '#00338D', alt: '#C60C30' },
  CAR: { bar: '#0085CA', alt: '#BFC0BF' },
  CHI: { bar: '#C83803', alt: '#0B162A' },
  CIN: { bar: '#FB4F14', alt: '#E5E7EB' },
  CLE: { bar: '#FF3C00', alt: '#311D00' },
  DAL: { bar: '#003594', alt: '#869397' },
  DEN: { bar: '#FB4F14', alt: '#002244' },
  DET: { bar: '#0076B6', alt: '#B0B7BC' },
  GB: { bar: '#203731', alt: '#FFB612' },
  HOU: { bar: '#A71930', alt: '#03202F' },
  IND: { bar: '#002C5F', alt: '#A2AAAD' },
  JAX: { bar: '#006778', alt: '#D7A22A' },
  KC: { bar: '#E31837', alt: '#FFB81C' },
  LV: { bar: '#A5ACAF', alt: '#E5E7EB' },
  LAC: { bar: '#0080C6', alt: '#FFC20E' },
  LAR: { bar: '#003594', alt: '#FFA300' },
  MIA: { bar: '#008E97', alt: '#FC4C02' },
  MIN: { bar: '#4F2683', alt: '#FFC62F' },
  NE: { bar: '#002244', alt: '#C60C30' },
  NO: { bar: '#D3BC8D', alt: '#E5E7EB' },
  NYG: { bar: '#0B2265', alt: '#A71930' },
  NYJ: { bar: '#125740', alt: '#E5E7EB' },
  PHI: { bar: '#004C54', alt: '#A5ACAF' },
  PIT: { bar: '#FFB612', alt: '#E5E7EB' },
  SF: { bar: '#AA0000', alt: '#B3995D' },
  SEA: { bar: '#69BE28', alt: '#002244' },
  TB: { bar: '#D50A0A', alt: '#FF7900' },
  TEN: { bar: '#4B92DB', alt: '#0C2340' },
  WAS: { bar: '#5A1414', alt: '#FFB612' },
};

/** Background the bars sit on (Compare deep background, globals.css --bg-deep). */
export const COMPARE_BG = '#030409';
/** Minimum contrast of a bar color against COMPARE_BG (WCAG non-text 3:1). */
export const MIN_CONTRAST = 3;
/** Below this CIE76 ΔE the two teams' colors read as "the same color". */
export const CLASH_DELTA_E = 32;
/** Pare classic fallbacks (globals.css --green / --fire). */
const FALLBACK_A = '#22c55e';
const FALLBACK_B = '#ff6b35';

// ---------------------------------------------------------------- color math

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function channelLum(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
}

/** WCAG contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}

/** Rule 1 — raise HSL lightness until the color has ≥ MIN_CONTRAST on COMPARE_BG. */
export function liftForDark(hex: string, minContrast = MIN_CONTRAST): string {
  const [h, s0, l0] = rgbToHsl(hexToRgb(hex));
  let s = s0;
  let l = l0;
  let out = hex.toUpperCase();
  while (contrastRatio(out, COMPARE_BG) < minContrast && l < 0.95) {
    l = Math.min(0.95, l + 0.02);
    // Very dark navies lose their identity when lifted; keep them saturated.
    s = Math.max(s, 0.55);
    out = rgbToHex(hslToRgb([h, s, l]));
  }
  return out;
}

/** Mix a color toward white by `amount` (0..1). Used for the bright 1.5px outline. */
function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount]);
}

function toLab(hex: string): [number, number, number] {
  const lin = hexToRgb(hex).map(channelLum);
  const x = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047;
  const y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722;
  const z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 ΔE — perceptual distance between two colors. */
export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

// ---------------------------------------------------------------- public API

/** Everything a split-capsule half needs to paint itself. */
export interface BarPalette {
  /** Main lifted color (fill gradient, glow). */
  base: string;
  /** Brighter outline color (1.5px edge). */
  line: string;
  /** rgba() helper source — `${rgb}` as "r, g, b" for alpha variants. */
  rgb: string;
}

function palette(hex: string): BarPalette {
  const base = liftForDark(hex);
  const [r, g, b] = hexToRgb(base);
  return { base, line: tint(base, 0.3), rgb: `${r}, ${g}, ${b}` };
}

function teamSource(teamName: string): TeamColorSource | null {
  const abbr = getTeamByName(teamName)?.abbr;
  return abbr ? TEAM_COLORS[abbr] ?? null : null;
}

export interface MatchupPalettes {
  a: BarPalette;
  b: BarPalette;
  /** Which rule produced the colors (handy for tests/debug). */
  source: 'team' | 'swapped' | 'fallback';
}

/**
 * Resolve bar colors for a matchup. Team A = left, Team B = right.
 * Applies lift → clash (right side swaps to alt) → fallback.
 */
export function getMatchupPalettes(teamA: string, teamB: string): MatchupPalettes {
  const srcA = teamSource(teamA);
  const srcB = teamSource(teamB);
  if (!srcA || !srcB) {
    return { a: palette(srcA?.bar ?? FALLBACK_A), b: palette(srcB?.bar ?? FALLBACK_B), source: 'fallback' };
  }
  const a = palette(srcA.bar);
  const b = palette(srcB.bar);
  if (deltaE(a.base, b.base) >= CLASH_DELTA_E) return { a, b, source: 'team' };

  // Right side swaps first; if that still clashes, try the left side's alt,
  // then both alts, before giving up on team colors.
  const bAlt = palette(srcB.alt);
  const aAlt = palette(srcA.alt);
  const tries: Array<[BarPalette, BarPalette]> = [[a, bAlt], [aAlt, b], [aAlt, bAlt]];
  for (const [ta, tb] of tries) {
    if (deltaE(ta.base, tb.base) >= CLASH_DELTA_E) return { a: ta, b: tb, source: 'swapped' };
  }

  return { a: palette(FALLBACK_A), b: palette(FALLBACK_B), source: 'fallback' };
}

/** Exposed for tests: every team abbreviation that has colors. */
export const TEAM_COLOR_ABBRS = Object.keys(TEAM_COLORS);

/**
 * Single-team palette (no matchup clash logic) — for standalone marks such as
 * <TeamMark> in pickers/lists. Unknown teams (e.g. "League Average") → null.
 */
export function getTeamPalette(teamName: string): BarPalette | null {
  const src = teamSource(teamName);
  return src ? palette(src.bar) : null;
}
