import { describe, expect, it } from 'vitest';

import {
  DOING_LIST_ID,
  DONE_LIST_ID,
  TO_DO_LIST_ID,
  buildBoardDetail,
} from '../test-support/board-fixtures';
import { moveCardInBoard } from './board-cache';

function titlesByList(board: ReturnType<typeof buildBoardDetail>): Record<string, string[]> {
  return Object.fromEntries(
    board.lists.map((list) => [list.id, list.cards.map((card) => card.title)]),
  );
}

describe('moveCardInBoard', () => {
  it('moves a card to the bottom of another list and renumbers both lists', () => {
    const board = moveCardInBoard(buildBoardDetail(), 'card-docs', DOING_LIST_ID, 'BOTTOM');

    expect(titlesByList(board)).toMatchObject({
      [TO_DO_LIST_ID]: ['Fix bug'],
      [DOING_LIST_ID]: ['Ship it', 'Write docs'],
    });
    const doing = board.lists.find((list) => list.id === DOING_LIST_ID);
    expect(doing?.cards.map((card) => [card.position, card.listId])).toEqual([
      [0, DOING_LIST_ID],
      [1, DOING_LIST_ID],
    ]);
  });

  it('moves a card to the top of a list', () => {
    const board = moveCardInBoard(buildBoardDetail(), 'card-bug', DOING_LIST_ID, 'TOP');

    expect(titlesByList(board)[DOING_LIST_ID]).toEqual(['Fix bug', 'Ship it']);
  });

  it('reorders within the same list', () => {
    const board = moveCardInBoard(buildBoardDetail(), 'card-docs', TO_DO_LIST_ID, 'BOTTOM');

    expect(titlesByList(board)[TO_DO_LIST_ID]).toEqual(['Fix bug', 'Write docs']);
  });

  it('accepts an exact index and moves into an empty list', () => {
    const board = moveCardInBoard(buildBoardDetail(), 'card-ship', DONE_LIST_ID, 0);

    expect(titlesByList(board)[DONE_LIST_ID]).toEqual(['Ship it']);
  });

  it('returns the board unchanged when the card or list is unknown', () => {
    const original = buildBoardDetail();

    expect(moveCardInBoard(original, 'missing', DOING_LIST_ID, 'TOP')).toBe(original);
    expect(moveCardInBoard(original, 'card-docs', 'missing', 'TOP')).toBe(original);
  });

  it('never mutates the board it is given', () => {
    const original = buildBoardDetail();
    const snapshot = structuredClone(original);

    moveCardInBoard(original, 'card-docs', DOING_LIST_ID, 'TOP');

    expect(original).toEqual(snapshot);
  });
});
