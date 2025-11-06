# Latest-wins Team Selection, Rail Pin, Smaller Display Selects
## Date
2025-11-05

## Context
Team selection was being overwritten after picking a game from the rail. We aligned behavior so the most recent action always wins (rail or manual), with local state as the single source of truth. Also pinned the live games rail to the left edge and reduced the size of the display-mode selects.

## Decisions
- Use local `selectedTeamA/B` as the only render source of truth.
- Seed from `selectedGame` immediately when it changes; after that, manual edits override until another game is picked.
- Pin the scoreboard rail to the left as a fixed column.
- Reduce display-mode select controls to improve density.

## Implementation Notes
- `app/compare/page.tsx`: added `lastSource`/`lastUpdatedAt`; always seed on `selectedGame` change; handlers mark `manual`; render uses local teams only.
- `components/SiteLayoutShell.tsx`: fixed left rail with `md:pl-[340px]` on content.
- `components/OffensePanel.tsx` + `components/DefensePanel.tsx`: reduced select padding, font-size, and min-height.

## Testing
- Pick a game in the rail → teams set to matchup.
- Change Team A/B via TeamDropdown/RankingDropdown → updates persist.
- Pick another game → teams update again accordingly.

## Performance
No measurable impact. Logging gated to non-production.

## Follow-ups
- Consider a backend aggregator for real data (post-mock).
- Document rail layout and selection flow in ARCHITECTURE.md.

## Microlearning
“Latest action wins” with a local single source of truth eliminates state conflicts between derived inputs (game picks) and manual edits. Effects seed state; rendering never branches off context or props again.

## Graduated to RULES.md (if any)
None today.

