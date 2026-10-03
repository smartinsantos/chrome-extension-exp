import { describe, expect, it } from 'vitest';

import { resolveCardDrop } from './resolve-card-drop';

const TO_DO = 'list-to-do';
const DOING = 'list-doing';

describe('resolveCardDrop', () => {
  it("drops above a card in another list at that card's position", () => {
    expect(
      resolveCardDrop(
        { cardId: 'a', listId: TO_DO, position: 0 },
        { kind: 'card', cardId: 'x', listId: DOING, position: 1, edge: 'top' },
      ),
    ).toEqual({ toListId: DOING, index: 1 });
  });

  it('drops below a card in another list right after it', () => {
    expect(
      resolveCardDrop(
        { cardId: 'a', listId: TO_DO, position: 0 },
        { kind: 'card', cardId: 'x', listId: DOING, position: 1, edge: 'bottom' },
      ),
    ).toEqual({ toListId: DOING, index: 2 });
  });

  it('accounts for the dragged card leaving its slot when moving down the same list', () => {
    // List: a(0) b(1) c(2). Dropping "a" below "c" makes the order b, c, a.
    expect(
      resolveCardDrop(
        { cardId: 'a', listId: TO_DO, position: 0 },
        { kind: 'card', cardId: 'c', listId: TO_DO, position: 2, edge: 'bottom' },
      ),
    ).toEqual({ toListId: TO_DO, index: 2 });
    // Dropping "a" above "c" makes the order b, a, c.
    expect(
      resolveCardDrop(
        { cardId: 'a', listId: TO_DO, position: 0 },
        { kind: 'card', cardId: 'c', listId: TO_DO, position: 2, edge: 'top' },
      ),
    ).toEqual({ toListId: TO_DO, index: 1 });
  });

  it('moves up the same list', () => {
    // List: a(0) b(1) c(2). Dropping "c" above "a" makes the order c, a, b.
    expect(
      resolveCardDrop(
        { cardId: 'c', listId: TO_DO, position: 2 },
        { kind: 'card', cardId: 'a', listId: TO_DO, position: 0, edge: 'top' },
      ),
    ).toEqual({ toListId: TO_DO, index: 0 });
  });

  it('ignores drops that would leave the card where it already is', () => {
    const draggedCard = { cardId: 'b', listId: TO_DO, position: 1 };

    expect(
      resolveCardDrop(draggedCard, {
        kind: 'card',
        cardId: 'b',
        listId: TO_DO,
        position: 1,
        edge: 'top',
      }),
    ).toBeUndefined();
    expect(
      resolveCardDrop(draggedCard, {
        kind: 'card',
        cardId: 'a',
        listId: TO_DO,
        position: 0,
        edge: 'bottom',
      }),
    ).toBeUndefined();
    expect(
      resolveCardDrop(draggedCard, {
        kind: 'card',
        cardId: 'c',
        listId: TO_DO,
        position: 2,
        edge: 'top',
      }),
    ).toBeUndefined();
  });

  it("drops onto a list's empty space at the bottom of that list", () => {
    expect(
      resolveCardDrop(
        { cardId: 'a', listId: TO_DO, position: 0 },
        { kind: 'list', listId: DOING, cardCount: 3 },
      ),
    ).toEqual({ toListId: DOING, index: 3 });
  });

  it("moves a card to the bottom of its own list when dropped on its list's empty space", () => {
    expect(
      resolveCardDrop(
        { cardId: 'a', listId: TO_DO, position: 0 },
        { kind: 'list', listId: TO_DO, cardCount: 3 },
      ),
    ).toEqual({ toListId: TO_DO, index: 2 });
    expect(
      resolveCardDrop(
        { cardId: 'c', listId: TO_DO, position: 2 },
        { kind: 'list', listId: TO_DO, cardCount: 3 },
      ),
    ).toBeUndefined();
  });
});
