import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { CLOCK, createFixedClock } from '../src/clock/clock.js';
import { SERVER_CONFIG, type ServerConfig } from '../src/config/server-config.js';

export interface GraphqlResponse<TData> {
  data?: TData;
  errors?: { message: string; extensions?: Record<string, unknown> }[];
}

/** The full app on a fresh, seeded in-memory database, with "today" pinned for overdue checks. */
export async function createTestApp(options: { today: string }): Promise<INestApplication> {
  const testConfig: ServerConfig = {
    port: 0,
    databasePath: ':memory:',
    corsOrigin: 'http://localhost:5173',
  };
  const testingModule = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SERVER_CONFIG)
    .useValue(testConfig)
    .overrideProvider(CLOCK)
    .useValue(createFixedClock(options.today))
    .compile();
  const app = testingModule.createNestApplication({ logger: false });
  await app.init();
  return app;
}

export async function sendGraphql<TData>(
  app: INestApplication,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GraphqlResponse<TData>> {
  const response = await request(app.getHttpServer())
    .post('/graphql')
    .send({ query, variables })
    .expect(200);
  return response.body as GraphqlResponse<TData>;
}
