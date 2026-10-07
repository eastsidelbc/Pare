import { describe, it, expect } from 'vitest';
import { createCallBudget } from '../apiCache';

describe('createCallBudget (limiter)', () => {
  it('allows `limit` calls per window, then refuses', () => {
    const clock = 0;
    const budget = createCallBudget({ limit: 3, windowMs: 60_000, now: () => clock });
    expect([budget.tryTake(), budget.tryTake(), budget.tryTake()]).toEqual([true, true, true]);
    expect(budget.tryTake()).toBe(false);
    expect(budget.remaining()).toBe(0);
  });

  it('is a sliding window: calls free up as they age out', () => {
    let clock = 0;
    const budget = createCallBudget({ limit: 2, windowMs: 1_000, now: () => clock });
    budget.tryTake(); // t=0
    clock = 600;
    budget.tryTake(); // t=600
    expect(budget.tryTake()).toBe(false);
    clock = 1_000; // t=0 call ages out
    expect(budget.remaining()).toBe(1);
    expect(budget.tryTake()).toBe(true);
    expect(budget.tryTake()).toBe(false);
    clock = 1_600; // t=600 call ages out
    expect(budget.tryTake()).toBe(true);
  });

  it('refused calls do not consume budget', () => {
    let clock = 0;
    const budget = createCallBudget({ limit: 1, windowMs: 1_000, now: () => clock });
    budget.tryTake();
    for (let i = 0; i < 5; i++) budget.tryTake();
    clock = 1_000;
    expect(budget.remaining()).toBe(1);
  });
});
