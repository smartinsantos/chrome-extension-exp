import { GraphQLError } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';

import { createFixedClock } from '../clock/clock.js';
import { createTestDatabase } from '../test-support/test-database.js';
import { BoardsRepository } from './boards.repository.js';
import { BoardsService } from './boards.service.js';

function errorCodeOf(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error instanceof GraphQLError ? error.extensions['code'] : error;
  }
  return 'no error thrown';
}

describe('BoardsService', () => {
  let boardsRepository: BoardsRepository;
  let boardsService: BoardsService;

  beforeEach(() => {
    boardsRepository = new BoardsRepository(createTestDatabase());
    boardsService = new BoardsService(boardsRepository, createFixedClock('2026-10-03'));
  });

  it('creates a board with the default To Do, Doing and Done lists', () => {
    const board = boardsService.createBoard({ name: '  Roadmap  ' });

    expect(board.name).toBe('Roadmap');
    expect(boardsRepository.listListsForBoard(board.id).map((list) => list.name)).toEqual([
      'To Do',
      'Doing',
      'Done',
    ]);
  });

  it('rejects a blank board name as bad user input', () => {
    expect(errorCodeOf(() => boardsService.createBoard({ name: '   ' }))).toBe('BAD_USER_INPUT');
  });

  it('adds a list to an existing board', () => {
    const board = boardsService.createBoard({ name: 'Roadmap' });

    const list = boardsService.createList({ boardId: board.id, name: 'Review' });

    expect(list).toMatchObject({ name: 'Review', position: 3 });
  });

  it('reports NOT_FOUND when adding a list to a board that does not exist', () => {
    expect(
      errorCodeOf(() => boardsService.createList({ boardId: 'missing', name: 'Review' })),
    ).toBe('NOT_FOUND');
  });

  it('finds a board by id or, failing that, by name in any letter case', () => {
    const board = boardsService.createBoard({ name: 'WebMCP Launch' });

    expect(boardsService.findBoardByIdOrName(board.id)?.id).toBe(board.id);
    expect(boardsService.findBoardByIdOrName('webmcp launch')?.id).toBe(board.id);
    expect(boardsService.findBoardByIdOrName('Nope')).toBeUndefined();
  });

  it('returns undefined rather than an error for an unknown board id', () => {
    expect(boardsService.findBoardById('missing')).toBeUndefined();
  });
});
