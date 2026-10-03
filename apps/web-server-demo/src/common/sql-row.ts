import type { SQLOutputValue } from 'node:sqlite';

/** One row as returned by `node:sqlite`; the readers below turn columns into typed values. */
export type SqlRow = Record<string, SQLOutputValue>;

export function readText(row: SqlRow, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') throw new TypeError(`Column "${column}" is not text.`);
  return value;
}

export function readNullableText(row: SqlRow, column: string): string | null {
  const value = row[column];
  return value === null || value === undefined ? null : readText(row, column);
}

export function readInteger(row: SqlRow, column: string): number {
  const value = row[column];
  if (typeof value === 'bigint') return Number(value);
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(`Column "${column}" is not an integer.`);
  }
  return value;
}

/** SQLite has no boolean type; this project stores booleans as 0 or 1. */
export function readBoolean(row: SqlRow, column: string): boolean {
  return readInteger(row, column) === 1;
}
