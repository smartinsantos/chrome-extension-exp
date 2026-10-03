/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query BoardSummaries {\n    boards {\n      id\n      name\n      listCount\n      cardCount\n    }\n  }\n": typeof types.BoardSummariesDocument,
    "\n  fragment BoardCardFields on Card {\n    id\n    listId\n    title\n    description\n    dueDate\n    isDueComplete\n    isOverdue\n    position\n    archivedAt\n    labels {\n      id\n      name\n      color\n    }\n  }\n": typeof types.BoardCardFieldsFragmentDoc,
    "\n  query BoardDetail($boardId: ID!) {\n    board(id: $boardId) {\n      id\n      name\n      labels {\n        id\n        name\n        color\n      }\n      lists {\n        id\n        name\n        position\n        cards {\n          ...BoardCardFields\n        }\n      }\n    }\n  }\n": typeof types.BoardDetailDocument,
    "\n  mutation CreateCard($input: CreateCardInput!) {\n    createCard(input: $input) {\n      ...BoardCardFields\n    }\n  }\n": typeof types.CreateCardDocument,
    "\n  mutation UpdateCard($cardId: ID!, $input: UpdateCardInput!) {\n    updateCard(id: $cardId, input: $input) {\n      ...BoardCardFields\n    }\n  }\n": typeof types.UpdateCardDocument,
    "\n  mutation MoveCard($cardId: ID!, $input: MoveCardInput!) {\n    moveCard(id: $cardId, input: $input) {\n      ...BoardCardFields\n    }\n  }\n": typeof types.MoveCardDocument,
    "\n  mutation ArchiveCard($cardId: ID!) {\n    archiveCard(id: $cardId) {\n      ...BoardCardFields\n    }\n  }\n": typeof types.ArchiveCardDocument,
    "\n  mutation RestoreCard($cardId: ID!) {\n    restoreCard(id: $cardId) {\n      ...BoardCardFields\n    }\n  }\n": typeof types.RestoreCardDocument,
};
const documents: Documents = {
    "\n  query BoardSummaries {\n    boards {\n      id\n      name\n      listCount\n      cardCount\n    }\n  }\n": types.BoardSummariesDocument,
    "\n  fragment BoardCardFields on Card {\n    id\n    listId\n    title\n    description\n    dueDate\n    isDueComplete\n    isOverdue\n    position\n    archivedAt\n    labels {\n      id\n      name\n      color\n    }\n  }\n": types.BoardCardFieldsFragmentDoc,
    "\n  query BoardDetail($boardId: ID!) {\n    board(id: $boardId) {\n      id\n      name\n      labels {\n        id\n        name\n        color\n      }\n      lists {\n        id\n        name\n        position\n        cards {\n          ...BoardCardFields\n        }\n      }\n    }\n  }\n": types.BoardDetailDocument,
    "\n  mutation CreateCard($input: CreateCardInput!) {\n    createCard(input: $input) {\n      ...BoardCardFields\n    }\n  }\n": types.CreateCardDocument,
    "\n  mutation UpdateCard($cardId: ID!, $input: UpdateCardInput!) {\n    updateCard(id: $cardId, input: $input) {\n      ...BoardCardFields\n    }\n  }\n": types.UpdateCardDocument,
    "\n  mutation MoveCard($cardId: ID!, $input: MoveCardInput!) {\n    moveCard(id: $cardId, input: $input) {\n      ...BoardCardFields\n    }\n  }\n": types.MoveCardDocument,
    "\n  mutation ArchiveCard($cardId: ID!) {\n    archiveCard(id: $cardId) {\n      ...BoardCardFields\n    }\n  }\n": types.ArchiveCardDocument,
    "\n  mutation RestoreCard($cardId: ID!) {\n    restoreCard(id: $cardId) {\n      ...BoardCardFields\n    }\n  }\n": types.RestoreCardDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BoardSummaries {\n    boards {\n      id\n      name\n      listCount\n      cardCount\n    }\n  }\n"): typeof import('./graphql').BoardSummariesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BoardCardFields on Card {\n    id\n    listId\n    title\n    description\n    dueDate\n    isDueComplete\n    isOverdue\n    position\n    archivedAt\n    labels {\n      id\n      name\n      color\n    }\n  }\n"): typeof import('./graphql').BoardCardFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BoardDetail($boardId: ID!) {\n    board(id: $boardId) {\n      id\n      name\n      labels {\n        id\n        name\n        color\n      }\n      lists {\n        id\n        name\n        position\n        cards {\n          ...BoardCardFields\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').BoardDetailDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCard($input: CreateCardInput!) {\n    createCard(input: $input) {\n      ...BoardCardFields\n    }\n  }\n"): typeof import('./graphql').CreateCardDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCard($cardId: ID!, $input: UpdateCardInput!) {\n    updateCard(id: $cardId, input: $input) {\n      ...BoardCardFields\n    }\n  }\n"): typeof import('./graphql').UpdateCardDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveCard($cardId: ID!, $input: MoveCardInput!) {\n    moveCard(id: $cardId, input: $input) {\n      ...BoardCardFields\n    }\n  }\n"): typeof import('./graphql').MoveCardDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveCard($cardId: ID!) {\n    archiveCard(id: $cardId) {\n      ...BoardCardFields\n    }\n  }\n"): typeof import('./graphql').ArchiveCardDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RestoreCard($cardId: ID!) {\n    restoreCard(id: $cardId) {\n      ...BoardCardFields\n    }\n  }\n"): typeof import('./graphql').RestoreCardDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
