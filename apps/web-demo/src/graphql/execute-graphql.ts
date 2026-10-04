import type { TypedDocumentString } from '../gql/graphql';

const GRAPHQL_ENDPOINT = '/graphql';

/** Codes come from the server (`NOT_FOUND`, `BAD_USER_INPUT`, …) or describe transport failures. */
export class GraphqlRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'GraphqlRequestError';
  }
}

interface GraphqlErrorEntry {
  message: string;
  extensions?: Record<string, unknown>;
}

interface GraphqlResponseBody {
  data?: unknown;
  errors?: GraphqlErrorEntry[];
}

/**
 * Sends one GraphQL operation and returns its typed `data`. Every failure becomes a
 * `GraphqlRequestError`, so callers (UI and WebMCP tools) handle errors one way.
 */
export async function executeGraphql<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  ...[variables]: TVariables extends Record<string, never> ? [] : [TVariables?]
): Promise<TResult> {
  let response: Response;
  try {
    response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/graphql-response+json, application/json',
      },
      body: JSON.stringify({ query: document.toString(), variables: variables ?? {} }),
    });
  } catch (cause) {
    throw new GraphqlRequestError('NETWORK_ERROR', 'Could not reach the server. Is it running?', {
      cause: String(cause),
    });
  }

  const body = await readJsonBody(response);
  const firstError = body?.errors?.[0];
  if (firstError !== undefined) {
    const { code, ...details } = firstError.extensions ?? {};
    throw new GraphqlRequestError(
      typeof code === 'string' ? code : 'GRAPHQL_ERROR',
      firstError.message,
      details,
    );
  }
  if (!response.ok || body?.data === undefined || body.data === null) {
    throw new GraphqlRequestError(
      'HTTP_ERROR',
      `The server answered with HTTP ${response.status}.`,
      {
        status: response.status,
      },
    );
  }
  // The typed document describes exactly what the server returns for this operation; the schema
  // it was generated from is the contract, so this is the one place we trust that shape.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return body.data as TResult;
}

async function readJsonBody(response: Response): Promise<GraphqlResponseBody | undefined> {
  try {
    const body: unknown = await response.json();
    return isGraphqlResponseBody(body) ? body : undefined;
  } catch {
    return undefined;
  }
}

function isGraphqlResponseBody(value: unknown): value is GraphqlResponseBody {
  if (typeof value !== 'object' || value === null) return false;
  const errors: unknown = Reflect.get(value, 'errors');
  return (
    errors === undefined ||
    (Array.isArray(errors) &&
      errors.every(
        (entry: unknown) =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof Reflect.get(entry, 'message') === 'string',
      ))
  );
}
