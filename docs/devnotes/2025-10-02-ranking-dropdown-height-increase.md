---
Title: Ranking Dropdown Height Increase
Date: 2025-10-02
Owner: Jeremy
Versions Affected: 1.0.x
Links:
  - CLAUDE Section: CLAUDE.md#ranking-dropdown-debugging
  - Component: components/RankingDropdown.tsx
---

**Normative rules live in CLAUDE.md. This note records implementation details and rationale.**

### 1) Context & Goal
- User reported RankingDropdown only showing 4 teams when opened, requiring excessive scrolling to see remaining 28 teams
- Goal: Increase visible teams to 10+ for better UX when selecting teams by rank

### 2) Decisions & Alternatives
- **Decision**: Increase `max-h-60` (240px) to `max-h-[40rem]` (640px) on dropdown container
- **Math**: 
  - Header: ~50px
  - Each team row: 48px (min-h-[3rem])
  - 10 teams: 480px
  - Footer: ~35px
  - Total: 640px provides comfortable 10-12 visible teams
- **Alternatives considered**: 
  - `max-h-96` (384px) - only shows 6-7 teams (rejected, insufficient)
  - Remove max-height entirely (rejected, could overflow on small screens)

### 3) Implementation Notes
- **File**: `components/RankingDropdown.tsx`
- **Line 185**: Changed dropdown container className from `max-h-60` to `max-h-[40rem]`
- **No logic changes**: Only CSS height adjustment, all ranking/sorting logic unchanged
- **Responsive behavior**: Still scrollable for remaining teams beyond 10-12, maintains mobile touch optimization

### 4) Testing & Acceptance Criteria
- [x] Dropdown opens and shows 10+ teams visible without scrolling
- [x] Scrolling still works for remaining teams (13-32)
- [x] No layout breaking on mobile or desktop
- [x] Maintains existing touch targets (min-h-[3rem] = 48px)

### 5) Performance & Limitations
- Zero performance impact - CSS-only change
- All 32 teams still rendered (as before), just more visible initially
- Mobile consideration: 640px height may take significant screen space on phones (acceptable for desktop-first use case)

### 6) Follow-ups
- Monitor user feedback on mobile devices for height comfort
- Consider adaptive height based on screen size if needed (`max-h-[40rem] md:max-h-[48rem]`)

### 7) Graduated to CLAUDE
- None (minor UX improvement, not a reusable pattern)

### 8) Additional Context
- User also set up iOS device testing via local network (`npm run dev -- -H 0.0.0.0`)
- IP: 192.168.0.213:3000 for local network access

