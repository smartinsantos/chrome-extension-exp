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

graphql(`
  fragment BoardCardFields on Card {
    id
    listId
    title
    description
    dueDate
    isDueComplete
    isOverdue
    position
    archivedAt
    labels {
      id
      name
      color
    }
  }
`);

export const BoardDetailQueryDocument = graphql(`
  query BoardDetail($boardId: ID!) {
    board(id: $boardId) {
      id
      name
      labels {
        id
        name
        color
      }
      lists {
        id
        name
        position
        cards {
          ...BoardCardFields
        }
      }
    }
  }
`);

/** Query keys in one place, so actions refresh exactly what they change. */
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

export function boardDetailQueryOptions(boardId: string) {
  return queryOptions({
    queryKey: boardQueryKeys.detail(boardId),
    queryFn: () => executeGraphql(BoardDetailQueryDocument, { boardId }),
  });
}
