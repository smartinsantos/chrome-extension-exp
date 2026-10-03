import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BOARD_ID,
  DOING_LIST_ID,
  TO_DO_LIST_ID,
} from '../../features/boards/test-support/board-fixtures';
import { installFakeBoardServer } from '../../features/boards/test-support/fake-board-server';
import type * as ExecuteGraphqlModule from '../../graphql/execute-graphql';
import { runWebMcpTool } from '../run-webmcp-tool';
import type { WebMcpToolDefinition } from '../webmcp-tool-definition';
import { archiveCardTool } from './archive-card';
import { createCardTool } from './create-card';
import { getBoardTool } from './get-board';
import { moveCardTool } from './move-card';
import type { BoardToolContext } from './tool-contexts';
import { updateCardTool } from './update-card';

vi.mock('../../graphql/execute-graphql', async (importOriginal) => ({
  ...(await importOriginal<typeof ExecuteGraphqlModule>()),
  executeGraphql: vi.fn<typeof ExecuteGraphqlModule.executeGraphql>(),
}));

describe('board WebMCP tools', () => {
  let fakeServer: ReturnType<typeof installFakeBoardServer>;
  let context: BoardToolContext;
  let announceArchivedCard: ReturnType<typeof vi.fn<BoardToolContext['announceArchivedCard']>>;

  beforeEach(() => {
    fakeServer = installFakeBoardServer();
    announceArchivedCard = vi.fn<BoardToolContext['announceArchivedCard']>();
    context = { queryClient: new QueryClient(), boardId: BOARD_ID, announceArchivedCard };
  });

  function run<TInput>(tool: WebMcpToolDefinition<TInput, BoardToolContext>, input: unknown) {
    return runWebMcpTool(tool, input, context, new AbortController().signal);
  }

  describe('get_board', () => {
    it('returns the board as lists of compact cards, in board order', async () => {
      const result = await run(getBoardTool, {});

      expect(result).toEqual({
        board: { id: BOARD_ID, name: 'WebMCP Launch' },
        labels: ['bug', 'urgent'],
        lists: [
          {
            id: TO_DO_LIST_ID,
            name: 'To Do',
            cards: [
              { id: 'card-docs', title: 'Write docs', labels: [], dueDate: '2026-10-10' },
              {
                id: 'card-bug',
                title: 'Fix bug',
                labels: ['bug'],
                dueDate: '2026-10-01',
                isOverdue: true,
              },
            ],
          },
          {
            id: DOING_LIST_ID,
            name: 'Doing',
            cards: [{ id: 'card-ship', title: 'Ship it', labels: [] }],
          },
          { id: 'list-done', name: 'Done', cards: [] },
        ],
      });
    });

    it('narrows to overdue cards and to one list given by name', async () => {
      const result = await run(getBoardTool, { overdue: true, list: 'to do' });

      expect(fakeServer.callsTo('SearchCards')).toEqual([
        { boardId: BOARD_ID, filter: { isOverdue: true, listId: TO_DO_LIST_ID } },
      ]);
      expect(result).toMatchObject({
        lists: [{ name: 'To Do', cards: [{ id: 'card-bug', title: 'Fix bug' }] }],
      });
    });
  });

  describe('create_card', () => {
    it('adds a card to a list given by name', async () => {
      const result = await run(createCardTool, {
        list: 'Doing',
        title: 'Record the demo',
        dueDate: '2026-10-09',
        labels: ['urgent'],
      });

      expect(fakeServer.callsTo('CreateCard')).toEqual([
        {
          input: {
            listId: DOING_LIST_ID,
            title: 'Record the demo',
            dueDate: '2026-10-09',
            labelNames: ['urgent'],
          },
        },
      ]);
      expect(result).toMatchObject({ createdCard: { title: 'Record the demo', list: 'Doing' } });
    });

    it("lists the board's lists when the list name is unknown, and creates nothing", async () => {
      const result = await run(createCardTool, { list: 'Someday', title: 'Maybe' });

      expect(result).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'No list named "Someday". Lists on this board: To Do, Doing, Done.',
        },
      });
      expect(fakeServer.callsTo('CreateCard')).toEqual([]);
    });

    it('rejects a badly formatted due date before calling the server', async () => {
      const result = await run(createCardTool, {
        list: 'To Do',
        title: 'x',
        dueDate: '10/09/2026',
      });

      expect(result).toMatchObject({ error: { code: 'INVALID_INPUT' } });
    });
  });

  describe('update_card', () => {
    it('sends only the fields to change, and null clears the due date', async () => {
      await run(updateCardTool, { cardId: 'card-bug', dueDate: null, isDueComplete: true });

      expect(fakeServer.callsTo('UpdateCard')).toEqual([
        { cardId: 'card-bug', input: { dueDate: null, isDueComplete: true } },
      ]);
    });

    it('needs at least one field to change', async () => {
      expect(await run(updateCardTool, { cardId: 'card-bug' })).toMatchObject({
        error: { code: 'INVALID_INPUT' },
      });
    });
  });

  describe('move_card', () => {
    it('moves a card to the top of a list given by name', async () => {
      const result = await run(moveCardTool, {
        cardId: 'card-docs',
        toList: 'DOING',
        position: 'top',
      });

      expect(fakeServer.callsTo('MoveCard')).toEqual([
        { cardId: 'card-docs', input: { toListId: DOING_LIST_ID, position: 'TOP' } },
      ]);
      expect(result).toMatchObject({ movedCard: { id: 'card-docs', list: 'Doing' } });
    });

    it('moves to the bottom by default', async () => {
      await run(moveCardTool, { cardId: 'card-docs', toList: DOING_LIST_ID });

      expect(fakeServer.callsTo('MoveCard')[0]).toMatchObject({ input: { position: 'BOTTOM' } });
    });
  });

  describe('archive_card', () => {
    it('archives the card and lets the user undo it from the page', async () => {
      const result = await run(archiveCardTool, { cardId: 'card-bug' });

      expect(fakeServer.callsTo('ArchiveCard')).toEqual([{ cardId: 'card-bug' }]);
      expect(announceArchivedCard).toHaveBeenCalledWith({ id: 'card-bug', title: 'Fix bug' });
      expect(result).toMatchObject({ archivedCard: { id: 'card-bug', title: 'Fix bug' } });
    });

    it('reports unknown cards without announcing anything', async () => {
      const result = await run(archiveCardTool, { cardId: 'nope' });

      expect(result).toMatchObject({ error: { code: 'NOT_FOUND' } });
      expect(announceArchivedCard).not.toHaveBeenCalled();
    });
  });
});
