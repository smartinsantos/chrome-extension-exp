import { queryOptions } from '@tanstack/react-query';

import { executeGraphql } from '../../../graphql/execute-graphql';
import { graphql } from '../../../gql';

export const BoardSummariesQueryDocument = graphql(`
  query BoardSummaries {
    boards {
      id
      name
      listCount
      cardCount
    }
  }
`);

/** Query keys in one place, so mutations can refresh exactly what they change. */
export const boardQueryKeys = {
  all: ['boards'] as const,
  summaries: () => [...boardQueryKeys.all, 'summaries'] as const,
  detail: (boardId: string) => [...boardQueryKeys.all, 'detail', boardId] as const,
};

export function boardSummariesQueryOptions() {
  return queryOptions({
    queryKey: boardQueryKeys.summaries(),
    queryFn: () => executeGraphql(BoardSummariesQueryDocument),
    select: (data) => data.boards,
  });
}
