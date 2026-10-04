export interface DraggedCard {
  cardId: string;
  listId: string;
  position: number;
}

export type CardDropTarget =
  | { kind: 'card'; cardId: string; listId: string; position: number; edge: 'top' | 'bottom' }
  | { kind: 'list'; listId: string; cardCount: number };

export interface CardDropDestination {
  toListId: string;
  /** Slot among the target list's cards, not counting the dragged card itself. */
  index: number;
}

/**
 * Turns "dropped above/below this card" or "dropped on this list" into the move the server
 * understands. Returns undefined when the drop would leave the card where it already is.
 */
export function resolveCardDrop(
  draggedCard: DraggedCard,
  dropTarget: CardDropTarget,
): CardDropDestination | undefined {
  const isSameList = dropTarget.listId === draggedCard.listId;

  let index: number;
  if (dropTarget.kind === 'list') {
    index = isSameList ? dropTarget.cardCount - 1 : dropTarget.cardCount;
  } else {
    if (dropTarget.cardId === draggedCard.cardId) return undefined;
    const slotBeside = dropTarget.edge === 'top' ? dropTarget.position : dropTarget.position + 1;
    // Within one list, the dragged card's own slot disappears first, shifting later slots up.
    index = isSameList && draggedCard.position < dropTarget.position ? slotBeside - 1 : slotBeside;
  }

  if (isSameList && index === draggedCard.position) return undefined;
  return { toListId: dropTarget.listId, index };
}
