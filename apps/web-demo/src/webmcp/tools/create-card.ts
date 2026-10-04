import { z } from 'zod';

import { createCard } from '../../features/boards/api/card-actions';
import { defineWebMcpTool } from '../webmcp-tool-definition';
import { findListOnBoard } from './board-snapshot';
import { dueDateField, labelNamesField } from './card-input-fields';
import { toCompactCard } from './compact-card';
import type { BoardToolContext } from './tool-contexts';

export const createCardTool = defineWebMcpTool({
  name: 'create_card',
  title: 'Create a card',
  description: 'Adds a new card at the bottom of a list on the open board.',
  inputSchema: z.object({
    list: z.string().min(1).describe('List name (any letter case) or list id'),
    title: z.string().trim().min(1).max(200).describe('Short card title'),
    description: z.string().max(5000).optional(),
    dueDate: dueDateField.optional(),
    labels: labelNamesField.optional(),
  }),
  execute: async (
    { list: listIdOrName, title, description, dueDate, labels },
    context: BoardToolContext,
  ) => {
    const list = await findListOnBoard(context.queryClient, context.boardId, listIdOrName);
    const card = await createCard(context.queryClient, context.boardId, {
      listId: list.id,
      title,
      ...(description !== undefined && { description }),
      ...(dueDate !== undefined && { dueDate }),
      ...(labels !== undefined && { labelNames: labels }),
    });
    return { createdCard: { ...toCompactCard(card), list: list.name } };
  },
});
