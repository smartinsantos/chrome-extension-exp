import { cn } from '@repo/ui/lib/utils';
import { useRef } from 'react';

import type { BoardCardDetail, BoardListDetail } from '../board-types';
import { useCardListDropTarget } from '../drag-and-drop/use-card-list-drop-target';
import { AddCardComposer } from './add-card-composer';
import { CardTile } from './card-tile';

interface BoardListColumnProps {
  list: BoardListDetail;
  allLists: readonly BoardListDetail[];
  isAddingCard: boolean;
  onAddCard: (title: string) => Promise<unknown>;
  onOpenCard: (card: BoardCardDetail) => void;
  onMoveCard: (card: BoardCardDetail, toListId: string) => void;
  onArchiveCard: (card: BoardCardDetail) => void;
}

export function BoardListColumn({
  list,
  allLists,
  isAddingCard,
  onAddCard,
  onOpenCard,
  onMoveCard,
  onArchiveCard,
}: BoardListColumnProps) {
  const cardListElementRef = useRef<HTMLOListElement>(null);
  const { isCardOver } = useCardListDropTarget(cardListElementRef, {
    id: list.id,
    cardCount: list.cards.length,
  });
  return (
    <section
      aria-label={list.name}
      className="flex max-h-full w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted p-3"
    >
      <header className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{list.name}</h2>
        <span className="text-xs text-muted-foreground">{list.cards.length}</span>
      </header>
      <ol
        ref={cardListElementRef}
        className={cn(
          'flex min-h-10 flex-col gap-2 overflow-y-auto rounded-lg transition-colors',
          isCardOver && 'bg-primary/5',
        )}
      >
        {list.cards.map((card) => (
          <li key={card.id}>
            <CardTile
              card={card}
              lists={allLists}
              onOpen={() => onOpenCard(card)}
              onMove={(toListId) => onMoveCard(card, toListId)}
              onArchive={() => onArchiveCard(card)}
            />
          </li>
        ))}
      </ol>
      <AddCardComposer listName={list.name} isSaving={isAddingCard} onAddCard={onAddCard} />
    </section>
  );
}
