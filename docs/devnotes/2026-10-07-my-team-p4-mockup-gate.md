# 2026-10-07 — My Team (Fantasy tab): P4 mockup gate session (claude.ai)

Session type: design/mockup gate in claude.ai (Cowork), not code. Code phases P5–P6 ran in Claude Code from this session's handoffs; their own devnotes are `2026-10-07-my-team-p5-design-pass.md` and `2026-10-07-my-team-p6-live.md`.

## Where things live
- Plan (source of truth): `docs/plans/my-team-fantasy.md` — P4 picks folded into Rulings.
- P5 handoff: `docs/plans/my-team-p5-handoff.md`.
- Final mockups + screenshots + fix list: `docs/design/my-team-p4/` (`FinalPhone.dc.html`, `FinalPad.dc.html`, `FinalPadL.dc.html`, `FIX-TO-MOCKUP.md`, `mockup-phone-expanded.png`, `current-build-phone.png`, `after/`).
- Design recipe: `docs/design-system.md` §1 tokens, §9 rule 3 (amended), §9.4 My Team.
- Full round-by-round log with scoreboards: `claude/decision-log-myteam-p4.md` in the claude.ai Pare project; canvas "Pare My Team Mockups" (claude.ai artifact).

## Process
Every round = 5 clickable mockups (iPhone 393, iPad 834 / 1194 where relevant) built on the previous locks, plus an on-board scoreboard (green / yellow / red vs Apple HIG, WCAG 2.2 AA, colorblind/grayscale, Pare rules), a recommendation and an industry-standard box. Kobe picked each round; picks that overrode a recommendation are noted below.

## Product principle (Kobe)
**My Team assists the user's fantasy apps with information; it doesn't compete with them.** No big live team total, no lineup/roster management, no opponent scoreboard. Drove R7 (W2 over W3) and R8 (tab name).

## Decisions
| Round | Topic | Pick |
|---|---|---|
| R0 | Layout | Phone **AI**: colored position circle (injury letter on it), 5-bar signal meter, rich expand-in-place rows (several open, no sheet), sticky position pills with counts, Expand/Collapse all. FLEX/SFLX shown in the circle; TE purple. iPad **QE**: list + PINNED side panel, short pinned cards that open on tap. |
| R1 | Meter colors / bye / cut-offs | **M6** Great #81FDA0 · Good #B4D35C · Avg #B0AAA3 · Tough #E07E2F · Avoid #E15957 (track #2a3450); **B1** bye = dashed empty bars; **T2** cut-offs 5/12/20/27/32. |
| R2 | IR / Taxi | **G5** always-open section under Bench (picked over rec. G1). |
| R3 | Gestures | **L1** tap only. Long-press menu (L2, R3b/R3c) explored, then dropped by Kobe. |
| R3d | Start / Sit | **S3** in the open card: "Start / Sit ›" above "Open in Compare" slides the same card to chips + both players' next-5 weeks + verdicts, labelled "Matchup only — not a projection" (picked over rec. S2). |
| R5 | League switcher + Season / Last 4 | **H2** capsule → "Your leagues" bottom sheet (format on each row) + ⓘ explaining Last 4. |
| R6 | Onboarding / empty states | **O4** inline setup card on the real screen with ghost rows; not-found / no leagues / pre-draft / can't reach Sleeper states in the same card. |
| R7 | Live game day | **W2** points column beside the meter (meter never hidden), small total in the STARTERS header (picked over rec. W3 because of the principle). |
| R8 | 5th tab | **N3** stacked icon-over-label nav (66×48 targets, all pages); label **Fantasy** (lucide `Shirt`); route **/myteam** with redirects from /MyTeam, /my-team, etc. |
| R9 | Final prototype + one dial | Signed off; row density stays Default 62. |

## Issues found and how they were fixed
- **Mockup never reached the repo** → the first P5 build drifted (meter layout, look-ahead bar position, week cells, hero line, ranks, injury badge). Fix: copied the final mockup files + screenshots into `docs/design/my-team-p4/` and ran a fix pass (`b84a91d`) with 10 Playwright position assertions. Kobe kept the build's darker surfaces/week cells and tier-colored hero number.
- **IR/Taxi filter pill** added in the fix pass duplicated G5 → removed; pill row got a right-edge fade when it scrolls.
- **K red-zone stat** stays "/ drive" (correct unit).
- **Real BottomNav** labels all tabs (40px capsule, ~32px tabs < 44pt) → N3 fixes it app-wide.
- **Merge blocker** (raised by Claude Code): /privacy doesn't cover Sleeper/username yet → no merge or deploy before P7 (recorded in the plan).
- **Leaders edits** in the working tree (not this feature) → stashed as `leaders-tap-to-expand`.

## Status at end of session
- P0a, P1–P3, P4 (signed off), P5 (signed off), P6 (/goal cleared, `afd11d1`) — all on `feat/my-team-sleeper`, local only; `main` untouched.
- Open: **P0b** live-cadence check + **P6 human gate** (same live game), then **P7** (privacy, DATA_SOURCES, final ADR, CHANGELOG), then merge/push/deploy.
- Before the next dev run: `npm run dev:clean`.
