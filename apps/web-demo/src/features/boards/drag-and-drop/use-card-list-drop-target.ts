import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type RefObject, useEffect, useState } from 'react';

import { useBoardInstanceId } from './board-drag-and-drop-context';
import { createListDropData, isCardDragData } from './card-drag-data';

/** Lets a card be dropped onto a list's empty space (it lands at the bottom). */
export function useCardListDropTarget(
  listElementRef: RefObject<HTMLElement | null>,
  list: { id: string; cardCount: number },
): { isCardOver: boolean } {
  const boardInstanceId = useBoardInstanceId();
  const [isCardOver, setIsCardOver] = useState(false);

  useEffect(() => {
    const listElement = listElementRef.current;
    if (listElement === null) return undefined;
    return dropTargetForElements({
      element: listElement,
      canDrop: ({ source }) =>
        isCardDragData(source.data) && source.data.boardInstanceId === boardInstanceId,
      getData: () =>
        createListDropData({ boardInstanceId, listId: list.id, cardCount: list.cardCount }),
      onDragEnter: () => setIsCardOver(true),
      onDragLeave: () => setIsCardOver(false),
      onDrop: () => setIsCardOver(false),
    });
  }, [listElementRef, boardInstanceId, list.id, list.cardCount]);

  return { isCardOver };
}
