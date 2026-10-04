import { z } from 'zod';

import { SearchCardsQueryDocument } from '../../features/boards/api/board-queries';
import { executeGraphql } from '../../graphql/execute-graphql';
import type { CardSearchFilter } from '../../gql/graphql';
import { defineWebMcpTool } from '../webmcp-tool-definition';
import { loadBoard } from './board-snapshot';
import { toCompactCard } from './compact-card';
import { findByIdOrName } from './find-by-id-or-name';
import type { BoardToolContext } from './tool-contexts';

export const getBoardTool = defineWebMcpTool({
  name: 'get_board',
  title: 'Read the open board',
  description:
    'Returns the open board: its lists (left to right) with their cards (top to bottom), plus the label names you can use. ' +
    'Optional filters narrow the cards; all given filters must match. Card ids from here are what update_card, move_card and archive_card need.',
  annotations: { readOnlyHint: true },
  inputSchema: z.object({
    query: z.string().min(1).optional().describe('Text to find in card titles and descriptions'),
    labels: z
      .array(z.string())
      .min(1)
      .optional()
      .describe('Only cards with at least one of these labels'),
    list: z.string().min(1).optional().describe('Only cards in this list (name or id)'),
    overdue: z.boolean().optional().describe('true: only cards past their due date and not done'),
  }),
  execute: async (filters, context: BoardToolContext) => {
    const board = await loadBoard(context.queryClient, context.boardId);
    const summary = {
      board: { id: board.id, name: board.name },
      labels: board.labels.map((label) => label.name),
    };

    const hasFilters = Object.values(filters).some((value) => value !== undefined);
    if (!hasFilters) {
      return {
        ...summary,
        lists: board.lists.map((list) => ({
          id: list.id,
          name: list.name,
          cards: list.cards.map(toCompactCard),
        })),
      };
    }

    const searchFilter: CardSearchFilter = {
      ...(filters.query !== undefined && { text: filters.query }),
      ...(filters.labels !== undefined && { labelNames: filters.labels }),
      ...(filters.overdue === true && { isOverdue: true }),
      ...(filters.list !== undefined && {
        listId: findByIdOrName(board.lists, filters.list, {
          entityLabel: 'list',
          scopeLabel: 'Lists on this board',
        }).id,
      }),
    };
    const { searchCards } = await executeGraphql(SearchCardsQueryDocument, {
      boardId: board.id,
      filter: searchFilter,
    });
    const listsWithMatches = board.lists
      .map((list) => ({
        id: list.id,
        name: list.name,
        cards: searchCards.filter((card) => card.list.id === list.id).map(toCompactCard),
      }))
      .filter((list) => list.cards.length > 0);
    return { ...summary, lists: listsWithMatches };
  },
});
