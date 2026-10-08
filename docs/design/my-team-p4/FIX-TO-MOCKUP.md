# My Team — match the final mockup (fix pass, 2026-10-07)

The P5 build drifted from the signed-off P4 mockup because the mockup itself was never in the repo. This folder now holds it. **These files are the source of truth for layout, sizes, order and copy.**

| File | What it is |
|---|---|
| `FinalPhone.dc.html` | Final mockup, iPhone 393×759 (every P4 lock) |
| `FinalPad.dc.html` / `FinalPadL.dc.html` | Final mockup, iPad 834 portrait / 1194 landscape |
| `mockup-phone-expanded.png` | Screenshot of the mockup (Mahomes row open) — the target |
| `current-build-phone.png` | Screenshot of the current build (Dak row open) — what drifted |

How to read the `.dc.html` files (don't try to run them; they need a canvas runtime that isn't in the repo):
- Markup + inline styles live between `<x-dc>` and `</x-dc>`. `{{r.something}}` holes are per-row values; `<sc-for list=… as=…>` is a loop; `<sc-if value=…>` is a conditional.
- Computed styles (row min-height, meter bars, pills, chips) are built in the `class Component` script inside `renderVals()` — search for `rowStyle`, `r.bars`, `v.filters`, `chip:`.
- Values in the mockup are literals; in the app they map to the §1 tokens in `docs/design-system.md` (`--matchup-*`, `--pos-*`, `--inj-*`, radii 6/10/14/20).

## Kobe's color rule for this pass
**Keep the current build's darker look**: its page/card/expanded-panel surfaces, the near-black why-stats box, and the dark week cells with tier-colored edge + tier-colored text. Do NOT lighten surfaces to the mockup's values and do NOT switch week cells to solid fills. **Everything else — layout, positions, sizes, order, copy — follows the mockup exactly.**

## The differences to fix (from the two screenshots)
1. **Meter (row, right side)** — a vertical stack, right-aligned, 64px wide: 5 bars on top (7px wide, heights 4→20px stepping evenly, gap 2px, filled count = tier, unfilled `--matchup-track`, bye = transparent + 1px dashed `--matchup-bye`), and the label under it ("Good #27", 11px/800, tier color). Build has bars and label side by side.
2. **Look-ahead micro-bar** — sits on the LEFT, under line 2 (team · opp · kickoff), inside the name column: 5 bars 18×4px, gap 3px, margin-top 3px, tier fill, bye = dashed outline. Build puts it under the meter on the right.
3. **Injury badge** — bottom-RIGHT corner of the position circle (right −6px, bottom −4px), min-width 20, height 17, radius 9, `--inj-*` fill, dark text, 2px ring in the row background. Build has it bottom-left.
4. **Expanded hero** — ONE line: big number (26px/800, tabular, white `--text`) + "PPR pts/g LV allows to QBs · #27 of 32" (12px/600 subtext). Remove the second line ("Tough #9 of 32 · Season") — the tier is already on the meter and Season lives on the toggle.
5. **Why-stats** — labels read "{stat} / game" exactly as in the mockup ("Pass yds / game", "Pass TD / game", "INT made / game", "Sacks made / game"; RB/WR/TE per the plan's defenseProfile table). Value 13px/800 right; rank 11px/700 subtext, min-width 28, right-aligned, formatted **"#28"** (ties "T-14"), not "9th"/"T-14th". Rows 36px in one bordered box (radius 10). Remove the footnote line under the box.
6. **Week cells (next 5)** — the week label ("W6", 11px/700 subtext) sits ABOVE each cell, not inside. Cell 36px tall, radius 6, shows opp ("@SEA", 11px/800) over rank ("#11", 11px/700) — no tier word in the cell. Bye = dashed outline + "BYE". Keep the build's dark fill + tier-colored edge/text (color rule above).
7. **Start / Sit button** — swap icon (lucide `ArrowUpDown`) + "Start / Sit" (14px/800) left; hint "vs 2 other QBs" (11px/700 subtext) right; gold-bright chevron. Fix plural: "vs 1 other QB" / "vs 2 other QBs".
8. **Week bar + section labels** (scrolled out of the screenshot — verify they exist exactly): above the sticky pills, "WEEK n" (13px/900, 0.08em) + date range (11px subtext) left, Season | Last 4 glass toggle + ⓘ (44px) right. Section labels "STARTERS 11", "BENCH 13", "IR / TAXI 2": 11px/800 gold, 0.18em tracking, hairline rule, count right.
9. **Filter pills must not clip at 393** — pill 30px tall, padding 0 9px, gap 5px, 12px label + 11px count side by side; "Expand all / Collapse all" 12px/700 gold, pinned right. Real leagues add K / DEF (and IR/Taxi): the pill group scrolls sideways inside its own row (overflow-x auto, hidden scrollbar, 44px hit areas kept) while "Expand all" stays pinned. Build currently clips TE and the next pill.
10. **League capsule** — long real league names truncate with an ellipsis (max-width ~170px), capsule stays 36px drawn / 44px hit.

Anything not listed: compare against `FinalPhone.dc.html` / `FinalPad*.dc.html` and match them.
