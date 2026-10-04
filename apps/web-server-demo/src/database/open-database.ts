import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const IN_MEMORY_DATABASE_PATH = ':memory:';

export function openDatabase(databasePath: string): DatabaseSync {
  const isFileDatabase = databasePath !== IN_MEMORY_DATABASE_PATH;
  if (isFileDatabase) mkdirSync(dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec('PRAGMA foreign_keys = ON;');
  // Write-ahead logging lets readers keep working while a write is in progress.
  if (isFileDatabase) database.exec('PRAGMA journal_mode = WAL;');
  return database;
}
