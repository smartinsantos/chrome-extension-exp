import { beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';

import {
  createTestDatabase,
  insertTestBoard,
  insertTestCard,
  insertTestList,
} from '../test-support/test-database.js';
import { BoardsRepository } from './boards.repository.js';

describe('BoardsRepository', () => {
  let database: DatabaseSync;
  let boardsRepository: BoardsRepository;

  beforeEach(() => {
    database = createTestDatabase();
    boardsRepository = new BoardsRepository(database);
  });

  it("returns a board's lists in position order", () => {
    const boardId = insertTestBoard(database);
    insertTestList(database, boardId, 'Done', 2);
    insertTestList(database, boardId, 'To Do', 0);
    insertTestList(database, boardId, 'Doing', 1);

    const listNames = boardsRepository.listListsForBoard(boardId).map((list) => list.name);

    expect(listNames).toEqual(['To Do', 'Doing', 'Done']);
  });

  it('lists boards oldest first, keeping creation order for boards created at the same moment', () => {
    insertTestBoard(database, 'Zebra');
    insertTestBoard(database, 'Apple');

    expect(boardsRepository.listBoards().map((board) => board.name)).toEqual(['Zebra', 'Apple']);
  });

  it('creates a board together with its lists, in the given order', () => {
    const board = boardsRepository.createBoardWithLists(
      'Roadmap',
      ['Now', 'Next', 'Later'],
      '2026-10-03T10:00:00.000Z',
    );

    expect(board).toMatchObject({ name: 'Roadmap', createdAt: '2026-10-03T10:00:00.000Z' });
    const lists = boardsRepository.listListsForBoard(board.id);
    expect(lists.map((list) => [list.name, list.position])).toEqual([
      ['Now', 0],
      ['Next', 1],
      ['Later', 2],
    ]);
  });

  it('adds a new list after the existing ones', () => {
    const boardId = insertTestBoard(database);
    insertTestList(database, boardId, 'To Do', 0);
    insertTestList(database, boardId, 'Done', 1);

    const newList = boardsRepository.createList(boardId, 'Review', '2026-10-03T10:00:00.000Z');

    expect(newList).toMatchObject({ name: 'Review', position: 2, boardId });
  });

  it('counts active cards only, ignoring archived ones', () => {
    const boardId = insertTestBoard(database);
    const listId = insertTestList(database, boardId, 'To Do', 0);
    insertTestCard(database, listId, { position: 0 });
    insertTestCard(database, listId, { position: 1 });
    insertTestCard(database, listId, { position: 2, archivedAt: '2026-10-02T00:00:00.000Z' });

    expect(boardsRepository.countActiveCards(boardId)).toBe(2);
    expect(boardsRepository.countLists(boardId)).toBe(1);
  });

  it('finds a list by id together with its board, or nothing for an unknown id', () => {
    const boardId = insertTestBoard(database);
    const listId = insertTestList(database, boardId, 'To Do', 0);

    expect(boardsRepository.findListById(listId)).toMatchObject({ id: listId, boardId });
    expect(boardsRepository.findListById('missing')).toBeUndefined();
  });

  it('finds a list by name within a board, ignoring letter case', () => {
    const boardId = insertTestBoard(database);
    const listId = insertTestList(database, boardId, 'To Do', 0);

    expect(boardsRepository.findListByName(boardId, 'to do')?.id).toBe(listId);
    expect(boardsRepository.findListByName(boardId, 'Someday')).toBeUndefined();
  });
});
