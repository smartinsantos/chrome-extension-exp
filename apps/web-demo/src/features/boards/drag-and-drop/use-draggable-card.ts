import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { type RefObject, useEffect, useState } from 'react';

import { useBoardInstanceId } from './board-drag-and-drop-context';
import { createCardDragData, createCardDropData, isCardDragData } from './card-drag-data';

interface DraggableCardState {
  isDragging: boolean;
  /** Which edge of this card a dragged card would land on, to draw the drop line. */
  closestEdge: Edge | null;
}

/** Makes a card draggable and lets other cards be dropped just above or below it. */
export function useDraggableCard(
  cardElementRef: RefObject<HTMLElement | null>,
  card: { id: string; listId: string; position: number },
): DraggableCardState {
  const boardInstanceId = useBoardInstanceId();
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const cardElement = cardElementRef.current;
    if (cardElement === null) return undefined;
    const cardIdentity = {
      boardInstanceId,
      cardId: card.id,
      listId: card.listId,
      position: card.position,
    };

    return combine(
      draggable({
        element: cardElement,
        getInitialData: () => createCardDragData(cardIdentity),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: cardElement,
        canDrop: ({ source }) =>
          isCardDragData(source.data) && source.data.boardInstanceId === boardInstanceId,
        getData: ({ input, element }) =>
          attachClosestEdge(createCardDropData(cardIdentity), {
            input,
            element,
            allowedEdges: ['top', 'bottom'],
          }),
        onDrag: ({ self, source }) =>
          setClosestEdge(
            isCardDragData(source.data) && source.data.cardId === card.id
              ? null
              : extractClosestEdge(self.data),
          ),
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      }),
    );
  }, [cardElementRef, boardInstanceId, card.id, card.listId, card.position]);

  return { isDragging, closestEdge };
}
