import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

import { listBoardsTool } from './tools/list-boards';
import { openBoardTool } from './tools/open-board';
import type { GlobalToolContext } from './tools/tool-contexts';
import { useWebMcpTool } from './use-webmcp-tool';

/** Tools offered on every page of the app. Renders nothing. */
export function GlobalWebMcpTools() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const context: GlobalToolContext = {
    queryClient,
    openBoard: (boardId) => router.navigate({ to: '/boards/$boardId', params: { boardId } }),
  };

  useWebMcpTool(listBoardsTool, context);
  useWebMcpTool(openBoardTool, context);
  return null;
}
