# STYLE-GUIDE.md — Global Design System
> Source: WC2026 dashboard. Apply to ALL web and mobile projects.

---

## Design Philosophy
- **Dark, premium, sports-app feel** — like ESPN or high-end fantasy sports
- **Mobile-first, max 600px** — designed for phone screens
- **No images or illustrations** — flag emojis do visual heavy lifting
- **Gold as hero color** — active states, rankings, anything important
- **Information density** — small text, tight spacing, lots of data without clutter

---

## Color Palette

```css
:root {
  --bg:      #0a0e1a;   /* Page background — near black, blue tint */
  --surface: #111827;   /* Slightly lighter surface, strips/bars */
  --card:    #1a2235;   /* Card background — blue-dark grey */
  --border:  #2a3450;   /* All borders and dividers */
  --gold:    #f5c842;   /* Primary accent — active states, rankings */
  --green:   #22c55e;   /* Success, wins, advancing */
  --red:     #ef4444;   /* Errors, losses, live indicator, red cards */
  --blue:    #3b82f6;   /* Info, scores, links */
  --muted:   #6b7280;   /* Tertiary text, placeholders, disabled */
  --text:    #f1f5f9;   /* Primary text — off-white */
  --subtext: #94a3b8;   /* Secondary text — blue-grey */
  --fire:    #ff6b35;   /* Hot/featured content — orange */
}
```

### Color Layering
```
Page bg (#0a0e1a) → Surface (#111827) → Card (#1a2235) → Border (#2a3450)
```
Each layer slightly lighter. Never pure black or pure white.

### Semantic Usage
| Color | Use |
|---|---|
| `--gold` | Active tab, #1 rank, advancing teams, left-border accents |
| `--green` | Win results, qualifying, form dot W |
| `--red` | Live indicator, errors, losses, red cards |
| `--blue` | Scores, info banners, trivia |
| `--fire` | Hot/featured matches |
| `--muted` | Metadata, rank numbers (non-top), venue text |
| `--subtext` | Body text in cards, secondary info |
| `--text` | Headlines, team names, primary content |

---

## Typography

```css
font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
font-size: 15px;
```

System fonts only — loads instantly. No Google Fonts.

### Type Scale
| Size | Weight | Use |
|---|---|---|
| `10px` + `letter-spacing: 2px` + uppercase | 700 | Section labels, category tags |
| `11px` | 500–700 | Metadata, venue, timestamps, badges |
| `12px` | 600 | Chips, filter buttons, info bar |
| `13px` | 400–600 | Body text in cards, player names |
| `14px` | 600 | Primary row content (team/player names) |
| `15px` | 700 | Card titles |
| `18px` | 900 | Rank numbers, group letters |
| `20px` | 800 | App title |

### Typography Rules
- Headings: small-caps section labels (`10px`, `700`, `letter-spacing: 2px`, uppercase, `color: var(--gold)`)
- Numbers: `font-variant-numeric: tabular-nums` on all scores/stats/rankings
- Body line-height: `1.55–1.6`
- Title line-height: `1.1–1.3`

---

## Global Resets

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}
button { font-family: inherit; cursor: pointer; border: none; background: none; }
a { color: inherit; text-decoration: none; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
```

---

## Layout

```css
.app { min-height: 100vh; background: var(--bg); }
.main { padding: 16px; max-width: 600px; margin: 0 auto; padding-bottom: 40px; }
```

Everything centered, max 600px. Intentional — mobile-first dashboard.

---

## Cards

```css
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 13px 14px;
  margin-bottom: 8px;
}
```

**Border radius rule:** Cards = `12px`. Inner elements = `5–10px`. Buttons = `16–20px`. Small pills = `3–5px`.

### Card Variants
```css
/* Accent left-border (editorial/storylines) */
.card { border-left: 3px solid var(--gold); border-radius: 0 12px 12px 0; }
.card.hot    { border-left-color: var(--fire); }
.card.urgent { border-left-color: var(--red); }
.card.info   { border-left-color: var(--blue); }

