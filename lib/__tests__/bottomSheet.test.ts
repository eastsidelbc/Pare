import { describe, it, expect } from 'vitest';
import { shouldCloseSheet } from '@/components/ui/BottomSheet';

describe('shouldCloseSheet (swipe-down release)', () => {
  it('short slow drag → springs back', () => expect(shouldCloseSheet(60, 100, 400)).toBe(false));
  it('past 25% of the height → closes', () => expect(shouldCloseSheet(101, 0, 400)).toBe(true));
  it('quick flick closes even when short', () => expect(shouldCloseSheet(30, 800, 400)).toBe(true));
  it('dragging up never closes', () => expect(shouldCloseSheet(-50, -900, 400)).toBe(false));
});
