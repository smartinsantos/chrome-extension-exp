import { describe, expect, it } from 'vitest';

import { loadServerConfig } from './server-config.js';

describe('loadServerConfig', () => {
  it('uses sensible local-development defaults when nothing is set', () => {
    expect(loadServerConfig({})).toEqual({
      port: 4000,
      databasePath: 'data/dev.sqlite',
      corsOrigin: 'http://localhost:5173',
    });
  });

  it('reads every value from the environment', () => {
    const config = loadServerConfig({
      PORT: '4100',
      DATABASE_PATH: ':memory:',
      CORS_ORIGIN: 'http://localhost:5174',
    });

    expect(config).toEqual({
      port: 4100,
      databasePath: ':memory:',
      corsOrigin: 'http://localhost:5174',
    });
  });

  it('names the variable when a value is invalid', () => {
    expect(() => loadServerConfig({ PORT: 'four thousand' })).toThrow(/PORT/);
  });
});
