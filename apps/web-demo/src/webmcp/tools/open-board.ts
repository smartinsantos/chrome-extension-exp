import { z } from 'zod';

import { boardSummariesQueryOptions } from '../../features/boards/api/board-queries';
import { defineWebMcpTool } from '../webmcp-tool-definition';
import { findByIdOrName } from './find-by-id-or-name';
import type { GlobalToolContext } from './tool-contexts';

export const openBoardTool = defineWebMcpTool({
  name: 'open_board',
  title: 'Open board',
  description:
    'Opens a board on screen. Once it is open, board tools such as get_board, create_card and move_card become available.',
  annotations: { readOnlyHint: true },
  inputSchema: z.object({
    board: z.string().min(1).describe('Board name (any letter case) or board id'),
  }),
  execute: async ({ board: boardIdOrName }, context: GlobalToolContext) => {
    const { boards } = await context.queryClient.fetchQuery(boardSummariesQueryOptions());
    const board = findByIdOrName(boards, boardIdOrName, {
      entityLabel: 'board',
      scopeLabel: 'Boards',
    });
    await context.openBoard(board.id);
    return {
      openedBoard: { id: board.id, name: board.name },
      note: 'The board is open. Board tools (get_board, create_card, update_card, move_card, archive_card) are now available.',
    };
  },
});
