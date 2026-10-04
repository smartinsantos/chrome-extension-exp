import { describe, expect, it } from 'vitest';

import { addDaysToIsoDate, isValidIsoDate } from './iso-date.js';

describe('addDaysToIsoDate', () => {
  it('moves forward and backward across month and year boundaries', () => {
    expect(addDaysToIsoDate('2026-10-03', 5)).toBe('2026-10-08');
    expect(addDaysToIsoDate('2026-10-03', -3)).toBe('2026-09-30');
    expect(addDaysToIsoDate('2026-12-30', 3)).toBe('2027-01-02');
  });
});

describe('isValidIsoDate', () => {
  it.each(['2026-10-03', '2028-02-29'])('accepts the real calendar date %s', (date) => {
    expect(isValidIsoDate(date)).toBe(true);
  });

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-1-3', '03/10/2026', '', 'tomorrow'])(
    'rejects %j',
    (date) => {
      expect(isValidIsoDate(date)).toBe(false);
    },
  );
});
