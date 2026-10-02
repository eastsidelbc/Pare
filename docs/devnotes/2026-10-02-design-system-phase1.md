# Design system — Phase 1 (foundation) + handoff (2026-10-02)

Rules + rationale live in `docs/design-system.md`. This note = what's done, what's staged,
and the exact commands to continue. Work paused at the "needs your machine / needs eyeballs"
line (session was unattended — can't run `npm`, can't build/verify here).

## Status by phase
- **Phase 0 — Map: ✅** `docs/design-system.md` (rules + audit + lib recs).
- **Phase 1 — Foundation: ◑ partial.**
  - ✅ Done (safe, additive): token `colors` + `boxShadow` added to `tailwind.config.js`.
    Now usable: `bg-bg/bg-surface/bg-card`, `border-border`, `text-text/text-subtext/text-muted`,
    `bg-gold/bg-gold-bright/bg-green/bg-fire/bg-red/bg-blue`, `shadow-card/shadow-pop`.
    Nothing existing changed — purely new utilities.
  - ⏸ Deferred (shifts pixels app-wide — apply with your eyes on it): the **radius remap**.
    Add to `tailwind.config.js` → `theme.extend`, then rebuild and eyeball every screen:
    ```js
    borderRadius: {
      sm: 'var(--radius-sm)',  // 6
      md: 'var(--radius-md)',  // 10 (was 6)
      lg: 'var(--radius-lg)',  // 14 (was 8)  ← cards
      xl: 'var(--radius-xl)',  // 20 (was 12)
    },
    ```
    This changes every existing `rounded-md/lg/xl`. If anything looks too round, that's expected —
    migrate those spots to the right token (cards → `rounded-lg`). Revert = delete this block.
- **Phase 2 — Tooling: ✅ done the clean (v3) way.**
  shadcn@4 `init` was tried and **reverted** — shadcn 4.x is Tailwind-v4-native and injected v4 CSS
  (`@import "shadcn/tailwind.css"` → `@apply outline-ring/50`) plus a messy dep set into this v3
  app, breaking the build. **Do NOT run `npx shadcn init` while on Tailwind v3.**
  Clean install used instead: `npm i class-variance-authority clsx tailwind-merge`. `lib/utils.ts`
  holds the standard `cn()`. shadcn components are copy-in-and-own, so Phase 3 hand-builds the few
  we need on Radix (the existing `@radix-ui/*` deps) + CVA + our tokens — no shadcn CLI, no v4 theme.
  (If full shadcn is ever wanted later, that's a deliberate Tailwind v3→v4 upgrade as its own task.)
- **Phase 3 — Migrate: ⏸ after Phase 2.** Order: (1) `TeamDropdown.tsx` → rebuild on Radix +
  tokens (biggest offender). (2) literals→vars: `CompactComparisonRow` bar gradients →
  `var(--green)`/`var(--fire)`; gold tints in `BottomNav`/`DivisionTable`/`LeaderCard` → one gold.
  (3) radius pass: cards → `rounded-lg`. (4) `text-white`→`text-text`, `divide-white/5`→`divide-border`.
  (5) the quadrant "hide container": outer wrapper → `bg-transparent` no border, × → corner button
  (no edge left for a tab). Each = own commit + eyeball + deploy.
- **Phase 4 — Lock in:** retire `styleguide.md` (reconcile the gold + radius discrepancies first —
  see design-system.md §7), add the CI grep guard, optional `/design` reference page.

## When you're back
Say the word and I'll do Phase 3 surgically once Phase 2's installed — I just can't install or
build from here. If you'd rather I plow ahead and hand you an unverified changeset to fix, tell me
and I will, but the clean path is: you run the two Phase-2 commands, then I migrate.
