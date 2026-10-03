import { Inject, Injectable } from '@nestjs/common';

import type { BoardListRecord } from '../boards/board.records.js';
import { BoardsRepository } from '../boards/boards.repository.js';
import { CLOCK, type Clock } from '../clock/clock.js';
import { badUserInputError, notFoundError } from '../common/graphql-errors.js';
import { isPresent } from '../common/is-present.js';
import { isValidIsoDate } from '../common/iso-date.js';
import type { LabelRecord } from '../labels/label.record.js';
import { LabelsRepository } from '../labels/labels.repository.js';
import type { CardPosition, CardRecord } from './card.record.js';
import { CardsRepository } from './cards.repository.js';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5_000;

export interface CreateCardCommand {
  listId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  labelNames?: readonly string[] | null;
}

export interface UpdateCardCommand {
  title?: string | null;
  description?: string | null;
  /** `null` clears the due date; leaving it out keeps the current one. */
  dueDate?: string | null;
  isDueComplete?: boolean | null;
  /** Replaces the card's whole label set. */
  labelNames?: readonly string[] | null;
}

export interface MoveCardCommand {
  toListId: string;
  /** Where to put the card in the target list. Defaults to the bottom. */
  position?: CardPosition | null;
  /** Exact 0-based slot in the target list; an index past the end means the bottom. */
  index?: number | null;
}

export interface CardSearchFilter {
  text?: string | null;
  labelNames?: readonly string[] | null;
  listId?: string | null;
  isOverdue?: boolean | null;
  includeArchived?: boolean | null;
}

@Injectable()
export class CardsService {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly boardsRepository: BoardsRepository,
    private readonly labelsRepository: LabelsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  getCard(cardId: string): CardRecord {
    const card = this.cardsRepository.findCardById(cardId);
    if (card === undefined) throw notFoundError('Card', cardId);
    return card;
  }

  findCard(cardId: string): CardRecord | undefined {
    return this.cardsRepository.findCardById(cardId);
  }

  listActiveCardsForList(listId: string): CardRecord[] {
    return this.cardsRepository.listActiveCardsForList(listId);
  }

  listLabelsForCard(cardId: string): LabelRecord[] {
    return this.labelsRepository.listLabelsForCard(cardId);
  }

  /** Overdue means: has a due date before today, isn't marked complete, and isn't archived. */
  isOverdue(card: CardRecord): boolean {
    return (
      card.dueDate !== null &&
      !card.isDueComplete &&
      card.archivedAt === null &&
      card.dueDate < this.clock.todayIsoDate()
    );
  }

  createCard(command: CreateCardCommand): CardRecord {
    const list = this.getList(command.listId);
    const title = validateTitle(command.title);
    const description = validateDescription(command.description ?? '');
    const dueDate = validateDueDate(command.dueDate ?? null);
    const labels = this.resolveLabels(list.boardId, command.labelNames ?? []);

    const cardId = this.cardsRepository.transaction(() => {
      const newCardId = this.cardsRepository.insertCardAtBottom({
        listId: list.id,
        title,
        description,
        dueDate,
        createdAt: this.timestamp(),
      });
      this.cardsRepository.replaceCardLabels(
        newCardId,
        labels.map((label) => label.id),
      );
      return newCardId;
    });
    return this.getCard(cardId);
  }

  updateCard(cardId: string, command: UpdateCardCommand): CardRecord {
    const card = this.getCard(cardId);
    const fields = {
      ...(isPresent(command.title) && { title: validateTitle(command.title) }),
      ...(isPresent(command.description) && {
        description: validateDescription(command.description),
      }),
      ...(command.dueDate !== undefined && { dueDate: validateDueDate(command.dueDate) }),
      ...(isPresent(command.isDueComplete) && { isDueComplete: command.isDueComplete }),
    };
    const labels = isPresent(command.labelNames)
      ? this.resolveLabels(card.boardId, command.labelNames)
      : undefined;

    this.cardsRepository.transaction(() => {
      this.cardsRepository.updateCardFields(card.id, fields, this.timestamp());
      if (labels !== undefined) {
        this.cardsRepository.replaceCardLabels(
          card.id,
          labels.map((label) => label.id),
        );
      }
    });
    return this.getCard(card.id);
  }

