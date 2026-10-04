import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TRUSTED_ORIGINS,
  isOriginTrusted,
  readExtensionSettings,
  setOriginTrust,
  updateExtensionSettings,
} from './extension-settings';

describe('extension settings', () => {
  it('starts with safe defaults', async () => {
    expect(await readExtensionSettings()).toEqual({
      bffUrl: 'http://127.0.0.1:8787',
      autoRunReadOnlyOnTrustedOrigins: true,
      trustedOrigins: DEFAULT_TRUSTED_ORIGINS,
    });
    expect(DEFAULT_TRUSTED_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('saves changes', async () => {
    await updateExtensionSettings({
      bffUrl: 'http://127.0.0.1:9000',
      autoRunReadOnlyOnTrustedOrigins: false,
    });

    expect(await readExtensionSettings()).toMatchObject({
      bffUrl: 'http://127.0.0.1:9000',
      autoRunReadOnlyOnTrustedOrigins: false,
    });
  });

  it('trusts and untrusts an origin, ignoring paths and duplicates', async () => {
    await setOriginTrust('https://example.com/some/page', true);
    await setOriginTrust('https://example.com', true);

    expect(await isOriginTrusted('https://example.com')).toBe(true);
    expect((await readExtensionSettings()).trustedOrigins).toEqual([
      'http://localhost:5173',
      'https://example.com',
    ]);

    await setOriginTrust('https://example.com', false);
    expect(await isOriginTrusted('https://example.com')).toBe(false);
  });

  it('never trusts something that is not a web origin', async () => {
    await setOriginTrust('chrome://settings', true);

    expect(await isOriginTrusted('chrome://settings')).toBe(false);
  });
});
