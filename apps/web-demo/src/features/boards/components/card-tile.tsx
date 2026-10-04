import { cn } from '@repo/ui/lib/utils';
import { AlignLeft } from 'lucide-react';
import { useRef } from 'react';

import type { BoardCardDetail, BoardListDetail } from '../board-types';
import { useDraggableCard } from '../drag-and-drop/use-draggable-card';
import { CardActionsMenu } from './card-actions-menu';
import { DueDateBadge } from './due-date-badge';
import { LabelChip } from './label-chip';

interface CardTileProps {
  card: BoardCardDetail;
  lists: readonly BoardListDetail[];
  onOpen: () => void;
  onMove: (toListId: string) => void;
  onArchive: () => void;
}

export function CardTile({ card, lists, onOpen, onMove, onArchive }: CardTileProps) {
  const cardElementRef = useRef<HTMLElement>(null);
  const { isDragging, closestEdge } = useDraggableCard(cardElementRef, card);
  const hasDetails = card.labels.length > 0 || card.dueDate !== null || card.description !== '';
  return (
    <article
      ref={cardElementRef}
      aria-label={card.title}
      className={cn(
        'group relative space-y-2 rounded-lg border bg-card p-3 text-card-foreground shadow-xs transition-shadow hover:shadow-sm',
        isDragging && 'opacity-40',
      )}
    >
      {closestEdge !== null && <DropIndicatorLine edge={closestEdge} />}
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`Open ${card.title}`}
          onClick={onOpen}
          className="flex-1 text-left text-sm font-medium leading-snug outline-none hover:underline focus-visible:underline"
        >
          {card.title}
        </button>
        <CardActionsMenu card={card} lists={lists} onMove={onMove} onArchive={onArchive} />
      </div>
      {hasDetails && (
        <div className="flex flex-wrap items-center gap-1.5">
          {card.labels.map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} />
          ))}
          {card.dueDate !== null && (
            <DueDateBadge
              dueDate={card.dueDate}
              isOverdue={card.isOverdue}
              isDueComplete={card.isDueComplete}
            />
          )}
          {card.description !== '' && (
            <AlignLeft className="size-3.5 text-muted-foreground" aria-label="Has a description" />
          )}
        </div>
      )}
    </article>
  );
}

/** Shows where a dragged card will land: a line just above or below this card. */
function DropIndicatorLine({ edge }: { edge: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-primary',
        edge === 'top' ? '-top-[5px]' : '-bottom-[5px]',
      )}
    />
  );
}
