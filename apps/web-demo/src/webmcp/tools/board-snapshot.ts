import type { QueryClient } from '@tanstack/react-query';

import { boardDetailQueryOptions } from '../../features/boards/api/board-queries';
import { GraphqlRequestError } from '../../graphql/execute-graphql';
import { findByIdOrName } from './find-by-id-or-name';

/** The current board (from the shared cache when fresh), with its lists in left-to-right order. */
export async function loadBoard(queryClient: QueryClient, boardId: string) {
  const { board } = await queryClient.fetchQuery(boardDetailQueryOptions(boardId));
  if (board === null || board === undefined) {
    throw new GraphqlRequestError('NOT_FOUND', `Board "${boardId}" was not found.`);
  }
  return {
    ...board,
    lists: board.lists.toSorted((first, second) => first.position - second.position),
  };
}

export async function findListOnBoard(
  queryClient: QueryClient,
  boardId: string,
  listIdOrName: string,
) {
  const board = await loadBoard(queryClient, boardId);
  return findByIdOrName(board.lists, listIdOrName, {
    entityLabel: 'list',
    scopeLabel: 'Lists on this board',
  });
}
