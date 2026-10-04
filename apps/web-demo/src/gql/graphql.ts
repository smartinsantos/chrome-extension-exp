/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** Where to put a card in a list. */
export type CardPosition =
  | 'BOTTOM'
  | 'TOP';

/** Narrows a card search. All given conditions must match. */
export type CardSearchFilter = {
  /** Include archived cards (default false). */
  includeArchived?: boolean | null | undefined;
  /** Only cards past their due date and not completed. */
  isOverdue?: boolean | null | undefined;
  /** Cards with at least one of these labels. */
  labelNames?: Array<string> | null | undefined;
  listId?: string | null | undefined;
  /** Text found in the title or description (any case). */
  text?: string | null | undefined;
};

/** A new card, added at the bottom of its list. */
export type CreateCardInput = {
  description?: string | null | undefined;
  /** YYYY-MM-DD */
  dueDate?: string | null | undefined;
  /** Existing label names of the board (any letter case). */
  labelNames?: Array<string> | null | undefined;
  listId: string;
  title: string;
};

/** Color of a board label. */
export type LabelColor =
  | 'BLUE'
  | 'GRAY'
  | 'GREEN'
  | 'ORANGE'
  | 'PINK'
  | 'PURPLE'
  | 'RED'
  | 'YELLOW';

/** Where to move a card: a list on the same board, plus a position or an exact index. */
export type MoveCardInput = {
  /** 0-based slot; past the end means the bottom. */
  index?: number | null | undefined;
  /** Defaults to BOTTOM. */
  position?: CardPosition | null | undefined;
  toListId: string;
};

/** Fields to change on a card. Leave a field out to keep its current value. */
export type UpdateCardInput = {
  description?: string | null | undefined;
  /** YYYY-MM-DD, or null to remove the due date. */
  dueDate?: string | null | undefined;
  isDueComplete?: boolean | null | undefined;
  /** Replaces all labels on the card. */
  labelNames?: Array<string> | null | undefined;
  title?: string | null | undefined;
};

export type BoardSummariesQueryVariables = Exact<{ [key: string]: never; }>;


export type BoardSummariesQuery = { boards: Array<{ id: string, name: string, listCount: number, cardCount: number }> };

export type BoardCardFieldsFragment = { id: string, listId: string, title: string, description: string, dueDate: string | null, isDueComplete: boolean, isOverdue: boolean, position: number, archivedAt: string | null, labels: Array<{ id: string, name: string, color: LabelColor }> };

export type BoardDetailQueryVariables = Exact<{
  boardId: string;
}>;


export type BoardDetailQuery = { board: { id: string, name: string, labels: Array<{ id: string, name: string, color: LabelColor }>, lists: Array<{ id: string, name: string, position: number, cards: Array<{ id: string, listId: string, title: string, description: string, dueDate: string | null, isDueComplete: boolean, isOverdue: boolean, position: number, archivedAt: string | null, labels: Array<{ id: string, name: string, color: LabelColor }> }> }> } | null };

export type SearchCardsQueryVariables = Exact<{
  boardId: string;
  filter?: CardSearchFilter | null | undefined;
}>;


export type SearchCardsQuery = { searchCards: Array<{ id: string, listId: string, title: string, description: string, dueDate: string | null, isDueComplete: boolean, isOverdue: boolean, position: number, archivedAt: string | null, list: { id: string, name: string }, labels: Array<{ id: string, name: string, color: LabelColor }> }> };

export type CreateCardMutationVariables = Exact<{
  input: CreateCardInput;
}>;


export type CreateCardMutation = { createCard: { id: string, listId: string, title: string, description: string, dueDate: string | null, isDueComplete: boolean, isOverdue: boolean, position: number, archivedAt: string | null, labels: Array<{ id: string, name: string, color: LabelColor }> } };

export type UpdateCardMutationVariables = Exact<{
  cardId: string;
  input: UpdateCardInput;
}>;


