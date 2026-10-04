import type { DatabaseSync } from 'node:sqlite';

import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { CLOCK, createFixedClock } from '../clock/clock.js';
import { SERVER_CONFIG, type ServerConfig } from '../config/server-config.js';
import { DATABASE } from './database.tokens.js';
import { DatabaseModule } from './database.module.js';

const inMemoryConfig: ServerConfig = {
  port: 0,
  databasePath: ':memory:',
  corsOrigin: 'http://localhost:5173',
};

describe('DatabaseModule', () => {
  it('provides a migrated, seeded database and closes it when the app shuts down', async () => {
    const testingModule = await Test.createTestingModule({ imports: [DatabaseModule] })
      .overrideProvider(SERVER_CONFIG)
      .useValue(inMemoryConfig)
      .overrideProvider(CLOCK)
      .useValue(createFixedClock('2026-10-03'))
      .compile();
    await testingModule.init();

    const database = testingModule.get<DatabaseSync>(DATABASE);
    const boardCount = database.prepare('SELECT COUNT(*) AS total FROM boards').get();
    expect(Number(boardCount?.['total'])).toBe(2);

    await testingModule.close();
    expect(database.isOpen).toBe(false);
  });
});
