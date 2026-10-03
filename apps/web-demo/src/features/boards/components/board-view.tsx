import { Skeleton } from '@repo/ui/components/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { boardDetailQueryOptions } from '../api/board-queries';
import { useCardMutations } from '../api/use-card-mutations';
import { BoardListColumn } from './board-list-column';
import { CardDetailsDialog } from './card-details-dialog';
import { QueryErrorMessage } from './query-error-message';

export function BoardView({ boardId }: { boardId: string }) {
  const boardQuery = useQuery(boardDetailQueryOptions(boardId));
  const { createCardMutation, updateCardMutation, moveCardMutation, archiveCardMutation } =
    useCardMutations(boardId);
  const [openCardId, setOpenCardId] = useState<string>();

  if (boardQuery.isPending) {
    return (
      <div className="flex gap-4 p-6" aria-busy="true">
        <Skeleton className="h-64 w-72" />
        <Skeleton className="h-64 w-72" />
        <Skeleton className="h-64 w-72" />
      </div>
    );
  }
  if (boardQuery.isError) {
    return (
      <div className="p-6">
        <QueryErrorMessage error={boardQuery.error} />
      </div>
    );
  }
  const board = boardQuery.data.board;
  if (board === null || board === undefined) {
    return <p className="p-6 text-muted-foreground">This board doesn&apos;t exist.</p>;
  }

  const listsInOrder = board.lists.toSorted((first, second) => first.position - second.position);
  const openCard = board.lists.flatMap((list) => list.cards).find((card) => card.id === openCardId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="px-6 pt-5 pb-3 text-xl font-semibold tracking-tight">{board.name}</h1>
      <div className="flex min-h-0 flex-1 items-start gap-4 overflow-x-auto px-6 pb-6">
        {listsInOrder.map((list) => (
          <BoardListColumn
            key={list.id}
            list={list}
            allLists={listsInOrder}
            isAddingCard={createCardMutation.isPending}
            onAddCard={(title) => createCardMutation.mutateAsync({ listId: list.id, title })}
            onOpenCard={(card) => setOpenCardId(card.id)}
            onMoveCard={(card, toListId) =>
              moveCardMutation.mutate({ cardId: card.id, input: { toListId, position: 'BOTTOM' } })
            }
            onArchiveCard={(card) => archiveCardMutation.mutate(card.id)}
          />
        ))}
      </div>
      <CardDetailsDialog
        card={openCard}
        boardLabels={board.labels}
        isSaving={updateCardMutation.isPending}
        onClose={() => setOpenCardId(undefined)}
        onSave={async (input) => {
          if (openCard === undefined) return;
          await updateCardMutation.mutateAsync({ cardId: openCard.id, input });
          setOpenCardId(undefined);
        }}
      />
    </div>
  );
}