export type UpdateCardMutation = { updateCard: { id: string, listId: string, title: string, description: string, dueDate: string | null, isDueComplete: boolean, isOverdue: boolean, position: number, archivedAt: string | null, labels: Array<{ id: string, name: string, color: LabelColor }> } };

export type MoveCardMutationVariables = Exact<{
  cardId: string;
  input: MoveCardInput;
}>;


export type MoveCardMutation = { moveCard: { id: string, listId: string, title: string, description: string, dueDate: string | null, isDueComplete: boolean, isOverdue: boolean, position: number, archivedAt: string | null, labels: Array<{ id: string, name: string, color: LabelColor }> } };

export type ArchiveCardMutationVariables = Exact<{
  cardId: string;
}>;


export type ArchiveCardMutation = { archiveCard: { id: string, listId: string, title: string, description: string, dueDate: string | null, isDueComplete: boolean, isOverdue: boolean, position: number, archivedAt: string | null, labels: Array<{ id: string, name: string, color: LabelColor }> } };

export type RestoreCardMutationVariables = Exact<{
  cardId: string;
}>;


export type RestoreCardMutation = { restoreCard: { id: string, listId: string, title: string, description: string, dueDate: string | null, isDueComplete: boolean, isOverdue: boolean, position: number, archivedAt: string | null, labels: Array<{ id: string, name: string, color: LabelColor }> } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const BoardCardFieldsFragmentDoc = new TypedDocumentString(`
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
    `, {"fragmentName":"BoardCardFields"}) as unknown as TypedDocumentString<BoardCardFieldsFragment, unknown>;
export const BoardSummariesDocument = new TypedDocumentString(`
    query BoardSummaries {
  boards {
    id
    name
    listCount
    cardCount
  }
}
    `) as unknown as TypedDocumentString<BoardSummariesQuery, BoardSummariesQueryVariables>;
export const BoardDetailDocument = new TypedDocumentString(`
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
}`) as unknown as TypedDocumentString<BoardDetailQuery, BoardDetailQueryVariables>;
export const SearchCardsDocument = new TypedDocumentString(`
    query SearchCards($boardId: ID!, $filter: CardSearchFilter) {
  searchCards(boardId: $boardId, filter: $filter) {
    ...BoardCardFields
    list {
      id
      name
    }
  }
}
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
}`) as unknown as TypedDocumentString<SearchCardsQuery, SearchCardsQueryVariables>;
export const CreateCardDocument = new TypedDocumentString(`
    mutation CreateCard($input: CreateCardInput!) {
  createCard(input: $input) {
    ...BoardCardFields
  }
}
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
}`) as unknown as TypedDocumentString<CreateCardMutation, CreateCardMutationVariables>;
export const UpdateCardDocument = new TypedDocumentString(`
    mutation UpdateCard($cardId: ID!, $input: UpdateCardInput!) {
  updateCard(id: $cardId, input: $input) {
    ...BoardCardFields
  }
}
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
}`) as unknown as TypedDocumentString<UpdateCardMutation, UpdateCardMutationVariables>;
export const MoveCardDocument = new TypedDocumentString(`
    mutation MoveCard($cardId: ID!, $input: MoveCardInput!) {
  moveCard(id: $cardId, input: $input) {
    ...BoardCardFields
  }
}
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
}`) as unknown as TypedDocumentString<MoveCardMutation, MoveCardMutationVariables>;
export const ArchiveCardDocument = new TypedDocumentString(`
    mutation ArchiveCard($cardId: ID!) {
  archiveCard(id: $cardId) {
    ...BoardCardFields
  }
}
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
}`) as unknown as TypedDocumentString<ArchiveCardMutation, ArchiveCardMutationVariables>;
export const RestoreCardDocument = new TypedDocumentString(`
    mutation RestoreCard($cardId: ID!) {
  restoreCard(id: $cardId) {
    ...BoardCardFields
  }
}
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
}`) as unknown as TypedDocumentString<RestoreCardMutation, RestoreCardMutationVariables>;