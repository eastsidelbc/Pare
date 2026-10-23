import { describe, expect, it } from 'vitest';
import { signedLuck } from '@/components/standings/SplitsTable';
import { pythagLuck } from '@/lib/formulas/team';

describe('Splits LUCK column', () => {
  it('rounds before signing', () => {
    expect(signedLuck(-0.04)).toBe('0.0');
    expect(signedLuck(1.06)).toBe('+1.1');
    expect(signedLuck(-0.75)).toBe('−0.8');
  });
  it('MIN 5-0, PF 140 / PA 95 (shape of the live row) → about +1.1', () => {
    const luck = pythagLuck(5, 5, 140, 95);
    expect(luck).toBeGreaterThan(0.5);
    expect(luck).toBeLessThan(1.5);
  });
});
