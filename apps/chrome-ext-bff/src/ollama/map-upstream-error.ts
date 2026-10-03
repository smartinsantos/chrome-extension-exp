import type { ApiErrorCode } from '@repo/agent-protocol';

export interface UpstreamFailure {
  httpStatus: 402 | 502 | 503;
  code: Extract<
    ApiErrorCode,
    'upstream_auth' | 'usage_exhausted' | 'upstream_busy' | 'upstream_unreachable'
  >;
  message: string;
}

const USAGE_LIMIT_PATTERN = /usage|quota|credit|limit reached|upgrade/i;
const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNRESET',
  'EAI_AGAIN',
]);

/**
 * Turns a failed call to Ollama Cloud into an error the side panel can explain, or returns
 * undefined when the error didn't come from Ollama (those are real bugs and stay 500s).
 */
export function mapUpstreamError(error: unknown): UpstreamFailure | undefined {
  if (!(error instanceof Error)) return undefined;
  const status = readStatusCode(error);

  if (status === 401 || status === 403) {
    return {
      httpStatus: 502,
      code: 'upstream_auth',
      message:
        'Ollama Cloud rejected the API key. Check OLLAMA_API_KEY in apps/chrome-ext-bff/.env.',
    };
  }
  if (status === 402 || (status === 429 && USAGE_LIMIT_PATTERN.test(error.message))) {
    return {
      httpStatus: 402,
      code: 'usage_exhausted',
      message:
        'Your free Ollama Cloud usage is used up for now. See https://ollama.com/settings for when it resets.',
    };
  }
  if (status === 429 || status === 503 || status === 502) {
    return {
      httpStatus: 503,
      code: 'upstream_busy',
      message:
        'Ollama Cloud is busy (the free plan allows one request at a time). Try again shortly.',
    };
  }
  if (isNetworkError(error)) {
    return {
      httpStatus: 503,
      code: 'upstream_unreachable',
      message: 'Could not reach Ollama Cloud. Check your internet connection.',
    };
  }
  return undefined;
}

/** The Ollama client uses `status_code`; AI SDK errors use `statusCode`. */
function readStatusCode(error: Error): number | undefined {
  for (const field of ['status_code', 'statusCode', 'status']) {
    const value: unknown = Reflect.get(error, field);
    if (typeof value === 'number') return value;
  }
  return undefined;
}

function isNetworkError(error: Error): boolean {
  const code: unknown = Reflect.get(error, 'code');
  return (
    (error instanceof TypeError && error.message.includes('fetch failed')) ||
    (typeof code === 'string' && NETWORK_ERROR_CODES.has(code))
  );
}
