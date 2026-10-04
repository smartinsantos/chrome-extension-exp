import type { DatabaseSync } from 'node:sqlite';

/** Runs `work` atomically: either every statement inside it is saved, or none is. */
export function runInTransaction<TResult>(database: DatabaseSync, work: () => TResult): TResult {
  database.exec('BEGIN');
  try {
    const result = work();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
