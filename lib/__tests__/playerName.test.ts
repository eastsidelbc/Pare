import { describe, expect, it } from 'vitest';
import { shortPlayerName } from '../playerName';

describe('shortPlayerName', () => {
  it('turns the first name into an initial', () => {
    expect(shortPlayerName('Jaxon Smith-Njigba')).toBe('J. Smith-Njigba');
    expect(shortPlayerName("Ja'Marr Chase")).toBe('J. Chase');
    expect(shortPlayerName('Amon-Ra St. Brown')).toBe('A. St. Brown');
    expect(shortPlayerName('Marvin Harrison Jr.')).toBe('M. Harrison Jr.');
  });

  it('keeps first names that are already initials or short nicknames', () => {
    expect(shortPlayerName('C.J. Stroud')).toBe('C.J. Stroud');
    expect(shortPlayerName('A.J. Brown')).toBe('A.J. Brown');
    expect(shortPlayerName('DK Metcalf')).toBe('DK Metcalf');
  });

  it('leaves single-word names alone', () => {
    expect(shortPlayerName('Steelers')).toBe('Steelers');
    expect(shortPlayerName('  49ers ')).toBe('49ers');
  });
});
