import { AlignLeft } from 'lucide-react';

import type { BoardCardDetail, BoardListDetail } from '../board-types';
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
  const hasDetails = card.labels.length > 0 || card.dueDate !== null || card.description !== '';
  return (
    <article
      aria-label={card.title}
      className="group space-y-2 rounded-lg border bg-card p-3 text-card-foreground shadow-xs transition-shadow hover:shadow-sm"
    >
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
