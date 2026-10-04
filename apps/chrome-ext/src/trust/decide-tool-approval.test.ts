import { describe, expect, it } from 'vitest';

import { decideToolApproval } from './decide-tool-approval';

const READ_ONLY = { readOnlyHint: true, consequentialHint: false, untrustedContentHint: false };
const WRITES = { readOnlyHint: false, consequentialHint: false, untrustedContentHint: false };
const CONSEQUENTIAL = { readOnlyHint: false, consequentialHint: true, untrustedContentHint: false };
const READ_ONLY_BUT_CONSEQUENTIAL = { ...READ_ONLY, consequentialHint: true };

describe('decideToolApproval', () => {
  it.each([
    ['read-only tool, trusted site, auto-run on', READ_ONLY, true, true, 'run-automatically'],
    ['read-only tool, trusted site, auto-run off', READ_ONLY, true, false, 'ask-user'],
    ['read-only tool, untrusted site', READ_ONLY, false, true, 'refuse'],
    ['tool that changes data, untrusted site', WRITES, false, true, 'refuse'],
    ['consequential tool, untrusted site', CONSEQUENTIAL, false, true, 'refuse'],
    ['tool that changes data, trusted site', WRITES, true, true, 'ask-user'],
    ['consequential tool, trusted site', CONSEQUENTIAL, true, true, 'ask-user'],
    [
      'tool claiming both read-only and consequential',
      READ_ONLY_BUT_CONSEQUENTIAL,
      true,
      true,
      'ask-user',
    ],
  ] as const)('%s → %s', (_label, annotations, isTrustedOrigin, autoRun, expected) => {
    expect(
      decideToolApproval({
        annotations,
        isTrustedOrigin,
        autoRunReadOnlyOnTrustedOrigins: autoRun,
      }),
    ).toBe(expected);
  });
});
