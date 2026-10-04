import type { QueryClient } from '@tanstack/react-query';

import { executeGraphql } from '../../../graphql/execute-graphql';
import { graphql } from '../../../gql';
import type {
  CardPosition,
  CreateCardInput,
  MoveCardInput,
  UpdateCardInput,
} from '../../../gql/graphql';
import { boardQueryKeys } from './board-queries';

const CreateCardMutationDocument = graphql(`
  mutation CreateCard($input: CreateCardInput!) {
    createCard(input: $input) {
      ...BoardCardFields
    }
  }
`);

const UpdateCardMutationDocument = graphql(`
  mutation UpdateCard($cardId: ID!, $input: UpdateCardInput!) {
    updateCard(id: $cardId, input: $input) {
      ...BoardCardFields
    }
  }
`);

const MoveCardMutationDocument = graphql(`
  mutation MoveCard($cardId: ID!, $input: MoveCardInput!) {
    moveCard(id: $cardId, input: $input) {
      ...BoardCardFields
    }
  }
`);

const ArchiveCardMutationDocument = graphql(`
  mutation ArchiveCard($cardId: ID!) {
    archiveCard(id: $cardId) {
      ...BoardCardFields
    }
  }
`);

const RestoreCardMutationDocument = graphql(`
  mutation RestoreCard($cardId: ID!) {
    restoreCard(id: $cardId) {
      ...BoardCardFields
    }
  }
`);

export type { CardPosition, CreateCardInput, MoveCardInput, UpdateCardInput };

/**
 * The board's card actions. The UI (through hooks) and the WebMCP tools both call these, so
 * an action taken by an AI agent behaves exactly like the same action taken with the mouse.
 * Each one saves through GraphQL, then refreshes the cached board so every view updates.
 */
export async function createCard(
  queryClient: QueryClient,
  boardId: string,
  input: CreateCardInput,
) {
  const { createCard: card } = await executeGraphql(CreateCardMutationDocument, { input });
  await refreshBoard(queryClient, boardId);
  return card;
}

export async function updateCard(
  queryClient: QueryClient,
  boardId: string,
  cardId: string,
  input: UpdateCardInput,
) {
  const { updateCard: card } = await executeGraphql(UpdateCardMutationDocument, { cardId, input });
  await refreshBoard(queryClient, boardId);
  return card;
}

export async function moveCard(
  queryClient: QueryClient,
  boardId: string,
  cardId: string,
  input: MoveCardInput,
) {
  const { moveCard: card } = await executeGraphql(MoveCardMutationDocument, { cardId, input });
  await refreshBoard(queryClient, boardId);
  return card;
}

export async function archiveCard(queryClient: QueryClient, boardId: string, cardId: string) {
  const { archiveCard: card } = await executeGraphql(ArchiveCardMutationDocument, { cardId });
  await refreshBoard(queryClient, boardId);
  return card;
}

export async function restoreCard(queryClient: QueryClient, boardId: string, cardId: string) {
  const { restoreCard: card } = await executeGraphql(RestoreCardMutationDocument, { cardId });
  await refreshBoard(queryClient, boardId);
  return card;
}

async function refreshBoard(queryClient: QueryClient, boardId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: boardQueryKeys.detail(boardId) }),
    queryClient.invalidateQueries({ queryKey: boardQueryKeys.summaries() }),
  ]);
}
