import { z } from 'zod';

import { updateCard } from '../../features/boards/api/card-actions';
import { defineWebMcpTool } from '../webmcp-tool-definition';
import { cardIdField, dueDateField, labelNamesField } from './card-input-fields';
import { toCompactCard } from './compact-card';
import type { BoardToolContext } from './tool-contexts';

export const updateCardTool = defineWebMcpTool({
  name: 'update_card',
  title: 'Update a card',
  description:
    'Changes fields of a card on the open board. Only the fields you include change. ' +
    "labels replaces all of the card's labels; dueDate null removes the due date.",
  inputSchema: z
    .object({
      cardId: cardIdField,
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().max(5000).optional(),
      dueDate: dueDateField.nullable().optional(),
      isDueComplete: z.boolean().optional().describe('true when the work is done (never overdue)'),
      labels: labelNamesField.optional(),
    })
    .refine(
      ({ cardId: _cardId, ...changes }) =>
        Object.values(changes).some((value) => value !== undefined),
      {
        message: 'Include at least one field to change.',
      },
    ),
  execute: async ({ cardId, labels, ...changes }, context: BoardToolContext) => {
    const card = await updateCard(context.queryClient, context.boardId, cardId, {
      ...changes,
      ...(labels !== undefined && { labelNames: labels }),
    });
    return { updatedCard: toCompactCard(card) };
  },
});
