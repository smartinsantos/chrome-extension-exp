export interface CardRecord {
  id: string;
  listId: string;
  boardId: string;
  title: string;
  description: string;
  /** `YYYY-MM-DD`, or null when the card has no due date. */
  dueDate: string | null;
  isDueComplete: boolean;
  /** 0-based order among the list's active cards. Meaningless while archived. */
  position: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CardPosition = 'TOP' | 'BOTTOM';

export interface CardSearchCriteria {
  text?: string;
  /** Cards carrying at least one of these labels. */
  labelIds?: readonly string[];
  listId?: string;
  /** Only cards that are overdue relative to this `YYYY-MM-DD` date. */
  overdueRelativeTo?: string;
  includeArchived?: boolean;
}
