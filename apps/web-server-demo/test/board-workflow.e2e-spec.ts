import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, type GraphqlResponse, sendGraphql } from './create-test-app.js';

interface BoardsData {
  boards: { id: string; name: string; lists: { id: string; name: string }[] }[];
}
interface CardData {
  id: string;
  title: string;
  listId: string;
  position: number;
  dueDate: string | null;
  isOverdue: boolean;
  archivedAt: string | null;
  labels: { name: string }[];
  list: { name: string };
}

const CARD_FIELDS =
  'id title listId position dueDate isOverdue archivedAt labels { name } list { name }';

describe('Board workflow over GraphQL', () => {
  let app: INestApplication;
  let boardId: string;
  let listIdByName: Map<string, string>;

  beforeAll(async () => {
    app = await createTestApp({ today: '2026-10-03' });
    const response = await sendGraphql<BoardsData>(app, '{ boards { id name lists { id name } } }');
    const launchBoard = response.data?.boards.find((board) => board.name === 'WebMCP Launch');
    if (launchBoard === undefined) throw new Error('Seeded board missing');
    boardId = launchBoard.id;
    listIdByName = new Map(launchBoard.lists.map((list) => [list.name, list.id]));
  });

  afterAll(async () => {
    await app.close();
  });

  async function runCardMutation(
    mutation: string,
    variables: Record<string, unknown>,
  ): Promise<GraphqlResponse<Record<string, CardData>>> {
    return sendGraphql<Record<string, CardData>>(app, mutation, variables);
  }

  it('creates, finds, moves, relabels, archives and restores a card', async () => {
    const created = await runCardMutation(
      `mutation ($input: CreateCardInput!) { createCard(input: $input) { ${CARD_FIELDS} } }`,
      {
        input: {
          listId: listIdByName.get('To Do'),
          title: 'Record the demo video',
          dueDate: '2026-10-01',
          labelNames: ['docs'],
        },
      },
    );
    const card = created.data?.['createCard'];
    expect(card).toMatchObject({
      title: 'Record the demo video',
      isOverdue: true,
      labels: [{ name: 'docs' }],
      list: { name: 'To Do' },
    });
    const cardId = card?.id ?? '';

    const found = await sendGraphql<{ searchCards: CardData[] }>(
      app,
      `query ($boardId: ID!, $filter: CardSearchFilter) { searchCards(boardId: $boardId, filter: $filter) { id } }`,
      { boardId, filter: { text: 'demo video' } },
    );
    expect(found.data?.searchCards.map((result) => result.id)).toEqual([cardId]);

    const moved = await runCardMutation(
      `mutation ($id: ID!, $input: MoveCardInput!) { moveCard(id: $id, input: $input) { ${CARD_FIELDS} } }`,
      { id: cardId, input: { toListId: listIdByName.get('Doing'), position: 'TOP' } },
    );
    expect(moved.data?.['moveCard']).toMatchObject({ position: 0, list: { name: 'Doing' } });

    const relabeled = await runCardMutation(
      `mutation ($id: ID!, $input: UpdateCardInput!) { updateCard(id: $id, input: $input) { ${CARD_FIELDS} } }`,
      { id: cardId, input: { labelNames: ['URGENT', 'feature'], dueDate: null } },
    );
    expect(relabeled.data?.['updateCard']).toMatchObject({
      labels: [{ name: 'feature' }, { name: 'urgent' }],
      dueDate: null,
      isOverdue: false,
    });

    const archived = await runCardMutation(
      `mutation ($id: ID!) { archiveCard(id: $id) { ${CARD_FIELDS} } }`,
      { id: cardId },
    );
    expect(archived.data?.['archiveCard']?.archivedAt).not.toBeNull();

    const restored = await runCardMutation(
      `mutation ($id: ID!) { restoreCard(id: $id) { ${CARD_FIELDS} } }`,
      { id: cardId },
    );
    expect(restored.data?.['restoreCard']).toMatchObject({
      archivedAt: null,
      list: { name: 'Doing' },
    });
  });

  it('lists a board with its cards in order through nested fields', async () => {
    const response = await sendGraphql<{
      board: { lists: { name: string; cards: { title: string; position: number }[] }[] };
    }>(app, 'query ($id: ID!) { board(id: $id) { lists { name cards { title position } } } }', {
      id: boardId,
    });

    for (const list of response.data?.board.lists ?? []) {
      expect(list.cards.map((card) => card.position)).toEqual(list.cards.map((_, index) => index));
    }
  });

  it('answers unknown ids with NOT_FOUND', async () => {
    const response = await runCardMutation(
      `mutation { archiveCard(id: "does-not-exist") { id } }`,
      {},
    );

    expect(response.errors?.[0]?.extensions?.['code']).toBe('NOT_FOUND');
    expect(response.errors?.[0]?.extensions?.['stacktrace']).toBeUndefined();
  });

  it('answers unknown labels with BAD_USER_INPUT listing the available ones', async () => {
    const response = await runCardMutation(
      `mutation ($input: CreateCardInput!) { createCard(input: $input) { id } }`,
      { input: { listId: listIdByName.get('To Do'), title: 'x', labelNames: ['someday'] } },
    );

    expect(response.errors?.[0]?.extensions).toMatchObject({
      code: 'BAD_USER_INPUT',
      availableLabelNames: ['bug', 'docs', 'feature', 'urgent'],
    });
  });
});
