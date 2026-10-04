import { readdirSync, readFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATION_FILE_PATTERN = /^(\d+)-[\w-]+\.sql$/;
const MIGRATIONS_DIRECTORY = fileURLToPath(new URL('./migrations/', import.meta.url));

/** Reads `NNN-description.sql` files; the number is the schema version the file upgrades to. */
export function loadMigrationsFromDirectory(directory = MIGRATIONS_DIRECTORY): Migration[] {
  return readdirSync(directory)
    .map((fileName) => ({ fileName, match: MIGRATION_FILE_PATTERN.exec(fileName) }))
    .filter(({ match }) => match !== null)
    .map(({ fileName, match }) => ({
      version: Number(match?.[1]),
      name: fileName.replace(/\.sql$/, ''),
      sql: readFileSync(`${directory}/${fileName}`, 'utf8'),
    }));
}

/** SQLite keeps a free integer in every database file (`user_version`); we use it as the schema version. */
export function readSchemaVersion(database: DatabaseSync): number {
  const row = database.prepare('PRAGMA user_version').get();
  return Number(row?.['user_version'] ?? 0);
}

/**
 * Applies every migration newer than the database's schema version, oldest first. Each one runs
 * in its own transaction together with the version bump, so a failure leaves no partial changes.
 */
export function runMigrations(database: DatabaseSync, migrations: readonly Migration[]): number {
  const migrationsInOrder = migrations.toSorted((first, second) => first.version - second.version);
  assertUniqueVersions(migrationsInOrder);

  const currentVersion = readSchemaVersion(database);
  for (const migration of migrationsInOrder) {
    if (migration.version <= currentVersion) continue;
    database.exec('BEGIN');
    try {
      database.exec(migration.sql);
      database.exec(`PRAGMA user_version = ${migration.version}`);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw new Error(`Migration ${migration.name} failed and was rolled back.`, { cause: error });
    }
  }
  return readSchemaVersion(database);
}

function assertUniqueVersions(migrationsInOrder: readonly Migration[]): void {
  for (const [index, migration] of migrationsInOrder.entries()) {
    const previous = migrationsInOrder[index - 1];
    if (previous?.version === migration.version) {
      throw new Error(
        `Migrations ${previous.name} and ${migration.name} both use version ${migration.version}.`,
      );
    }
  }
}
