# 2025-10-07 — Phases Execution (Phase 0–4, 6 stubs)

- Link to rules: See `CLAUDE.md` (source of truth); not duplicated here.

## Context
- Executed Phase 0 verification and implemented Phases 1–4 per `phases.txt` with a small Phase 6 stub.

## Decisions
- Disable HTML caching in the Service Worker; gate SW via `NEXT_PUBLIC_ENABLE_SW`.
- Ranking dropdown uses responsive height clamp (no search) to fit ~8–9 rows on phones.
- Deterministic first paint with synchronous defaults; validation-only effect.
- Metrics modal: body scroll lock + basic focus trap.
- Added stub preferences endpoint and hook for future auth-ready storage.

## Implementation Notes
- SW: `public/sw.js` no longer precaches HTML and does not cache.put() HTML; HTML path is network-only.
- SW gating: `app/layout.tsx` gated by `NEXT_PUBLIC_ENABLE_SW`.
- Dropdown: `components/RankingDropdown.tsx` height set to `max-h-[60vh] md:max-h-[500px]`.
- First paint: `app/compare/page.tsx` initializes team defaults synchronously; effect validates only.
- Modal: `components/FloatingMetricsButton.tsx` adds scroll lock and focus trap.
- Preferences stubs: `app/api/preferences/route.ts` with private no-store; `lib/usePreferences.ts` UI-only.

## Testing
- Hard reload vs normal reload: initial teams present without flicker.
- Ranking dropdown on 375×812: fits on screen; ~8–9 rows visible; scroll inside list.
- Modal: background scroll locked; Tab/Shift+Tab cycles focus within dialog.

## QA Matrix
- Browsers: Chrome, Edge, Safari (latest)
- Devices: iPhone 12/13/14, Android mid-range; Desktop 1280–1920px
- Modes: Normal reload, Hard reload, Fast Refresh; SW on/off (`NEXT_PUBLIC_ENABLE_SW`)
- Checks:
  - Compare loads with non-empty initial teams
  - Ranking dropdown fits viewport, lists ~8–9 rows, internal scroll
  - Modal locks body scroll; focus trap works; ESC/Back closes
  - No hydration warnings; no console errors

## Telemetry (Minimal Plan)
- Web Vitals (LCP, INP) via `next/script` (future opt-in)
- Error logging stub: upgrade `utils/logger.ts` to send handled errors (future)

## Performance
- No heavy additions to main path; MetricsSelector remains dynamically imported.

## Follow-ups
- Keep HTML network-only; revisit offline later if needed.
- Consider list virtualization or “recents” later.
- Preferences persistence when auth lands.

"Graduated to CLAUDE": rules remain in `CLAUDE.md`.
