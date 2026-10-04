import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import { Inject, Injectable } from '@nestjs/common';

import { type SqlRow, readInteger, readText } from '../common/sql-row.js';
import { DATABASE } from '../database/database.tokens.js';
import { runInTransaction } from '../database/run-in-transaction.js';
import type { BoardListRecord, BoardRecord } from './board.records.js';

@Injectable()
export class BoardsRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseSync) {}

  listBoards(): BoardRecord[] {
    return this.database
      .prepare('SELECT * FROM boards ORDER BY created_at, rowid')
      .all()
      .map(toBoardRecord);
  }

  findBoardById(boardId: string): BoardRecord | undefined {
    const row = this.database.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
    return row === undefined ? undefined : toBoardRecord(row);
  }

  findBoardByName(boardName: string): BoardRecord | undefined {
    const row = this.database
      .prepare('SELECT * FROM boards WHERE name = ? COLLATE NOCASE ORDER BY created_at LIMIT 1')
      .get(boardName.trim());
    return row === undefined ? undefined : toBoardRecord(row);
  }

  createBoardWithLists(name: string, listNames: readonly string[], createdAt: string): BoardRecord {
    const board: BoardRecord = { id: randomUUID(), name, createdAt };
    runInTransaction(this.database, () => {
      this.database
        .prepare('INSERT INTO boards (id, name, created_at) VALUES (?, ?, ?)')
        .run(board.id, board.name, board.createdAt);
      for (const [position, listName] of listNames.entries()) {
        this.insertList(board.id, listName, position, createdAt);
      }
    });
    return board;
  }

  listListsForBoard(boardId: string): BoardListRecord[] {
    return this.database
      .prepare('SELECT * FROM board_lists WHERE board_id = ? ORDER BY position')
      .all(boardId)
      .map(toBoardListRecord);
  }

  findListById(listId: string): BoardListRecord | undefined {
    const row = this.database.prepare('SELECT * FROM board_lists WHERE id = ?').get(listId);
    return row === undefined ? undefined : toBoardListRecord(row);
  }

  findListByName(boardId: string, listName: string): BoardListRecord | undefined {
    const row = this.database
      .prepare(
        'SELECT * FROM board_lists WHERE board_id = ? AND name = ? COLLATE NOCASE ORDER BY position LIMIT 1',
      )
      .get(boardId, listName.trim());
    return row === undefined ? undefined : toBoardListRecord(row);
  }

  createList(boardId: string, name: string, createdAt: string): BoardListRecord {
    const row = this.database
      .prepare(
        'SELECT COALESCE(MAX(position) + 1, 0) AS next_position FROM board_lists WHERE board_id = ?',
      )
      .get(boardId);
    const nextPosition = row === undefined ? 0 : readInteger(row, 'next_position');
    return this.insertList(boardId, name, nextPosition, createdAt);
  }

  countLists(boardId: string): number {
    const row = this.database
      .prepare('SELECT COUNT(*) AS total FROM board_lists WHERE board_id = ?')
      .get(boardId);
    return row === undefined ? 0 : readInteger(row, 'total');
  }

  countActiveCards(boardId: string): number {
    const row = this.database
      .prepare(
        `SELECT COUNT(*) AS total FROM cards
         JOIN board_lists ON board_lists.id = cards.list_id
         WHERE board_lists.board_id = ? AND cards.archived_at IS NULL`,
      )
      .get(boardId);
    return row === undefined ? 0 : readInteger(row, 'total');
  }

  private insertList(
    boardId: string,
    name: string,
    position: number,
    createdAt: string,
  ): BoardListRecord {
    const list: BoardListRecord = { id: randomUUID(), boardId, name, position, createdAt };
    this.database
      .prepare(
        'INSERT INTO board_lists (id, board_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(list.id, list.boardId, list.name, list.position, list.createdAt);
    return list;
  }
}

function toBoardRecord(row: SqlRow): BoardRecord {
  return {
    id: readText(row, 'id'),
    name: readText(row, 'name'),
    createdAt: readText(row, 'created_at'),
  };
}

function toBoardListRecord(row: SqlRow): BoardListRecord {
  return {
    id: readText(row, 'id'),
    boardId: readText(row, 'board_id'),
    name: readText(row, 'name'),
    position: readInteger(row, 'position'),
    createdAt: readText(row, 'created_at'),
  };
}
