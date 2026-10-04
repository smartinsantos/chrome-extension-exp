import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { useEffect, useRef } from 'react';

import { isCardDragData, isCardDropData, isListDropData } from './card-drag-data';
import {
  type CardDropDestination,
  type CardDropTarget,
  resolveCardDrop,
} from './resolve-card-drop';

/**
 * Watches every card drag on one board and reports where a dropped card should go. Cards
 * dropped on a card win over the list underneath, because the innermost target comes first.
 */
export function useCardDropMonitor(
  boardInstanceId: symbol,
  onCardDropped: (cardId: string, destination: CardDropDestination) => void,
): void {
  const onCardDroppedRef = useRef(onCardDropped);
  useEffect(() => {
    onCardDroppedRef.current = onCardDropped;
  });

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) =>
          isCardDragData(source.data) && source.data.boardInstanceId === boardInstanceId,
        onDrop: ({ source, location }) => {
          const innermostTarget = location.current.dropTargets[0];
          if (innermostTarget === undefined || !isCardDragData(source.data)) return;

          const dropTarget = toCardDropTarget(innermostTarget.data);
          if (dropTarget === undefined) return;
          const destination = resolveCardDrop(source.data, dropTarget);
          if (destination !== undefined) onCardDroppedRef.current(source.data.cardId, destination);
        },
      }),
    [boardInstanceId],
  );
}

function toCardDropTarget(data: Record<string | symbol, unknown>): CardDropTarget | undefined {
  if (isCardDropData(data)) {
    const edge = extractClosestEdge(data);
    if (edge !== 'top' && edge !== 'bottom') return undefined;
    return {
      kind: 'card',
      cardId: data.cardId,
      listId: data.listId,
      position: data.position,
      edge,
    };
  }
  if (isListDropData(data)) {
    return { kind: 'list', listId: data.listId, cardCount: data.cardCount };
  }
  return undefined;
}
