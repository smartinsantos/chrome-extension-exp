import { describe, expect, it } from 'vitest';

import { apiErrorBodySchema, createApiErrorBody } from './api-error';

describe('createApiErrorBody', () => {
  it('wraps a code and message in the shared error envelope', () => {
    expect(
      createApiErrorBody('forbidden_origin', 'Requests must come from the extension.'),
    ).toEqual({
      error: { code: 'forbidden_origin', message: 'Requests must come from the extension.' },
    });
  });

  it('includes details only when they are provided', () => {
    const body = createApiErrorBody('invalid_request', 'Body is invalid.', {
      field: 'pageContext',
    });

    expect(body.error.details).toEqual({ field: 'pageContext' });
  });
});

describe('apiErrorBodySchema', () => {
  it('recognizes an error body produced by createApiErrorBody', () => {
    const body = createApiErrorBody('usage_exhausted', 'Free usage is used up.');

    expect(apiErrorBodySchema.safeParse(body).success).toBe(true);
  });

  it('rejects an unknown error code so clients never show an unhandled state', () => {
    const body = { error: { code: 'something_new', message: 'Unknown' } };

    expect(apiErrorBodySchema.safeParse(body).success).toBe(false);
  });
});
