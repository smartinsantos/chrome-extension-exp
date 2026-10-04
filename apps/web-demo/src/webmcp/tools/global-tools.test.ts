import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BOARD_ID } from '../../features/boards/test-support/board-fixtures';
import { installFakeBoardServer } from '../../features/boards/test-support/fake-board-server';
import type * as ExecuteGraphqlModule from '../../graphql/execute-graphql';
import { runWebMcpTool } from '../run-webmcp-tool';
import type { WebMcpToolDefinition } from '../webmcp-tool-definition';
import { listBoardsTool } from './list-boards';
import { openBoardTool } from './open-board';
import type { GlobalToolContext } from './tool-contexts';

vi.mock('../../graphql/execute-graphql', async (importOriginal) => ({
  ...(await importOriginal<typeof ExecuteGraphqlModule>()),
  executeGraphql: vi.fn<typeof ExecuteGraphqlModule.executeGraphql>(),
}));

describe('global WebMCP tools', () => {
  let context: GlobalToolContext;
  let openBoard: ReturnType<typeof vi.fn<GlobalToolContext['openBoard']>>;

  beforeEach(() => {
    installFakeBoardServer();
    openBoard = vi.fn<GlobalToolContext['openBoard']>().mockResolvedValue(undefined);
    context = { queryClient: new QueryClient(), openBoard };
  });

  function run<TInput>(tool: WebMcpToolDefinition<TInput, GlobalToolContext>, input: unknown) {
    return runWebMcpTool(tool, input, context, new AbortController().signal);
  }

  it('list_boards returns every board with its size', async () => {
    expect(await run(listBoardsTool, {})).toEqual({
      boards: [
        { id: BOARD_ID, name: 'WebMCP Launch', listCount: 3, cardCount: 3 },
        { id: 'board-personal', name: 'Personal', listCount: 3, cardCount: 4 },
      ],
    });
  });

  it('open_board accepts a board name in any letter case and opens it', async () => {
    const result = await run(openBoardTool, { board: 'webmcp launch' });

    expect(openBoard).toHaveBeenCalledWith(BOARD_ID);
    expect(result).toMatchObject({ openedBoard: { id: BOARD_ID, name: 'WebMCP Launch' } });
  });

  it('open_board also accepts a board id', async () => {
    await run(openBoardTool, { board: BOARD_ID });

    expect(openBoard).toHaveBeenCalledWith(BOARD_ID);
  });

  it('open_board explains which boards exist when the name is unknown', async () => {
    const result = await run(openBoardTool, { board: 'Groceries' });

    expect(result).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'No board named "Groceries". Boards: WebMCP Launch, Personal.',
      },
    });
    expect(openBoard).not.toHaveBeenCalled();
  });
});
