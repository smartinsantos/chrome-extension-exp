import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '../clock/clock.js';
import { badUserInputError, notFoundError } from '../common/graphql-errors.js';
import type { BoardListRecord, BoardRecord } from './board.records.js';
import { BoardsRepository } from './boards.repository.js';

const DEFAULT_LIST_NAMES = ['To Do', 'Doing', 'Done'];

@Injectable()
export class BoardsService {
  constructor(
    private readonly boardsRepository: BoardsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  listBoards(): BoardRecord[] {
    return this.boardsRepository.listBoards();
  }

  findBoardById(boardId: string): BoardRecord | undefined {
    return this.boardsRepository.findBoardById(boardId);
  }

  /** Lets callers (like the AI agent) refer to a board by its name instead of its id. */
  findBoardByIdOrName(boardIdOrName: string): BoardRecord | undefined {
    return (
      this.boardsRepository.findBoardById(boardIdOrName) ??
      this.boardsRepository.findBoardByName(boardIdOrName)
    );
  }

  getBoardById(boardId: string): BoardRecord {
    const board = this.boardsRepository.findBoardById(boardId);
    if (board === undefined) throw notFoundError('Board', boardId);
    return board;
  }

  createBoard(input: { name: string }): BoardRecord {
    const name = requireNonBlank(input.name, 'Board name');
    return this.boardsRepository.createBoardWithLists(name, DEFAULT_LIST_NAMES, this.timestamp());
  }

  listListsForBoard(boardId: string): BoardListRecord[] {
    return this.boardsRepository.listListsForBoard(boardId);
  }

  createList(input: { boardId: string; name: string }): BoardListRecord {
    const board = this.getBoardById(input.boardId);
    const name = requireNonBlank(input.name, 'List name');
    return this.boardsRepository.createList(board.id, name, this.timestamp());
  }

  countLists(boardId: string): number {
    return this.boardsRepository.countLists(boardId);
  }

  countActiveCards(boardId: string): number {
    return this.boardsRepository.countActiveCards(boardId);
  }

  private timestamp(): string {
    return this.clock.now().toISOString();
  }
}

function requireNonBlank(value: string, fieldLabel: string): string {
  const trimmed = value.trim();
  if (trimmed === '') throw badUserInputError(`${fieldLabel} must not be empty.`);
  return trimmed;
}
