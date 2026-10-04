import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import { openDatabase } from './open-database.js';
import {
  type Migration,
  loadMigrationsFromDirectory,
  readSchemaVersion,
  runMigrations,
} from './run-migrations.js';

const createNotesTable: Migration = {
  version: 1,
  name: '001-create-notes',
  sql: 'CREATE TABLE notes (id INTEGER PRIMARY KEY, text TEXT NOT NULL);',
};
const addNotesAuthor: Migration = {
  version: 2,
  name: '002-add-notes-author',
  sql: "ALTER TABLE notes ADD COLUMN author TEXT NOT NULL DEFAULT 'me';",
};

function tableNames(database: DatabaseSync): string[] {
  return database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => String(row['name']));
}

describe('runMigrations', () => {
  it('applies pending migrations in version order and records the new schema version', () => {
    const database = new DatabaseSync(':memory:');

    const schemaVersion = runMigrations(database, [addNotesAuthor, createNotesTable]);

    expect(schemaVersion).toBe(2);
    expect(readSchemaVersion(database)).toBe(2);
    database.exec("INSERT INTO notes (text) VALUES ('hello')");
    expect(database.prepare('SELECT author FROM notes').get()).toEqual({ author: 'me' });
  });

  it('skips migrations that were already applied', () => {
    const database = new DatabaseSync(':memory:');
    runMigrations(database, [createNotesTable]);

    expect(() => runMigrations(database, [createNotesTable, addNotesAuthor])).not.toThrow();
    expect(readSchemaVersion(database)).toBe(2);
  });

  it('rolls back a failing migration completely and names it in the error', () => {
    const database = new DatabaseSync(':memory:');
    const brokenMigration: Migration = {
      version: 1,
      name: '001-broken',
      sql: 'CREATE TABLE half_done (id INTEGER); THIS IS NOT SQL;',
    };

    expect(() => runMigrations(database, [brokenMigration])).toThrow(/001-broken/);
    expect(tableNames(database)).toEqual([]);
    expect(readSchemaVersion(database)).toBe(0);
  });

  it('refuses two migrations with the same version', () => {
    const database = new DatabaseSync(':memory:');
    const duplicateVersion: Migration = { ...addNotesAuthor, version: 1 };

    expect(() => runMigrations(database, [createNotesTable, duplicateVersion])).toThrow(
      /version 1/,
    );
  });
});

describe('loadMigrationsFromDirectory', () => {
  it('loads the app schema, which creates every table the board domain needs', () => {
    const database = openDatabase(':memory:');

    runMigrations(database, loadMigrationsFromDirectory());

    expect(tableNames(database)).toEqual([
      'board_lists',
      'boards',
      'card_labels',
      'cards',
      'labels',
    ]);
  });
});

describe('openDatabase', () => {
  it('enforces foreign keys', () => {
    const database = openDatabase(':memory:');
    runMigrations(database, loadMigrationsFromDirectory());

    expect(() =>
      database.exec(
        "INSERT INTO board_lists (id, board_id, name, position, created_at) VALUES ('l1', 'missing-board', 'To Do', 0, '2026-10-03T00:00:00.000Z')",
      ),
    ).toThrow(/FOREIGN KEY/);
  });
});