/* Clickable card */
.card { cursor: pointer; transition: border-color 0.15s; }
.card:active { opacity: 0.85; }
.card.open { border-color: rgba(245,200,66,0.25); }
```

---

## Badges & Pills

```css
.badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 5px; }
.badge-gold  { background: rgba(245,200,66,0.15); color: var(--gold); }
.badge-blue  { background: rgba(59,130,246,0.12); color: #60a5fa; }
.badge-green { background: rgba(34,197,94,0.12);  color: #4ade80; }
.badge-muted { background: rgba(107,114,128,0.1); color: var(--muted); }
.badge-red   { background: rgba(239,68,68,0.12);  color: #fca5a5; }
```

**Pattern:** `rgba(color, 0.12–0.15)` background + lighter shade text. Never full opacity.

---

## Filter Chips

```css
.chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-bottom: 14px; }
.chip { flex-shrink: 0; background: var(--card); border: 1px solid var(--border); color: var(--subtext); padding: 5px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; transition: all 0.15s; }
.chip.active { background: rgba(245,200,66,0.1); border-color: var(--gold); color: var(--gold); }
```

---

## Section Label

```css
.section-label {
  font-size: 10px; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: var(--gold); margin-bottom: 12px;
}
```

Every major section starts with one. Always gold, always uppercase, always small.

---

## Scores

```css
/* Live */
.liveScore { background: rgba(239,68,68,0.15); color: #fca5a5; font-size: 12px; font-weight: 800; padding: 2px 7px; border-radius: 5px; font-variant-numeric: tabular-nums; }
/* Final */
.finalScore { background: rgba(59,130,246,0.12); color: #93c5fd; font-size: 12px; font-weight: 800; padding: 2px 7px; border-radius: 5px; font-variant-numeric: tabular-nums; }
```

Red = live. Blue = final.

---

## Accordion

```css
.arrow { color: var(--muted); font-size: 11px; transition: transform 0.2s; }
.card.open .arrow { transform: rotate(180deg); }
.expand { max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.28s ease, opacity 0.2s ease; }
.card.open .expand { max-height: 400px; opacity: 1; }
```

Rule: `max-height` animation, not `height`. Never use `all` on accordion transitions.

---

## Spinner

```css
.spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

---

## Spacing System
| Value | Used for |
|---|---|
| `4px` | Gap between inline elements |
| `6px` | Gap between chips/tabs |
| `8px` | Margin between cards |
| `10–12px` | Padding inside small components |
| `13–14px` | Padding inside cards |
| `16px` | Main content padding, section gaps |
| `20px` | Section margin-bottom |
| `40–50px` | Empty state padding |

---

## Transitions
```css
transition: all 0.15s;                                      /* hover states */
transition: transform 0.2s;                                 /* rotating arrows */
transition: max-height 0.28s ease, opacity 0.2s ease;      /* accordions */
```

---

## Starter Template (paste into new project index.css)

```css
:root {
  --bg: #0a0e1a; --surface: #111827; --card: #1a2235; --border: #2a3450;
  --gold: #f5c842; --green: #22c55e; --red: #ef4444; --blue: #3b82f6;
  --muted: #6b7280; --text: #f1f5f9; --subtext: #94a3b8; --fire: #ff6b35;
}
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
html, body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 15px; min-height: 100vh; }
button { font-family: inherit; cursor: pointer; border: none; background: none; }
a { color: inherit; text-decoration: none; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 13px 14px; margin-bottom: 8px; }
.badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 5px; }
.badge-gold { background: rgba(245,200,66,0.15); color: #f5c842; }
.badge-blue { background: rgba(59,130,246,0.12); color: #60a5fa; }
.badge-green { background: rgba(34,197,94,0.12); color: #4ade80; }
.badge-muted { background: rgba(107,114,128,0.1); color: #6b7280; }
.badge-red { background: rgba(239,68,68,0.12); color: #fca5a5; }
.section-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }
.chip { background: var(--card); border: 1px solid var(--border); color: var(--subtext); padding: 5px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; transition: all 0.15s; }
.chip.active { background: rgba(245,200,66,0.1); border-color: var(--gold); color: var(--gold); }
.spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.info-bar { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #93c5fd; margin-bottom: 12px; }
.error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 14px; font-size: 13px; color: #fca5a5; }
.main { padding: 16px; max-width: 600px; margin: 0 auto; padding-bottom: 40px; }
```
