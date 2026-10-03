import { z } from 'zod';

import { archiveCard } from '../../features/boards/api/card-actions';
import { defineWebMcpTool } from '../webmcp-tool-definition';
import { cardIdField } from './card-input-fields';
import type { BoardToolContext } from './tool-contexts';

export const archiveCardTool = defineWebMcpTool({
  name: 'archive_card',
  title: 'Archive a card',
  description:
    'Archives a card on the open board, removing it from its list. The user sees an Undo button on the page.',
  annotations: { consequentialHint: true },
  inputSchema: z.object({ cardId: cardIdField }),
  execute: async ({ cardId }, context: BoardToolContext) => {
    const card = await archiveCard(context.queryClient, context.boardId, cardId);
    context.announceArchivedCard({ id: card.id, title: card.title });
    return { archivedCard: { id: card.id, title: card.title } };
  },
});
