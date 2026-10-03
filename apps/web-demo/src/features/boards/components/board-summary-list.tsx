import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Skeleton } from '@repo/ui/components/skeleton';
import { useQuery } from '@tanstack/react-query';

import { boardSummariesQueryOptions } from '../api/board-queries';
import { QueryErrorMessage } from './query-error-message';

export function BoardSummaryList() {
  const boardsQuery = useQuery(boardSummariesQueryOptions());

  if (boardsQuery.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (boardsQuery.isError) return <QueryErrorMessage error={boardsQuery.error} />;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {boardsQuery.data.map((board) => (
        <li key={board.id}>
          <Card>
            <CardHeader>
              <CardTitle>{board.name}</CardTitle>
              <CardDescription>
                {board.listCount} lists · {board.cardCount} cards
              </CardDescription>
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  );
}
