# 2026-10-07 — My Team P3: skeleton UI

Plan: [`docs/plans/my-team-fantasy.md`](../plans/my-team-fantasy.md) (P3) · Server: [`2026-10-07-my-team-p2-server.md`](2026-10-07-my-team-p2-server.md)

A functional, deliberately unstyled `/my-team`, built for the P4 mockup screenshots. Expect a restyle in P5, not a rebuild.

## Skeleton rules (held)

- **Reachable by URL only.** `components/BottomNav.tsx` and `app/globals.css` are unchanged versus `main`.
- **No new color tokens.** Chips are text label + rank ("Good · #24") in neutral existing tokens. BYE is plain "BYE".
- **Reused components:** `BottomSheet`, the Neon Frame menu look (`neonMenu.ts`, via a WeekControl-style dropdown), the glass toggle (`glassControl` + `ActivePill`, layoutId `myteam-window`), and `TeamIdentity` (new surface `myTeam`, names) + `TeamAbbr` (`getListTeamColor`).
- **Not deployed:** local dev only until `/privacy` is updated in P7.

## Pieces

**Logic** (`lib/myteam/`, pure):

| File | Role |
|---|---|
| `viewModel.ts` | Bundle + window → starters / bench / IR+taxi rows. Each row has a this-week cell and a 5-week strip (`LOOKAHEAD_WEEKS`, temporary). Ranks are computed once per position per window. |
| `apiTypes.ts` | Response types shared by server and client. |
| `sandboxBundle.ts` | Synthetic data for every state. |

**Route and state:**
- `components/myteam/MyTeamProvider.tsx` is route-scoped (`app/my-team/layout.tsx`).
- It handles phases: boot → entry → lookup → notfound / noleagues → loading → ready / error.
- It persists `pare:myteam` behind a hydration guard.
- It re-fetches the bundle on return after 10 min (`isDataStale`).
- Data comes only from `/api/myteam/*`.

**Views** (`components/myteam/`): `MyTeamShell` (H1 · Inline header + one scroller + footer), `MyTeamScreen` (shared by the app and the sandbox), `RosterView`, `LookAheadStrip` (CSS scroll-snap, no JS), `MatchupChip` / `InjuryTag`, `PlayerSheet` (+ static `PlayerSheetBody`), `Onboarding`, `LeagueSwitcher`, `WindowToggle`.

**Open in Compare:** `lib/hooks/useOpenInCompare.ts` is the Home "Open full" flow: reuse the same pair, else `addComparison`; at the 8-tab cap it shows a notice.

**Sandbox:** `/sandbox/my-team` server-renders every state from synthetic data, with ASCII hooks `data-tier`, `data-injury`, `data-bye` and `data-state`. It calls `notFound()` in production, verified 404 on `next start`. The same attributes are on the real components for Playwright in P5.

## Verified (2026-10-07)

- **Dev:**
  - `/my-team` returns 200.
  - `/sandbox/my-team` HTML contains every `data-tier` / `data-injury` / `data-bye` / `data-state` value, plus "Open in Compare" and "Last 4". Chips read "Good · #24".
- **Token grep:** no raw palette classes or hex colors in `components/myteam`, `app/my-team` or `app/sandbox`.
- **Build:** the `/my-team` route is 13.1 kB of JS (budget +40 kB).
- **Prod (`next start`):** `/sandbox/my-team` returns 404 and `/my-team` returns 200.

## Not machine-checked (P3 human gate; Playwright arrives in P5)

The real flows with a live account: onboarding, league switching, Season ⇄ Last 4, tap → sheet → Open in Compare (open or reuse), and the IR/Taxi toggle.
