import { z } from 'zod';

import { moveCard } from '../../features/boards/api/card-actions';
import { defineWebMcpTool } from '../webmcp-tool-definition';
import { findListOnBoard } from './board-snapshot';
import { cardIdField } from './card-input-fields';
import { toCompactCard } from './compact-card';
import type { BoardToolContext } from './tool-contexts';

export const moveCardTool = defineWebMcpTool({
  name: 'move_card',
  title: 'Move a card',
  description:
    'Moves a card to the top or bottom of a list on the open board (the same list reorders it).',
  inputSchema: z.object({
    cardId: cardIdField,
    toList: z.string().min(1).describe('Target list name (any letter case) or list id'),
    position: z
      .enum(['top', 'bottom'])
      .default('bottom')
      .describe('Where in the list; default bottom'),
  }),
  execute: async ({ cardId, toList, position }, context: BoardToolContext) => {
    const list = await findListOnBoard(context.queryClient, context.boardId, toList);
    const card = await moveCard(context.queryClient, context.boardId, cardId, {
      toListId: list.id,
      position: position === 'top' ? 'TOP' : 'BOTTOM',
    });
    return { movedCard: { ...toCompactCard(card), list: list.name, position: card.position } };
  },
});
