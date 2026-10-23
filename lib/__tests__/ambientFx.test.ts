import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AMBIENT_IDLE_MS, isAmbientPaused, pauseAmbientFor, resumeAmbient } from '../ambientFx';

describe('ambientFx gate', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    resumeAmbient('swipe');
    resumeAmbient('scroll');
    vi.useRealTimers();
  });

  it('starts running', () => {
    expect(isAmbientPaused()).toBe(false);
  });

  it('pauses on motion and resumes after the idle window', () => {
    pauseAmbientFor('scroll');
    expect(isAmbientPaused()).toBe(true);
    vi.advanceTimersByTime(AMBIENT_IDLE_MS - 1);
    expect(isAmbientPaused()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isAmbientPaused()).toBe(false);
  });

  it('each motion event extends the pause', () => {
    pauseAmbientFor('swipe');
    vi.advanceTimersByTime(AMBIENT_IDLE_MS - 10);
    pauseAmbientFor('swipe');
    vi.advanceTimersByTime(AMBIENT_IDLE_MS - 10);
    expect(isAmbientPaused()).toBe(true);
    vi.advanceTimersByTime(10);
    expect(isAmbientPaused()).toBe(false);
  });

  it('stays paused until every reason has cleared', () => {
    pauseAmbientFor('swipe', 100);
    pauseAmbientFor('scroll', 300);
    vi.advanceTimersByTime(100);
    expect(isAmbientPaused()).toBe(true); // scroll still moving
    vi.advanceTimersByTime(200);
    expect(isAmbientPaused()).toBe(false);
  });

  it('resumeAmbient clears a reason immediately', () => {
    pauseAmbientFor('scroll');
    resumeAmbient('scroll');
    expect(isAmbientPaused()).toBe(false);
    resumeAmbient('scroll'); // idempotent
    expect(isAmbientPaused()).toBe(false);
  });
});
