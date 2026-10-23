import { describe, expect, it } from 'vitest';
import { selectAllMetrics, toggleMetric } from '@/components/compare/MetricPickerSheet';
import { getAvailableMetrics } from '@/lib/metricsConfig';

describe('toggleMetric (Compare metric picker)', () => {
  it('adds at the end, removes in place', () => {
    expect(toggleMetric(['points', 'total_yards'], 'red_zone_td_pct')).toEqual(['points', 'total_yards', 'red_zone_td_pct']);
    expect(toggleMetric(['points', 'total_yards', 'pass_yds'], 'total_yards')).toEqual(['points', 'pass_yds']);
  });
  it('never below one, no upper limit', () => {
    expect(toggleMetric(['points'], 'points')).toEqual(['points']);
    const many = Object.keys(getAvailableMetrics('offense')).slice(0, 12);
    expect(toggleMetric(many, 'takeaways')).toEqual([...many, 'takeaways']);
  });
  it('select all keeps the picked order, appends the rest', () => {
    expect(selectAllMetrics(['c', 'a'], ['a', 'b', 'c', 'd'])).toEqual(['c', 'a', 'b', 'd']);
    expect(selectAllMetrics(['gone', 'b'], ['a', 'b'])).toEqual(['b', 'a']);
  });
});
