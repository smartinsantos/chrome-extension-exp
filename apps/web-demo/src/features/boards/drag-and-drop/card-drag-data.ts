import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

/**
 * Drag-and-drop payloads are plain records. A private key marks the ones this board created,
 * and each board gets its own instance id, so two boards (or other drag sources on the page)
 * can never drop into each other.
 */
const CARD_DRAG_KEY = Symbol('card-drag');
const CARD_DROP_KEY = Symbol('card-drop');
const LIST_DROP_KEY = Symbol('list-drop');

// Type aliases (not interfaces) so these satisfy the library's Record-based data type.
type CardIdentity = {
  boardInstanceId: symbol;
  cardId: string;
  listId: string;
  position: number;
};

export type CardDragData = CardIdentity & { [CARD_DRAG_KEY]: true };
export type CardDropData = CardIdentity & { [CARD_DROP_KEY]: true; closestEdge?: Edge | null };
export type ListDropData = {
  [LIST_DROP_KEY]: true;
  boardInstanceId: symbol;
  listId: string;
  cardCount: number;
};

export function createCardDragData(card: CardIdentity): CardDragData {
  return { ...card, [CARD_DRAG_KEY]: true };
}

export function createCardDropData(card: CardIdentity): CardDropData {
  return { ...card, [CARD_DROP_KEY]: true };
}

export function createListDropData(list: Omit<ListDropData, typeof LIST_DROP_KEY>): ListDropData {
  return { ...list, [LIST_DROP_KEY]: true };
}

export function isCardDragData(data: Record<string | symbol, unknown>): data is CardDragData {
  return data[CARD_DRAG_KEY] === true;
}

export function isCardDropData(data: Record<string | symbol, unknown>): data is CardDropData {
  return data[CARD_DROP_KEY] === true;
}

export function isListDropData(data: Record<string | symbol, unknown>): data is ListDropData {
  return data[LIST_DROP_KEY] === true;
}
