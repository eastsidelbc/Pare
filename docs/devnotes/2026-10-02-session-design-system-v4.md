# Session Dev Note — Audit → Wave 3 → Design System → Tailwind v4

**Date:** 2026-10-01/02
**Scope:** Full codebase audit, Wave 3 fixes, quadrant control redesign, design-system groundwork, and a clean Tailwind v3 → v4 migration (now live).
**Status:** v4 shipped and verified green. Design system is in progress — continues in a new chat.

---

## What shipped this session

### 1. Full codebase audit
- Report: `docs/audits/2026-10-01-audit.md`.
- Findings: **H1** data licensing (ESPN unofficial + Sleeper non-commercial vs planned monetization), **H2** iOS prod URL placeholder `https://pare-nfl.app` vs live `pare.gg`, **M1** ordinal bug, **M2** prod logging, **M3** defense bar inversion (latent), **M4** iOS ATS, **M5** no tests/CI, **M6** metric selector drift.
- Read-only; nothing was changed by the audit itself.

### 2. Wave 3 fixes (correctness, logging, hygiene, tests)
- `utils/ordinal.ts` (NEW) — single source for rank formatting; fixes "21th/31th". `lib/useRanking.ts` and `components/ui/RankBadge.tsx` now import it (inline copies removed). [M1]
- Prod logging gated: removed per-render `console.log` in `lib/useTheme.ts`; gated `[Diag]` logs in `components/RankingDropdown.tsx` behind `NODE_ENV !== 'production'`. [M2]
- `lib/metricsConfig.ts` rewritten — `availableInOffense/Defense` now reflect ESPN-populated fields; removed duplicate `penalties_yds` + ghost `penalty_first_down`; defense exposes only allowed-metrics (closes M3 latent bug). `lib/useBarCalculation.ts` got a comment documenting the defense value-swap assumption. [M3, M6]
- API 500s no longer leak `message`/`errorType` (`app/api/nfl-2025/{offense,defense}/route.ts`) — still logged server-side. [M2]
- Test harness: `vitest.config.ts` (NEW, `@` alias), 29 tests across ordinal/teamHelpers/teamDataTransform/store/useRanking, all passing. `.github/workflows/ci.yml` (NEW — runs check + test:run). `package.json` scripts `test`/`test:run`. [M5]
- Devnote: `docs/devnotes/2026-10-01-audit-wave3-fixes.md`.

### 3. Quadrant close-control redesign
- `components/compare/CompareQuadrants.tsx` — close × is now a right-edge "tab" attached to the card; `QuadrantMetricsButton` removed; quadrant metrics locked to defaults.
- `components/mobile/MobileCompareLayout.tsx` — quadrant `padRight` reduced from `GAP + 34 + GAP` to `GAP` (closed the reserved gutter).
- Devnote: `docs/devnotes/2026-10-01-quadrant-close-tab.md`.

### 4. Design system — groundwork
- **Source of truth for values:** `app/globals.css :root` CSS variables.
- **Source of truth for rules:** `docs/design-system.md` (NEW) — elevation ladder (bg → surface → card), borders only where a gap can't separate, radius scale, one gold accent; plus drift audit (worst offender `TeamDropdown.tsx`; hardcoded literals in 6/8 components; cards 12px `rounded-xl` vs 14px `--radius-lg`; two golds), token→Tailwind mapping, component recipes, migration order, library choices, CI grep guard.
- Libraries added: `class-variance-authority`, `clsx`, `tailwind-merge` → `cn()` in `lib/utils.ts` (NEW). Radix primitives already present. **shadcn CLI deliberately abandoned** — its 4.x is v4-native and broke the then-v3 tree.
- Tailwind config Phase 1: token `colors` + `boxShadow` mapped to `var(--…)` in `tailwind.config.js`.
- Devnote: `docs/devnotes/2026-10-02-design-system-phase1.md`.
- Tokens (values): `--bg #0a0e1a, --surface #111827, --card #1a2235, --border #2a3450, --gold #d4a843, --gold-bright #f5c842, --green #22c55e, --red #ef4444, --blue #3b82f6, --muted #6b7280, --text #f1f5f9, --subtext #94a3b8, --fire #ff6b35; --radius-sm/md/lg/xl 6/10/14/20px; --shadow-card, --shadow-pop; --nav-pill-h 40px, --nav-h 60px`.

### 5. Tailwind v3.4.3 → v4.3.3 — DONE & LIVE
- CSS-first: `app/globals.css` now starts `@import 'tailwindcss';` + `@config '../tailwind.config.js';` (compat mode); custom classes are top-level `@utility`; dark `:root` tokens intact (no oklch, no `.dark`, no shadcn vars).
- `postcss.config.mjs` → `{ plugins: { '@tailwindcss/postcss': {} } }`; autoprefixer removed.
- `app/layout.tsx` → Inter only (Geist pollution removed).
- `package.json` → `tailwindcss ^4.3.3` + `@tailwindcss/postcss ^4.3.3`.
- Done via a Cursor handoff prompt with self-checks; I then **verified by reading** globals.css / package.json / postcss.config.mjs / layout.tsx directly on the branch — clean, not just trusting the self-report.
- **Verified:** `npm run check` clean, 29/29 tests, build green, 32 teams served, tokens intact.
- Merged to `main` (fast-forward `93dfbc9..59758fa`), pushed, deployed on the Mac mini.
- Devnote (Cursor): `docs/devnotes/2026-10-01-tailwind-v4-migration.md`.

---

## Environment gotchas (for next session)

- **PAT workflow scope** — pushes touching `.github/workflows/*` need the `workflow` scope. Fixed permanently: added `workflow` to the classic PAT `wsl-dev` (don't use the over-privileged `mcp` token for git).
- **Mac mini pull** — `git pull` aborts on `package-lock.json` local changes (npm install regenerates platform-specific entries). Habit: `git restore package-lock.json` **before** every pull.
- **Windows localhost** — stale `.next` after big jumps throws `ENOENT … _buildManifest.js.tmp.*` / "internal server error". Fix: `npm run dev:clean`. Deeper cause if it recurs: OneDrive syncing `C:\Users\Soy\Documents\` locking temp files.
- **Tooling** — the `repos` MCP is filesystem-only (read/write/edit, no shell). Claude can't run npm/git/build; the user or Cursor runs commands.

---

## Pending — pick up here

1. **Visual QA of the live v4 site** (last v4 gate): dark mode, 393px, quadrant, standings, leaderboards.
2. **Phase 3 token-color sweep** (Cursor prompt already drafted in-chat): replace hardcoded color literals / raw palette classes with design tokens; paste dev note back for verification before merge/deploy.
3. **Hands-on (not AFK):** rebuild `TeamDropdown.tsx` on Radix + tokens; hide the quadrant dark-blue container + make × a corner button; retire `styleguide.md`; add CI grep guard for raw palette classes.
4. **Deferred:** full `@theme` token port (currently `@config` compat); confirm `@react-spring/web` unused and drop it; move `:root`/base styles out of `@layer utilities` into `@layer base`; iOS H2 (prod URL → pare.gg) + M4 (ATS) when iOS is reworked; H1 data licensing before monetizing.
