import type { BoardDetailQuery } from '../../../gql/graphql';

export type BoardDetail = NonNullable<BoardDetailQuery['board']>;
export type BoardCard = BoardDetail['lists'][number]['cards'][number];

export const BOARD_ID = 'board-launch';
export const TO_DO_LIST_ID = 'list-to-do';
export const DOING_LIST_ID = 'list-doing';
export const DONE_LIST_ID = 'list-done';

export function buildCard(
  overrides: Partial<BoardCard> & Pick<BoardCard, 'id' | 'title'>,
): BoardCard {
  return {
    listId: TO_DO_LIST_ID,
    description: '',
    dueDate: null,
    isDueComplete: false,
    isOverdue: false,
    position: 0,
    archivedAt: null,
    labels: [],
    ...overrides,
  };
}

/** A small board: To Do (Write docs, Fix bug), Doing (Ship it), Done (empty). */
export function buildBoardDetail(): BoardDetail {
  return {
    id: BOARD_ID,
    name: 'WebMCP Launch',
    labels: [
      { id: 'label-bug', name: 'bug', color: 'RED' },
      { id: 'label-urgent', name: 'urgent', color: 'ORANGE' },
    ],
    lists: [
      {
        id: DOING_LIST_ID,
        name: 'Doing',
        position: 1,
        cards: [buildCard({ id: 'card-ship', title: 'Ship it', listId: DOING_LIST_ID })],
      },
      {
        id: TO_DO_LIST_ID,
        name: 'To Do',
        position: 0,
        cards: [
          buildCard({ id: 'card-docs', title: 'Write docs', dueDate: '2026-10-10' }),
          buildCard({
            id: 'card-bug',
            title: 'Fix bug',
            position: 1,
            dueDate: '2026-10-01',
            isOverdue: true,
            labels: [{ id: 'label-bug', name: 'bug', color: 'RED' }],
          }),
        ],
      },
      { id: DONE_LIST_ID, name: 'Done', position: 2, cards: [] },
    ],
  };
}
