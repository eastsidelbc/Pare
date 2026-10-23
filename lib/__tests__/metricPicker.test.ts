import { describe, expect, it } from 'vitest';
import { MAX_PANEL_METRICS, toggleMetric } from '@/components/compare/MetricPickerSheet';
import { getAvailableMetrics } from '@/lib/metricsConfig';

describe('toggleMetric (Compare metric picker)', () => {
  it('adds at the end, removes in place', () => {
    expect(toggleMetric(['points', 'total_yards'], 'red_zone_td_pct')).toEqual(['points', 'total_yards', 'red_zone_td_pct']);
    expect(toggleMetric(['points', 'total_yards', 'pass_yds'], 'total_yards')).toEqual(['points', 'pass_yds']);
  });
  it('never below one, never above the max', () => {
    expect(toggleMetric(['points'], 'points')).toEqual(['points']);
    const full = Object.keys(getAvailableMetrics('offense')).slice(0, MAX_PANEL_METRICS);
    expect(toggleMetric(full, 'takeaways')).toEqual(full);
  });
});
