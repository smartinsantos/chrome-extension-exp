import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TypedDocumentString } from '../gql/graphql';
import { GraphqlRequestError, executeGraphql } from './execute-graphql';

const HealthDocument = new TypedDocumentString<{ health: string }, { verbose?: boolean }>(
  'query Health { health }',
);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('executeGraphql', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('posts the query and variables to /graphql and returns the data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { health: 'ok' } }));

    const data = await executeGraphql(HealthDocument, { verbose: true });

    expect(data).toEqual({ health: 'ok' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/graphql');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(typeof init?.body === 'string' ? init.body : '')).toEqual({
      query: 'query Health { health }',
      variables: { verbose: true },
    });
  });

  it('throws the server error code and message when GraphQL reports an error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: null,
        errors: [
          {
            message: 'Card "x" was not found.',
            extensions: { code: 'NOT_FOUND', entityName: 'Card' },
          },
        ],
      }),
    );

    const error = await executeGraphql(HealthDocument).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GraphqlRequestError);
    expect(error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Card "x" was not found.',
      details: { entityName: 'Card' },
    });
  });

  it('reads GraphQL errors from a non-2xx response too (for example, a 400 validation error)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          errors: [{ message: 'Unknown field', extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }],
        },
        400,
      ),
    );

    await expect(executeGraphql(HealthDocument)).rejects.toMatchObject({
      code: 'GRAPHQL_VALIDATION_FAILED',
    });
  });

  it('reports an HTTP error when the response is not GraphQL at all', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }));

    await expect(executeGraphql(HealthDocument)).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      details: { status: 502 },
    });
  });

  it('reports a network error when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(executeGraphql(HealthDocument)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
