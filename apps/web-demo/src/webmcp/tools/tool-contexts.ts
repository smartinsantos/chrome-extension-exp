import type { QueryClient } from '@tanstack/react-query';

/** What tools available on every page need from the app. */
export interface GlobalToolContext {
  queryClient: QueryClient;
  openBoard: (boardId: string) => Promise<void>;
}

/** What tools available while a board is open need from the app. */
export interface BoardToolContext {
  queryClient: QueryClient;
  boardId: string;
  /** Tells the user an agent archived a card, with a way to undo it. */
  announceArchivedCard: (card: { id: string; title: string }) => void;
}