  moveCard(cardId: string, command: MoveCardCommand): CardRecord {
    const card = this.getCard(cardId);
    if (card.archivedAt !== null) {
      throw badUserInputError('Archived cards cannot be moved. Restore the card first.');
    }
    const targetList = this.getList(command.toListId);
    if (targetList.boardId !== card.boardId) {
      throw badUserInputError('Cards can only be moved to lists on the same board.', {
        cardBoardId: card.boardId,
        listBoardId: targetList.boardId,
      });
    }
    const targetIndex = this.resolveTargetIndex(command, targetList.id, card);

    this.cardsRepository.transaction(() => {
      this.cardsRepository.placeActiveCard(card.id, targetList.id, targetIndex, this.timestamp());
    });
    return this.getCard(card.id);
  }

  archiveCard(cardId: string): CardRecord {
    const card = this.getCard(cardId);
    if (card.archivedAt !== null) return card;

    this.cardsRepository.transaction(() => {
      const now = this.timestamp();
      this.cardsRepository.setArchivedAt(card.id, now, now);
      this.cardsRepository.compactPositions(card.listId);
    });
    return this.getCard(card.id);
  }

  restoreCard(cardId: string): CardRecord {
    const card = this.getCard(cardId);
    if (card.archivedAt === null) return card;

    this.cardsRepository.transaction(() => {
      const now = this.timestamp();
      this.cardsRepository.setArchivedAt(card.id, null, now);
      const bottomIndex = this.cardsRepository.countActiveCards(card.listId);
      this.cardsRepository.placeActiveCard(card.id, card.listId, bottomIndex, now);
    });
    return this.getCard(card.id);
  }

  searchCards(boardId: string, filter: CardSearchFilter): CardRecord[] {
    if (this.boardsRepository.findBoardById(boardId) === undefined) {
      throw notFoundError('Board', boardId);
    }
    const labels =
      !isPresent(filter.labelNames) || filter.labelNames.length === 0
        ? undefined
        : this.resolveLabels(boardId, filter.labelNames);

    return this.cardsRepository.searchCards(boardId, {
      ...(isPresent(filter.text) && { text: filter.text }),
      ...(labels !== undefined && { labelIds: labels.map((label) => label.id) }),
      ...(isPresent(filter.listId) && { listId: filter.listId }),
      ...(filter.isOverdue === true && { overdueRelativeTo: this.clock.todayIsoDate() }),
      ...(filter.includeArchived === true && { includeArchived: true }),
    });
  }

  private resolveTargetIndex(command: MoveCardCommand, targetListId: string, card: CardRecord) {
    if (isPresent(command.position) && isPresent(command.index)) {
      throw badUserInputError('Give either a position (TOP or BOTTOM) or an index, not both.');
    }
    if (isPresent(command.index)) {
      if (!Number.isInteger(command.index) || command.index < 0) {
        throw badUserInputError('index must be a whole number of 0 or more.');
      }
      return command.index;
    }
    if (command.position === 'TOP') return 0;
    const activeCardCount = this.cardsRepository.countActiveCards(targetListId);
    return targetListId === card.listId ? activeCardCount - 1 : activeCardCount;
  }

  private resolveLabels(boardId: string, labelNames: readonly string[]): LabelRecord[] {
    const { foundLabels, missingNames } = this.labelsRepository.findLabelsByNames(
      boardId,
      labelNames,
    );
    if (missingNames.length > 0) {
      const availableLabelNames = this.labelsRepository
        .listLabelsForBoard(boardId)
        .map((label) => label.name);
      throw badUserInputError(
        `Unknown label(s): ${missingNames.join(', ')}. Available labels: ${availableLabelNames.join(', ')}.`,
        { unknownLabelNames: missingNames, availableLabelNames },
      );
    }
    return foundLabels;
  }

  private getList(listId: string): BoardListRecord {
    const list = this.boardsRepository.findListById(listId);
    if (list === undefined) throw notFoundError('List', listId);
    return list;
  }

  private timestamp(): string {
    return this.clock.now().toISOString();
  }
}

function validateTitle(rawTitle: string): string {
  const title = rawTitle.trim();
  if (title === '') throw badUserInputError('Card title must not be empty.');
  if (title.length > MAX_TITLE_LENGTH) {
    throw badUserInputError(`Card title must be at most ${MAX_TITLE_LENGTH} characters.`);
  }
  return title;
}

function validateDescription(description: string): string {
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw badUserInputError(
      `Card description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
    );
  }
  return description;
}

function validateDueDate(dueDate: string | null): string | null {
  if (dueDate === null) return null;
  if (!isValidIsoDate(dueDate)) {
    throw badUserInputError(`"${dueDate}" is not a valid due date. Use a real date as YYYY-MM-DD.`);
  }
  return dueDate;
}
