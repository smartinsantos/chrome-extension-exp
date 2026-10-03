import { describe, expect, it } from 'vitest';

import { stableHash } from './stable-hash';

describe('stableHash', () => {
  it('returns the same hash for the same text every time', () => {
    expect(stableHash('cards.move')).toBe(stableHash('cards.move'));
  });

  it('returns exactly seven lowercase base-36 characters', () => {
    for (const text of ['', 'a', 'cards.move', 'ü-emoji-🚀', 'x'.repeat(10_000)]) {
      expect(stableHash(text)).toMatch(/^[0-9a-z]{7}$/);
    }
  });

  it('returns different hashes for different texts', () => {
    expect(stableHash('a')).not.toBe(stableHash('b'));
    expect(stableHash('cards.move')).not.toBe(stableHash('cards move'));
  });

  it('hashes the UTF-8 bytes, so visually similar strings stay distinct', () => {
    const composedAccent = 'café';
    const decomposedAccent = 'café';
    expect(stableHash(composedAccent)).not.toBe(stableHash(decomposedAccent));
  });
});
