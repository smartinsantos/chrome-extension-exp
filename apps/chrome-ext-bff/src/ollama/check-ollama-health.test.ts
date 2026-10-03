import { describe, expect, it, vi } from 'vitest';

import { createOllamaHealthCheck } from './check-ollama-health';

const BASE_URL = 'https://ollama.com';

/** Answers the way Ollama Cloud does (checked against the live service). */
function fakeOllama(options: { models?: string[]; offline?: boolean }) {
  return vi.fn<typeof fetch>(async (input, init) => {
    if (options.offline === true) throw new TypeError('fetch failed');
    const url = input instanceof Request ? input.url : input.toString();
    const hasGoodKey = new Headers(init?.headers).get('authorization') === 'Bearer good-key';
    if (url === `${BASE_URL}/api/tags`) {
      return Response.json({ models: (options.models ?? []).map((name) => ({ name })) });
    }
    if (url === `${BASE_URL}/api/me`) {
      if (init?.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
      return hasGoodKey
        ? Response.json({ Name: 'someone', Email: 'someone@example.com', Plan: 'free' })
        : Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    // Ollama Cloud doesn't serve the local running-models list, even to a valid key.
    if (url === `${BASE_URL}/api/ps`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    return new Response('not found', { status: 404 });
  });
}

describe('createOllamaHealthCheck', () => {
  it('reports a reachable service, an accepted key and a listed model', async () => {
    const checkHealth = createOllamaHealthCheck({
      baseUrl: BASE_URL,
      apiKey: 'good-key',
      model: 'gpt-oss:120b',
      fetchImplementation: fakeOllama({ models: ['gpt-oss:20b', 'gpt-oss:120b'] }),
    });

    expect(await checkHealth()).toEqual({ reachable: true, authOk: true, modelListed: true });
  });

  it('notices a rejected key and a model that is not offered', async () => {
    const checkHealth = createOllamaHealthCheck({
      baseUrl: BASE_URL,
      apiKey: 'wrong-key',
      model: 'made-up-model',
      fetchImplementation: fakeOllama({ models: ['gpt-oss:20b'] }),
    });

    expect(await checkHealth()).toEqual({ reachable: true, authOk: false, modelListed: false });
  });

  it('reports an unreachable service without throwing', async () => {
    const checkHealth = createOllamaHealthCheck({
      baseUrl: BASE_URL,
      apiKey: 'good-key',
      model: 'gpt-oss:120b',
      fetchImplementation: fakeOllama({ offline: true }),
    });

    expect(await checkHealth()).toEqual({ reachable: false, authOk: false, modelListed: false });
  });

  it('reuses a recent answer instead of calling Ollama on every health request', async () => {
    const fetchImplementation = fakeOllama({ models: ['gpt-oss:120b'] });
    let now = 0;
    const checkHealth = createOllamaHealthCheck({
      baseUrl: BASE_URL,
      apiKey: 'good-key',
      model: 'gpt-oss:120b',
      fetchImplementation,
      cacheDurationMs: 60_000,
      now: () => now,
    });

    await checkHealth();
    now = 30_000;
    await checkHealth();
    expect(fetchImplementation).toHaveBeenCalledTimes(2);

    now = 61_000;
    await checkHealth();
    expect(fetchImplementation).toHaveBeenCalledTimes(4);
  });
});
