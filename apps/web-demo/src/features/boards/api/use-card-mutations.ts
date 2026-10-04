import { toast } from '@repo/ui/components/toaster';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BoardDetailQuery } from '../../../gql/graphql';
import { moveCardInBoard } from './board-cache';
import { boardQueryKeys } from './board-queries';
import {
  type CreateCardInput,
  type MoveCardInput,
  type UpdateCardInput,
  archiveCard,
  createCard,
  moveCard,
  restoreCard,
  updateCard,
} from './card-actions';

function showError(error: Error): void {
  toast.error(error.message);
}

/** React hooks for the card actions of one board, with user feedback on failure. */
export function useCardMutations(boardId: string) {
  const queryClient = useQueryClient();
  const boardDetailKey = boardQueryKeys.detail(boardId);

  const createCardMutation = useMutation({
    mutationFn: (input: CreateCardInput) => createCard(queryClient, boardId, input),
    onError: showError,
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: UpdateCardInput }) =>
      updateCard(queryClient, boardId, cardId, input),
    onError: showError,
  });

  const moveCardMutation = useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: MoveCardInput }) =>
      moveCard(queryClient, boardId, cardId, input),
    // Show the move instantly; if the server refuses, put the board back as it was.
    onMutate: async ({ cardId, input }) => {
      await queryClient.cancelQueries({ queryKey: boardDetailKey });
      const boardBeforeMove = queryClient.getQueryData<BoardDetailQuery>(boardDetailKey);
      const cachedBoard = boardBeforeMove?.board;
      if (cachedBoard !== null && cachedBoard !== undefined) {
        const target = input.index ?? input.position ?? 'BOTTOM';
        queryClient.setQueryData<BoardDetailQuery>(boardDetailKey, {
          board: moveCardInBoard(cachedBoard, cardId, input.toListId, target),
        });
      }
      return { boardBeforeMove };
    },
    onError: (error, _variables, context) => {
      if (context?.boardBeforeMove !== undefined) {
        queryClient.setQueryData(boardDetailKey, context.boardBeforeMove);
      }
      showError(error);
    },
  });

  const restoreCardMutation = useMutation({
    mutationFn: (cardId: string) => restoreCard(queryClient, boardId, cardId),
    onError: showError,
  });

  const archiveCardMutation = useMutation({
    mutationFn: (cardId: string) => archiveCard(queryClient, boardId, cardId),
    onSuccess: (archivedCard) => {
      toast(`Archived "${archivedCard.title}"`, {
        action: { label: 'Undo', onClick: () => restoreCardMutation.mutate(archivedCard.id) },
      });
    },
    onError: showError,
  });

  return {
    createCardMutation,
    updateCardMutation,
    moveCardMutation,
    archiveCardMutation,
    restoreCardMutation,
  };
}
