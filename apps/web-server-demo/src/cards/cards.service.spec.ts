import type { DatabaseSync } from 'node:sqlite';

import { GraphQLError } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';

import { BoardsRepository } from '../boards/boards.repository.js';
import { createFixedClock } from '../clock/clock.js';
import { LabelsRepository } from '../labels/labels.repository.js';
import {
  createTestDatabase,
  insertTestBoard,
  insertTestCard,
  insertTestLabel,
  insertTestList,
} from '../test-support/test-database.js';
import { CardsRepository } from './cards.repository.js';
import { CardsService } from './cards.service.js';

const TODAY = '2026-10-03';

function caughtGraphqlError(action: () => unknown): GraphQLError {
  try {
    action();
  } catch (error) {
    if (error instanceof GraphQLError) return error;
    throw error;
  }
  throw new Error('Expected a GraphQLError, but nothing was thrown.');
}

describe('CardsService', () => {
  let database: DatabaseSync;
  let cardsService: CardsService;
  let boardId: string;
  let toDoListId: string;
  let doingListId: string;
  let emptyListId: string;

  function titlesInList(listId: string): string[] {
    return cardsService.listActiveCardsForList(listId).map((card) => card.title);
  }

  function positionsInList(listId: string): number[] {
    return cardsService.listActiveCardsForList(listId).map((card) => card.position);
  }

  beforeEach(() => {
    database = createTestDatabase();
    cardsService = new CardsService(
      new CardsRepository(database),
      new BoardsRepository(database),
      new LabelsRepository(database),
      createFixedClock(TODAY),
    );
    boardId = insertTestBoard(database, 'Launch');
    toDoListId = insertTestList(database, boardId, 'To Do', 0);
    doingListId = insertTestList(database, boardId, 'Doing', 1);
    emptyListId = insertTestList(database, boardId, 'Done', 2);
    insertTestLabel(database, boardId, 'bug', 'RED');
    insertTestLabel(database, boardId, 'urgent', 'ORANGE');
    insertTestCard(database, toDoListId, { title: 'A', position: 0 });
    insertTestCard(database, toDoListId, { title: 'B', position: 1 });
    insertTestCard(database, toDoListId, { title: 'C', position: 2 });
    insertTestCard(database, doingListId, { title: 'X', position: 0 });
  });

  function cardIdByTitle(title: string): string {
    const card = cardsService
      .searchCards(boardId, { text: title, includeArchived: true })
      .find((candidate) => candidate.title === title);
    if (card === undefined) throw new Error(`No card titled ${title}`);
    return card.id;
  }

  describe('createCard', () => {
    it('adds the card at the bottom of the list with the given details', () => {
      const card = cardsService.createCard({
        listId: toDoListId,
        title: '  Write docs  ',
        description: 'Explain the tools',
        dueDate: '2026-10-10',
        labelNames: ['BUG'],
      });

      expect(card).toMatchObject({
        title: 'Write docs',
        description: 'Explain the tools',
        dueDate: '2026-10-10',
        position: 3,
        boardId,
        listId: toDoListId,
      });
      expect(cardsService.listLabelsForCard(card.id).map((label) => label.name)).toEqual(['bug']);
    });

    it('rejects an empty title', () => {
      const error = caughtGraphqlError(() =>
        cardsService.createCard({ listId: toDoListId, title: ' ' }),
      );

      expect(error.extensions['code']).toBe('BAD_USER_INPUT');
    });

    it('rejects an impossible due date and writes nothing', () => {
      const error = caughtGraphqlError(() =>
        cardsService.createCard({ listId: toDoListId, title: 'Leap', dueDate: '2026-02-30' }),
      );

      expect(error.extensions['code']).toBe('BAD_USER_INPUT');
      expect(titlesInList(toDoListId)).toEqual(['A', 'B', 'C']);
    });

    it('rejects unknown labels, lists the valid ones, and writes nothing', () => {
      const error = caughtGraphqlError(() =>
        cardsService.createCard({
          listId: toDoListId,
          title: 'New',
          labelNames: ['bug', 'someday'],
        }),
      );

      expect(error.extensions).toMatchObject({
        code: 'BAD_USER_INPUT',
        unknownLabelNames: ['someday'],
        availableLabelNames: ['bug', 'urgent'],
      });
      expect(titlesInList(toDoListId)).toEqual(['A', 'B', 'C']);
    });

    it('reports NOT_FOUND for a list that does not exist', () => {
      const error = caughtGraphqlError(() =>
        cardsService.createCard({ listId: 'nope', title: 'New' }),
      );

      expect(error.extensions['code']).toBe('NOT_FOUND');
    });
  });

  describe('updateCard', () => {
    it('changes only the fields that are provided and refreshes updatedAt', () => {
      const cardId = cardIdByTitle('B');
      const before = cardsService.getCard(cardId);

      const updated = cardsService.updateCard(cardId, { description: 'More detail' });

      expect(updated).toMatchObject({ title: 'B', description: 'More detail' });
      expect(updated.updatedAt).not.toBe(before.updatedAt);
    });

    it('clears the due date when it is set to null, and keeps it when omitted', () => {
      const cardId = cardIdByTitle('B');
      cardsService.updateCard(cardId, { dueDate: '2026-10-20' });

      expect(cardsService.updateCard(cardId, { title: 'B2' }).dueDate).toBe('2026-10-20');
      expect(cardsService.updateCard(cardId, { dueDate: null }).dueDate).toBeNull();
    });

    it('replaces the whole label set', () => {
      const cardId = cardIdByTitle('B');
      cardsService.updateCard(cardId, { labelNames: ['bug', 'urgent'] });

      cardsService.updateCard(cardId, { labelNames: ['urgent'] });

      expect(cardsService.listLabelsForCard(cardId).map((label) => label.name)).toEqual(['urgent']);
    });

    it('reports NOT_FOUND for an unknown card', () => {
      expect(
        caughtGraphqlError(() => cardsService.updateCard('nope', { title: 'x' })).extensions[
          'code'
        ],
      ).toBe('NOT_FOUND');
    });
  });

  describe('moveCard', () => {
    it('moves a card to the bottom of another list by default and closes the gap it left', () => {
      cardsService.moveCard(cardIdByTitle('A'), { toListId: doingListId });

      expect(titlesInList(toDoListId)).toEqual(['B', 'C']);
      expect(positionsInList(toDoListId)).toEqual([0, 1]);
      expect(titlesInList(doingListId)).toEqual(['X', 'A']);
      expect(positionsInList(doingListId)).toEqual([0, 1]);
    });

    it('moves a card to the top of another list', () => {
      cardsService.moveCard(cardIdByTitle('C'), { toListId: doingListId, position: 'TOP' });

      expect(titlesInList(doingListId)).toEqual(['C', 'X']);
    });

    it('moves a card into an empty list', () => {
      cardsService.moveCard(cardIdByTitle('B'), { toListId: emptyListId });

      expect(titlesInList(emptyListId)).toEqual(['B']);
      expect(positionsInList(emptyListId)).toEqual([0]);
    });

    it('reorders within the same list, both down and up', () => {
      cardsService.moveCard(cardIdByTitle('A'), { toListId: toDoListId, position: 'BOTTOM' });
      expect(titlesInList(toDoListId)).toEqual(['B', 'C', 'A']);

      cardsService.moveCard(cardIdByTitle('A'), { toListId: toDoListId, index: 1 });
      expect(titlesInList(toDoListId)).toEqual(['B', 'A', 'C']);
      expect(positionsInList(toDoListId)).toEqual([0, 1, 2]);
    });

    it('treats an index past the end as "at the bottom"', () => {
      cardsService.moveCard(cardIdByTitle('A'), { toListId: doingListId, index: 99 });

      expect(titlesInList(doingListId)).toEqual(['X', 'A']);
    });

    it('rejects asking for both a named position and an index', () => {
      const error = caughtGraphqlError(() =>
        cardsService.moveCard(cardIdByTitle('A'), {
          toListId: doingListId,
          position: 'TOP',
          index: 0,
        }),
      );

      expect(error.extensions['code']).toBe('BAD_USER_INPUT');
    });

    it('rejects a negative index', () => {
      const error = caughtGraphqlError(() =>
        cardsService.moveCard(cardIdByTitle('A'), { toListId: doingListId, index: -1 }),
      );

      expect(error.extensions['code']).toBe('BAD_USER_INPUT');
    });

    it('refuses to move a card to a list on another board', () => {
      const otherBoardId = insertTestBoard(database, 'Other');
      const otherListId = insertTestList(database, otherBoardId, 'Inbox', 0);

      const error = caughtGraphqlError(() =>
        cardsService.moveCard(cardIdByTitle('A'), { toListId: otherListId }),
      );

      expect(error.extensions['code']).toBe('BAD_USER_INPUT');
      expect(titlesInList(toDoListId)).toEqual(['A', 'B', 'C']);
    });

    it('refuses to move an archived card', () => {
      const cardId = cardIdByTitle('A');
      cardsService.archiveCard(cardId);

      expect(
        caughtGraphqlError(() => cardsService.moveCard(cardId, { toListId: doingListId }))
          .extensions['code'],
      ).toBe('BAD_USER_INPUT');
    });
  });

  describe('archiveCard and restoreCard', () => {
    it('hides an archived card from its list and closes the gap', () => {
      const archived = cardsService.archiveCard(cardIdByTitle('B'));

      expect(archived.archivedAt).not.toBeNull();
      expect(titlesInList(toDoListId)).toEqual(['A', 'C']);
      expect(positionsInList(toDoListId)).toEqual([0, 1]);
    });

    it('restores a card at the bottom of its list even if the list changed meanwhile', () => {
      const cardId = cardIdByTitle('A');
      cardsService.archiveCard(cardId);
      cardsService.createCard({ listId: toDoListId, title: 'D' });

      const restored = cardsService.restoreCard(cardId);

      expect(restored.archivedAt).toBeNull();
      expect(titlesInList(toDoListId)).toEqual(['B', 'C', 'D', 'A']);
      expect(positionsInList(toDoListId)).toEqual([0, 1, 2, 3]);
    });

    it('treats archiving twice, or restoring an active card, as a no-op', () => {
      const cardId = cardIdByTitle('A');
      const firstArchive = cardsService.archiveCard(cardId);

      expect(cardsService.archiveCard(cardId).archivedAt).toBe(firstArchive.archivedAt);
      expect(cardsService.restoreCard(cardIdByTitle('B')).position).toBe(0);
    });
  });

  describe('searchCards and isOverdue', () => {
    beforeEach(() => {
      cardsService.updateCard(cardIdByTitle('A'), {
        dueDate: '2026-10-01',
        labelNames: ['urgent'],
      });
      cardsService.updateCard(cardIdByTitle('B'), { dueDate: '2026-10-02', isDueComplete: true });
      cardsService.updateCard(cardIdByTitle('C'), {
        dueDate: TODAY,
        description: 'Fix the Login bug',
      });
      cardsService.updateCard(cardIdByTitle('X'), { dueDate: '2026-09-30', labelNames: ['bug'] });
    });

    it('marks cards overdue only when the due date is before today and not completed', () => {
      const overdueTitles = cardsService
        .searchCards(boardId, {})
        .filter((card) => cardsService.isOverdue(card))
        .map((card) => card.title);

      expect(overdueTitles).toEqual(['A', 'X']);
    });

    it('filters overdue cards', () => {
      expect(
        cardsService.searchCards(boardId, { isOverdue: true }).map((card) => card.title),
      ).toEqual(['A', 'X']);
    });

    it('finds text in titles and descriptions, ignoring letter case', () => {
      expect(
        cardsService.searchCards(boardId, { text: 'login' }).map((card) => card.title),
      ).toEqual(['C']);
    });

    it('filters by any of the given labels, in any letter case', () => {
      const titles = cardsService
        .searchCards(boardId, { labelNames: ['URGENT', 'bug'] })
        .map((card) => card.title);

      expect(titles).toEqual(['A', 'X']);
    });

    it('filters by list', () => {
      expect(
        cardsService.searchCards(boardId, { listId: doingListId }).map((card) => card.title),
      ).toEqual(['X']);
    });

    it('leaves archived cards out unless asked to include them', () => {
      cardsService.archiveCard(cardIdByTitle('A'));

      expect(
        cardsService.searchCards(boardId, { isOverdue: true }).map((card) => card.title),
      ).toEqual(['X']);
      expect(
        cardsService.searchCards(boardId, { includeArchived: true }).map((card) => card.title),
      ).toContain('A');
    });

    it('rejects unknown label names in a search', () => {
      expect(
        caughtGraphqlError(() => cardsService.searchCards(boardId, { labelNames: ['nope'] }))
          .extensions['code'],
      ).toBe('BAD_USER_INPUT');
    });

    it('reports NOT_FOUND when searching a board that does not exist', () => {
      expect(
        caughtGraphqlError(() => cardsService.searchCards('nope', {})).extensions['code'],
      ).toBe('NOT_FOUND');
    });
  });
});
