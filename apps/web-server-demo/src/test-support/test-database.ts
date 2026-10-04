import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import { openDatabase } from '../database/open-database.js';
import { loadMigrationsFromDirectory, runMigrations } from '../database/run-migrations.js';

/** A fresh, migrated, empty in-memory database for each test. */
export function createTestDatabase(): DatabaseSync {
  const database = openDatabase(':memory:');
  runMigrations(database, loadMigrationsFromDirectory());
  return database;
}

const FIXTURE_TIMESTAMP = '2026-10-01T09:00:00.000Z';

export function insertTestBoard(database: DatabaseSync, name = 'Test board'): string {
  const boardId = randomUUID();
  database
    .prepare('INSERT INTO boards (id, name, created_at) VALUES (?, ?, ?)')
    .run(boardId, name, FIXTURE_TIMESTAMP);
  return boardId;
}

export function insertTestList(
  database: DatabaseSync,
  boardId: string,
  name: string,
  position: number,
): string {
  const listId = randomUUID();
  database
    .prepare(
      'INSERT INTO board_lists (id, board_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(listId, boardId, name, position, FIXTURE_TIMESTAMP);
  return listId;
}

export function insertTestLabel(
  database: DatabaseSync,
  boardId: string,
  name: string,
  color = 'BLUE',
): string {
  const labelId = randomUUID();
  database
    .prepare('INSERT INTO labels (id, board_id, name, color) VALUES (?, ?, ?, ?)')
    .run(labelId, boardId, name, color);
  return labelId;
}

export interface TestCardOptions {
  title?: string;
  position: number;
  dueDate?: string | null;
  isDueComplete?: boolean;
  archivedAt?: string | null;
}

export function insertTestCard(
  database: DatabaseSync,
  listId: string,
  options: TestCardOptions,
): string {
  const cardId = randomUUID();
  database
    .prepare(
      `INSERT INTO cards (id, list_id, title, description, due_date, is_due_complete, position, archived_at, created_at, updated_at)
       VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      cardId,
      listId,
      options.title ?? `Card ${options.position}`,
      options.dueDate ?? null,
      options.isDueComplete === true ? 1 : 0,
      options.position,
      options.archivedAt ?? null,
      FIXTURE_TIMESTAMP,
      FIXTURE_TIMESTAMP,
    );
  return cardId;
}
