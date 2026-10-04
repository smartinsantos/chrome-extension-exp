import { toast } from '@repo/ui/components/toaster';
import { useQueryClient } from '@tanstack/react-query';

import { restoreCard } from '../features/boards/api/card-actions';
import { archiveCardTool } from './tools/archive-card';
import { createCardTool } from './tools/create-card';
import { getBoardTool } from './tools/get-board';
import { moveCardTool } from './tools/move-card';
import type { BoardToolContext } from './tools/tool-contexts';
import { updateCardTool } from './tools/update-card';
import { useWebMcpTool } from './use-webmcp-tool';

/**
 * Tools that act on the open board. They exist only while a board page is shown: opening or
 * leaving a board adds or removes them, and agents are notified through `toolchange`.
 */
export function BoardWebMcpTools({ boardId }: { boardId: string }) {
  const queryClient = useQueryClient();
  const context: BoardToolContext = {
    queryClient,
    boardId,
    announceArchivedCard: (card) =>
      toast(`An agent archived "${card.title}"`, {
        action: {
          label: 'Undo',
          onClick: () => {
            restoreCard(queryClient, boardId, card.id).catch((error: unknown) =>
              toast.error(error instanceof Error ? error.message : 'Could not restore the card.'),
            );
          },
        },
      }),
  };

  useWebMcpTool(getBoardTool, context);
  useWebMcpTool(createCardTool, context);
  useWebMcpTool(updateCardTool, context);
  useWebMcpTool(moveCardTool, context);
  useWebMcpTool(archiveCardTool, context);
  return null;
}
