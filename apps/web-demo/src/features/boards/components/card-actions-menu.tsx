import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Archive, ArrowRight, Ellipsis } from 'lucide-react';

import type { BoardCardDetail, BoardListDetail } from '../board-types';

interface CardActionsMenuProps {
  card: BoardCardDetail;
  lists: readonly BoardListDetail[];
  onMove: (toListId: string) => void;
  onArchive: () => void;
}

/** The keyboard-friendly way to move or archive a card (drag and drop does the same). */
export function CardActionsMenu({ card, lists, onMove, onArchive }: CardActionsMenuProps) {
  const otherLists = lists.filter((list) => list.id !== card.listId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-xs" aria-label={`Actions for ${card.title}`} />}
      >
        <Ellipsis aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {otherLists.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Move</DropdownMenuLabel>
            {otherLists.map((list) => (
              <DropdownMenuItem key={list.id} onClick={() => onMove(list.id)}>
                <ArrowRight aria-hidden />
                Move to {list.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onArchive}>
          <Archive aria-hidden />
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
