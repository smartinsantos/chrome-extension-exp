import { z } from 'zod';

import { boardSummariesQueryOptions } from '../../features/boards/api/board-queries';
import { defineWebMcpTool } from '../webmcp-tool-definition';
import type { GlobalToolContext } from './tool-contexts';

export const listBoardsTool = defineWebMcpTool({
  name: 'list_boards',
  title: 'List boards',
  description:
    'Lists every board in this app with its number of lists and active cards. Use it to find a board before opening it with open_board.',
  annotations: { readOnlyHint: true },
  inputSchema: z.object({}),
  execute: async (_input, context: GlobalToolContext) => {
    const { boards } = await context.queryClient.fetchQuery(boardSummariesQueryOptions());
    return { boards };
  },
});
