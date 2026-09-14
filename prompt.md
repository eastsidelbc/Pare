BATCH 2 now (#3 from the audit). Cheap verification only (no browser), preserve all behavior
and displayed values.
- Windowing: render only the ACTIVE pane and its immediate neighbors (active ±1) in the
  CompareWorkspace, instead of all N panes. Keep the ±1 neighbors mounted so a swipe reveals
  a ready page (no blank flash mid-swipe); virtualize the rest.
- Wrap ComparePane and the panels (OffensePanel, DefensePanel, CompactPanel,
  MobileCompareLayout, DynamicComparisonRow/CompactComparisonRow) in React.memo.
- Stabilize the handlers passed to each pane with useCallback, keyed by comparison id, so
  memoized panes don't re-render on unrelated setActive changes.
Do NOT touch data caching (#1) — that's the next batch.
Verify: npm run build clean; confirm swipe still reveals neighbors with no blank, tab
switch/close still works and shows correct teams. List files changed.