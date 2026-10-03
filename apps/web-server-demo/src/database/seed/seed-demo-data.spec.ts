import { describe, expect, it } from 'vitest';

import { createFixedClock } from '../../clock/clock.js';
import { openDatabase } from '../open-database.js';
import { loadMigrationsFromDirectory, runMigrations } from '../run-migrations.js';
import { seedDemoData } from './seed-demo-data.js';

const TODAY = '2026-10-03';

function createMigratedDatabase() {
  const database = openDatabase(':memory:');
  runMigrations(database, loadMigrationsFromDirectory());
  return database;
}

function countRows(database: ReturnType<typeof openDatabase>, table: string): number {
  const row = database.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get();
  return Number(row?.['total']);
}

describe('seedDemoData', () => {
  it('creates the WebMCP Launch board with its lists in order and its labels', () => {
    const database = createMigratedDatabase();

    seedDemoData(database, createFixedClock(TODAY));

    const listNames = database
      .prepare(
        `SELECT board_lists.name FROM board_lists
         JOIN boards ON boards.id = board_lists.board_id
         WHERE boards.name = 'WebMCP Launch' ORDER BY board_lists.position`,
      )
      .all()
      .map((row) => row['name']);
    expect(listNames).toEqual(['Backlog', 'To Do', 'Doing', 'Done']);

    const labelNames = database
      .prepare(
        `SELECT labels.name FROM labels JOIN boards ON boards.id = labels.board_id
         WHERE boards.name = 'WebMCP Launch' ORDER BY labels.name`,
      )
      .all()
      .map((row) => row['name']);
    expect(labelNames).toEqual(['bug', 'docs', 'feature', 'urgent']);
  });

  it('also creates a small Personal board', () => {
    const database = createMigratedDatabase();

    seedDemoData(database, createFixedClock(TODAY));

    const boardNames = database
      .prepare('SELECT name FROM boards ORDER BY name')
      .all()
      .map((row) => row['name']);
    expect(boardNames).toEqual(['Personal', 'WebMCP Launch']);
  });

  it('includes overdue cards relative to today, so "what is overdue?" has answers', () => {
    const database = createMigratedDatabase();

    seedDemoData(database, createFixedClock(TODAY));

    const overdueRow = database
      .prepare(
        'SELECT COUNT(*) AS total FROM cards WHERE due_date < ? AND is_due_complete = 0 AND archived_at IS NULL',
      )
      .get(TODAY);
    expect(Number(overdueRow?.['total'])).toBeGreaterThanOrEqual(2);
  });

  it('gives cards in each list consecutive positions starting at 0', () => {
    const database = createMigratedDatabase();

    seedDemoData(database, createFixedClock(TODAY));

    const gaps = database
      .prepare(
        `SELECT list_id, COUNT(*) AS card_count, MIN(position) AS lowest, MAX(position) AS highest
         FROM cards WHERE archived_at IS NULL GROUP BY list_id`,
      )
      .all()
      .filter(
        (row) =>
          Number(row['lowest']) !== 0 || Number(row['highest']) !== Number(row['card_count']) - 1,
      );
    expect(gaps).toEqual([]);
  });

  it('does nothing when boards already exist, so restarting the server keeps your data', () => {
    const database = createMigratedDatabase();
    seedDemoData(database, createFixedClock(TODAY));
    const cardCountAfterFirstSeed = countRows(database, 'cards');

    seedDemoData(database, createFixedClock(TODAY));

    expect(countRows(database, 'cards')).toBe(cardCountAfterFirstSeed);
    expect(countRows(database, 'boards')).toBe(2);
  });
});
