import type { BoardCardFieldsFragment } from '../../gql/graphql';

const MAX_DESCRIPTION_PREVIEW_LENGTH = 200;

/**
 * The shape tools return for a card: only what an agent needs to reason about it. Fields that
 * are empty or false are left out, which keeps answers short (and cheaper in tokens).
 */
export interface CompactCard {
  id: string;
  title: string;
  labels: string[];
  description?: string;
  dueDate?: string;
  isOverdue?: true;
  isDueComplete?: true;
}

export function toCompactCard(card: BoardCardFieldsFragment): CompactCard {
  return {
    id: card.id,
    title: card.title,
    labels: card.labels.map((label) => label.name),
    ...(card.description !== '' && {
      description:
        card.description.length > MAX_DESCRIPTION_PREVIEW_LENGTH
          ? `${card.description.slice(0, MAX_DESCRIPTION_PREVIEW_LENGTH)}…`
          : card.description,
    }),
    ...(card.dueDate !== null && card.dueDate !== undefined && { dueDate: card.dueDate }),
    ...(card.isOverdue && { isOverdue: true as const }),
    ...(card.isDueComplete && { isDueComplete: true as const }),
  };
}
