import type { BoardDetailQuery, CardPosition } from '../../../gql/graphql';

type BoardDetail = NonNullable<BoardDetailQuery['board']>;

/**
 * Returns a copy of the cached board with one card moved, mirroring what the server will do.
 * Used for optimistic updates, so a drag or menu move shows instantly; the server's answer
 * then replaces this guess.
 */
export function moveCardInBoard<TBoard extends BoardDetail>(
  board: TBoard,
  cardId: string,
  toListId: string,
  target: CardPosition | number,
): TBoard {
  const sourceList = board.lists.find((list) => list.cards.some((card) => card.id === cardId));
  const targetList = board.lists.find((list) => list.id === toListId);
  const movingCard = sourceList?.cards.find((card) => card.id === cardId);
  if (sourceList === undefined || targetList === undefined || movingCard === undefined) {
    return board;
  }

  const remainingSourceCards = sourceList.cards.filter((card) => card.id !== cardId);
  const targetCardsWithoutMovingCard =
    targetList.id === sourceList.id ? remainingSourceCards : [...targetList.cards];
  const insertAt =
    target === 'TOP'
      ? 0
      : target === 'BOTTOM'
        ? targetCardsWithoutMovingCard.length
        : Math.min(Math.max(target, 0), targetCardsWithoutMovingCard.length);
  const targetCards = targetCardsWithoutMovingCard.toSpliced(insertAt, 0, {
    ...movingCard,
    listId: targetList.id,
  });

  return {
    ...board,
    lists: board.lists.map((list) => {
      if (list.id === targetList.id) return { ...list, cards: renumber(targetCards) };
      if (list.id === sourceList.id) return { ...list, cards: renumber(remainingSourceCards) };
      return list;
    }),
  };
}

function renumber<TCard extends { position: number }>(cards: readonly TCard[]): TCard[] {
  return cards.map((card, position) => ({ ...card, position }));
}
