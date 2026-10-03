import { readFileSync } from 'node:fs';

import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { printAppSchema } from '../src/graphql-schema/print-app-schema.js';
import { createTestApp } from './create-test-app.js';

const COMMITTED_SCHEMA_PATH = new URL('../schema.gql', import.meta.url);

describe('schema.gql', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ today: '2026-10-03' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('matches the schema the server actually serves (run "pnpm schema" after changing the API)', () => {
    expect(readFileSync(COMMITTED_SCHEMA_PATH, 'utf8')).toBe(printAppSchema(app));
  });
});
