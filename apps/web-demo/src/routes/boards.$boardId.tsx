import { createFileRoute } from '@tanstack/react-router';

import { boardDetailQueryOptions } from '../features/boards/api/board-queries';
import { BoardView } from '../features/boards/components/board-view';

export const Route = createFileRoute('/boards/$boardId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(boardDetailQueryOptions(params.boardId)),
  component: BoardPage,
});

function BoardPage() {
  const { boardId } = Route.useParams();
  return <BoardView boardId={boardId} />;
}
