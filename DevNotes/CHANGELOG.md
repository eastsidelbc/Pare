## [Unreleased]

### Docs
- Phases 1–4 (UI → Header/Chips → Compare Wiring → Mock API)
  - Dev Note: [2025-10-27-phases-1-4-ui-mock-api.md](./2025-10-27-phases-1-4-ui-mock-api.md)
  - PROJECT_PLAN.md updated with Phase 2–4 notes
  - QA checklist updated with Phase 4 section

### Feat
- Mock endpoints and wiring
  - types/matchup.ts (ScoreboardGame, MatchupPayload, Chip)
  - app/api/mock/scoreboard (5s polling) & app/api/mock/matchup
  - utils/time.ts (Chicago kickoff), utils/odds.ts (spread/total)
  - lib/hooks/useScoreboardMock.ts (5s polling)
  - Rail/Header/Chips wired to mocks with skeletons
