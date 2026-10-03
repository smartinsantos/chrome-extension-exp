import { describe, expect, it } from 'vitest';

import { mapUpstreamError } from './map-upstream-error';

function errorWithStatus(status: number, message: string) {
  return Object.assign(new Error(message), { status_code: status });
}

describe('mapUpstreamError', () => {
  it.each([
    [errorWithStatus(401, 'Unauthorized'), 502, 'upstream_auth'],
    [errorWithStatus(403, 'Forbidden'), 502, 'upstream_auth'],
    [errorWithStatus(402, 'Payment required'), 402, 'usage_exhausted'],
    [errorWithStatus(429, 'You have reached your usage limit'), 402, 'usage_exhausted'],
    [errorWithStatus(429, 'Too many requests'), 503, 'upstream_busy'],
    [errorWithStatus(503, 'Service unavailable'), 503, 'upstream_busy'],
    [new TypeError('fetch failed'), 503, 'upstream_unreachable'],
    [
      Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
      503,
      'upstream_unreachable',
    ],
  ])('maps %s to HTTP %i %s', (error, expectedStatus, expectedCode) => {
    expect(mapUpstreamError(error)).toMatchObject({
      httpStatus: expectedStatus,
      code: expectedCode,
    });
  });

  it('also reads AI SDK style statusCode fields', () => {
    expect(mapUpstreamError(Object.assign(new Error('x'), { statusCode: 401 }))).toMatchObject({
      code: 'upstream_auth',
    });
  });

  it('gives every code a message that says what to do', () => {
    expect(mapUpstreamError(errorWithStatus(401, 'Unauthorized'))?.message).toMatch(
      /OLLAMA_API_KEY/,
    );
    expect(mapUpstreamError(errorWithStatus(402, 'x'))?.message).toMatch(/ollama\.com\/settings/);
  });

  it('returns undefined for errors that did not come from Ollama', () => {
    expect(mapUpstreamError(new Error('Something else broke'))).toBeUndefined();
  });
});
