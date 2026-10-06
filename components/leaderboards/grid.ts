/**
 * One CardGrid setting for every Leaders section (design-system §9.3).
 * minCard 170 → 2 cards across on a 393px iPhone, 4 on iPad portrait, 5 on landscape
 * (maxCols caps it). Plain module (not 'use client') so the server page and the
 * client Fantasy section read the same values.
 */
export const LEADER_GRID = { minCard: 170, maxCard: 300, maxCols: 5, gap: 10 } as const;
