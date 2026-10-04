import { describe, expect, it, vi } from 'vitest';

import { loadBffConfig } from '../config/bff-config';
import { type AppDependencies, createApp } from './create-app';

const EXTENSION_ORIGIN = 'chrome-extension://dmnphemkaphmemfkmonbngjofhmbenck';

function createTestApp(overrides: Partial<AppDependencies> = {}) {
  return createApp({
    config: loadBffConfig({ OLLAMA_API_KEY: 'sk-test' }),
    checkOllamaHealth: vi.fn<AppDependencies['checkOllamaHealth']>().mockResolvedValue({
      reachable: true,
      authOk: true,
      modelListed: true,
    }),
    handleChat: vi.fn<AppDependencies['handleChat']>().mockResolvedValue(new Response('chat')),
    ...overrides,
  });
}

describe('createApp', () => {
  it('reports its health, including whether Ollama Cloud accepts the key', async () => {
    const response = await createTestApp().request('/api/health', {
      headers: { origin: EXTENSION_ORIGIN },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'ok',
      model: 'gpt-oss:120b',
      freeTier: true,
      ollama: { reachable: true, authOk: true, modelListed: true },
    });
  });

  it('refuses browser requests from any origin other than the extension', async () => {
    const response = await createTestApp().request('/api/health', {
      headers: { origin: 'https://evil.example' },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: 'forbidden_origin',
        message: 'Requests must come from the WebMCP Lab extension.',
      },
    });
  });

  it('allows the extension origin to call the API across origins', async () => {
    const response = await createTestApp().request('/api/chat', {
      method: 'OPTIONS',
      headers: {
        origin: EXTENSION_ORIGIN,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(EXTENSION_ORIGIN);
  });

  it('accepts requests without an Origin header (curl, scripts on this machine)', async () => {
    const response = await createTestApp().request('/api/health');

    expect(response.status).toBe(200);
  });

  it('passes chat requests to the chat handler', async () => {
    const handleChat = vi
      .fn<AppDependencies['handleChat']>()
      .mockResolvedValue(new Response('streamed'));
    const response = await createTestApp({ handleChat }).request('/api/chat', {
      method: 'POST',
      headers: { origin: EXTENSION_ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ hello: 'world' }),
    });

    expect(await response.text()).toBe('streamed');
    expect(handleChat).toHaveBeenCalledOnce();
  });

  it('rejects chat bodies larger than the limit', async () => {
    const response = await createTestApp().request('/api/chat', {
      method: 'POST',
      headers: { origin: EXTENSION_ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(2_100_000) }),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: { code: 'payload_too_large' } });
  });

  it('answers unknown routes with 404', async () => {
    expect((await createTestApp().request('/nope')).status).toBe(404);
  });
});
