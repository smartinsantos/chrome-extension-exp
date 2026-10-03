import { describe, expect, it } from 'vitest';

import { describeConfigForLogs, loadBffConfig } from './bff-config';

const SECRET_KEY = 'sk-test-secret-123';

describe('loadBffConfig', () => {
  it('uses safe defaults around the required API key', () => {
    expect(loadBffConfig({ OLLAMA_API_KEY: SECRET_KEY })).toEqual({
      ollamaApiKey: SECRET_KEY,
      ollamaBaseUrl: 'https://ollama.com',
      model: 'gpt-oss:120b',
      isFreeTierModel: true,
      think: 'low',
      port: 8787,
      allowedOrigins: ['chrome-extension://dmnphemkaphmemfkmonbngjofhmbenck'],
      maxToolResultChars: 20_000,
    });
  });

  it('explains how to fix a missing API key', () => {
    expect(() => loadBffConfig({})).toThrow(/OLLAMA_API_KEY.*\.env/s);
  });

  it('refuses a model outside the free tier unless explicitly allowed', () => {
    expect(() => loadBffConfig({ OLLAMA_API_KEY: SECRET_KEY, AI_MODEL: 'kimi-k3' })).toThrow(
      /kimi-k3.*gpt-oss:120b/s,
    );
    expect(
      loadBffConfig({
        OLLAMA_API_KEY: SECRET_KEY,
        AI_MODEL: 'kimi-k3',
        AI_ALLOW_ANY_MODEL: 'true',
      }),
    ).toMatchObject({ model: 'kimi-k3', isFreeTierModel: false });
  });

  it('reads a comma-separated list of allowed origins', () => {
    const config = loadBffConfig({
      OLLAMA_API_KEY: SECRET_KEY,
      ALLOWED_ORIGINS: 'chrome-extension://aaa, chrome-extension://bbb',
    });

    expect(config.allowedOrigins).toEqual(['chrome-extension://aaa', 'chrome-extension://bbb']);
  });

  it('never puts the API key in an error message', () => {
    expect(() => loadBffConfig({ OLLAMA_API_KEY: SECRET_KEY, PORT: 'not-a-port' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(SECRET_KEY) }),
    );
  });
});

describe('describeConfigForLogs', () => {
  it('hides the API key', () => {
    const description = describeConfigForLogs(loadBffConfig({ OLLAMA_API_KEY: SECRET_KEY }));

    expect(description).not.toContain(SECRET_KEY);
    expect(description).toContain('gpt-oss:120b');
  });
});
