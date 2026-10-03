import type { OllamaHealth } from '../http/create-app';

interface OllamaHealthCheckOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchImplementation?: typeof fetch;
  cacheDurationMs?: number;
  now?: () => number;
}

const DEFAULT_CACHE_DURATION_MS = 60_000;

/**
 * Checks Ollama Cloud without spending tokens: `/api/tags` (public) lists the models, and
 * `/api/ps` only answers 200 to a valid API key. Results are cached briefly, because the side
 * panel asks for health often.
 */
export function createOllamaHealthCheck({
  baseUrl,
  apiKey,
  model,
  fetchImplementation = fetch,
  cacheDurationMs = DEFAULT_CACHE_DURATION_MS,
  now = Date.now,
}: OllamaHealthCheckOptions): () => Promise<OllamaHealth> {
  let cachedHealth: { health: OllamaHealth; checkedAt: number } | undefined;

  async function checkNow(): Promise<OllamaHealth> {
    try {
      const [tagsResponse, authResponse] = await Promise.all([
        fetchImplementation(`${baseUrl}/api/tags`),
        fetchImplementation(`${baseUrl}/api/ps`, {
          headers: { authorization: `Bearer ${apiKey}` },
        }),
      ]);
      return {
        reachable: true,
        authOk: authResponse.ok,
        modelListed: tagsResponse.ok && (await listModelNames(tagsResponse)).includes(model),
      };
    } catch {
      return { reachable: false, authOk: false, modelListed: false };
    }
  }

  return async () => {
    if (cachedHealth !== undefined && now() - cachedHealth.checkedAt < cacheDurationMs) {
      return cachedHealth.health;
    }
    const health = await checkNow();
    cachedHealth = { health, checkedAt: now() };
    return health;
  };
}

async function listModelNames(tagsResponse: Response): Promise<string[]> {
  const body: unknown = await tagsResponse.json();
  const models: unknown =
    typeof body === 'object' && body !== null ? Reflect.get(body, 'models') : undefined;
  if (!Array.isArray(models)) return [];
  return models.flatMap((entry: unknown) => {
    const name: unknown =
      typeof entry === 'object' && entry !== null ? Reflect.get(entry, 'name') : undefined;
    return typeof name === 'string' ? [name] : [];
  });
}
