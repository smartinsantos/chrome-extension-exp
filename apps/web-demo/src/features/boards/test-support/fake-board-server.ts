import { vi } from 'vitest';

import { GraphqlRequestError, executeGraphql } from '../../../graphql/execute-graphql';
import { moveCardInBoard } from '../api/board-cache';
import { type BoardCard, type BoardDetail, buildBoardDetail } from './board-fixtures';

type OperationHandler = (variables: Record<string, unknown>) => unknown;

/**
 * Stands in for the GraphQL server in component tests. It keeps one board in memory and
 * answers the operations the board UI sends, so cache refreshes see realistic data.
 * Requires `vi.mock('…/graphql/execute-graphql')` in the test file.
 */
export function installFakeBoardServer() {
  let board: BoardDetail = buildBoardDetail();
  const overrides = new Map<string, OperationHandler>();
  const executeGraphqlMock = vi.mocked(executeGraphql);

  function findCard(cardId: string): BoardCard {
    const card = board.lists.flatMap((list) => list.cards).find((entry) => entry.id === cardId);
    if (card === undefined)
      throw new GraphqlRequestError('NOT_FOUND', `Card "${cardId}" was not found.`);
    return card;
  }

  const defaultHandlers: Record<string, OperationHandler> = {
    BoardSummaries: () => ({
      boards: [
        {
          id: board.id,
          name: board.name,
          listCount: board.lists.length,
          cardCount: board.lists.reduce((total, list) => total + list.cards.length, 0),
        },
        { id: 'board-personal', name: 'Personal', listCount: 3, cardCount: 4 },
      ],
    }),
    BoardDetail: () => ({ board: structuredClone(board) }),
    SearchCards: (variables) => {
      const filter = (variables['filter'] ?? {}) as {
        isOverdue?: boolean;
        listId?: string;
        text?: string;
        labelNames?: string[];
      };
      const listsInOrder = board.lists.toSorted(
        (first, second) => first.position - second.position,
      );
      const searchCards = listsInOrder.flatMap((list) =>
        list.cards
          .filter((card) => filter.isOverdue !== true || card.isOverdue)
          .filter((card) => filter.listId === undefined || card.listId === filter.listId)
          .filter(
            (card) =>
              filter.text === undefined ||
              card.title.toLowerCase().includes(filter.text.toLowerCase()),
          )
          .filter(
            (card) =>
              filter.labelNames === undefined ||
              card.labels.some((label) =>
                filter.labelNames?.some((name) => name.toLowerCase() === label.name.toLowerCase()),
              ),
          )
          .map((card) => ({ ...card, list: { id: list.id, name: list.name } })),
      );
      return { searchCards };
    },
    CreateCard: (variables) => {
      const input = variables['input'] as { listId: string; title: string };
      const list = board.lists.find((entry) => entry.id === input.listId);
      const card: BoardCard = {
        id: `card-${Math.random().toString(36).slice(2)}`,
        listId: input.listId,
        title: input.title,
        description: '',
        dueDate: null,
        isDueComplete: false,
        isOverdue: false,
        position: list?.cards.length ?? 0,
        archivedAt: null,
        labels: [],
      };
      list?.cards.push(card);
      return { createCard: card };
    },
    UpdateCard: (variables) => {
      const card = findCard(String(variables['cardId']));
      Object.assign(card, variables['input']);
      return { updateCard: card };
    },
    MoveCard: (variables) => {
      const input = variables['input'] as { toListId: string; position?: 'TOP' | 'BOTTOM' };
      board = moveCardInBoard(
        board,
        String(variables['cardId']),
        input.toListId,
        input.position ?? 'BOTTOM',
      );
      return { moveCard: findCard(String(variables['cardId'])) };
    },
    ArchiveCard: (variables) => {
      const card = findCard(String(variables['cardId']));
      board = {
        ...board,
        lists: board.lists.map((list) => ({
          ...list,
          cards: list.cards.filter((entry) => entry.id !== card.id),
        })),
      };
      archivedCards.set(card.id, card);
      return { archiveCard: { ...card, archivedAt: '2026-10-03T12:00:00.000Z' } };
    },
    RestoreCard: (variables) => {
      const card = archivedCards.get(String(variables['cardId']));
      if (card === undefined) throw new GraphqlRequestError('NOT_FOUND', 'Card not found.');
      board.lists.find((list) => list.id === card.listId)?.cards.push(card);
      return { restoreCard: card };
    },
  };
  const archivedCards = new Map<string, BoardCard>();

  executeGraphqlMock.mockImplementation(async (document, ...rest) => {
    const operationName = /(?:query|mutation)\s+(\w+)/.exec(document.toString())?.[1] ?? '';
    const variables = (rest[0] ?? {}) as Record<string, unknown>;
    const handler = overrides.get(operationName) ?? defaultHandlers[operationName];
    if (handler === undefined) throw new Error(`Fake server has no handler for ${operationName}`);
    return handler(variables);
  });

  return {
    /** Replace how one operation is answered, for example to make it fail or hang. */
    answer(operationName: string, handler: OperationHandler): void {
      overrides.set(operationName, handler);
    },
    /** Variables of every call to an operation, in call order. */
    callsTo(operationName: string): Record<string, unknown>[] {
      return executeGraphqlMock.mock.calls
        .filter(([document]) => document.toString().includes(` ${operationName}`))
        .map(([, variables]) => (variables ?? {}) as Record<string, unknown>);
    },
  };
}
