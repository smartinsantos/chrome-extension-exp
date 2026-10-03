import { randomUUID } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';

import { Inject, Injectable } from '@nestjs/common';

import {
  type SqlRow,
  readBoolean,
  readInteger,
  readNullableText,
  readText,
} from '../common/sql-row.js';
import { DATABASE } from '../database/database.tokens.js';
import { runInTransaction } from '../database/run-in-transaction.js';
import type { CardRecord, CardSearchCriteria } from './card.record.js';

const SELECT_CARDS_WITH_BOARD = `
  SELECT cards.*, board_lists.board_id AS board_id
  FROM cards JOIN board_lists ON board_lists.id = cards.list_id`;

export interface NewCardFields {
  listId: string;
  title: string;
  description: string;
  dueDate: string | null;
  createdAt: string;
}

export interface EditableCardFields {
  title?: string;
  description?: string;
  dueDate?: string | null;
  isDueComplete?: boolean;
}

/**
 * SQL for cards. Methods that touch several rows expect the caller (the service) to wrap them
 * in a transaction, so a whole user action succeeds or fails as one.
 */
@Injectable()
export class CardsRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseSync) {}

  /** Runs several repository calls atomically. */
  transaction<TResult>(work: () => TResult): TResult {
    return runInTransaction(this.database, work);
  }

  findCardById(cardId: string): CardRecord | undefined {
    const row = this.database.prepare(`${SELECT_CARDS_WITH_BOARD} WHERE cards.id = ?`).get(cardId);
    return row === undefined ? undefined : toCardRecord(row);
  }

  listActiveCardsForList(listId: string): CardRecord[] {
    return this.database
      .prepare(
        `${SELECT_CARDS_WITH_BOARD} WHERE cards.list_id = ? AND cards.archived_at IS NULL ORDER BY cards.position`,
      )
      .all(listId)
      .map(toCardRecord);
  }

  searchCards(boardId: string, criteria: CardSearchCriteria): CardRecord[] {
    const conditions = ['board_lists.board_id = ?'];
    const parameters: SQLInputValue[] = [boardId];

    if (criteria.includeArchived !== true) conditions.push('cards.archived_at IS NULL');
    if (criteria.listId !== undefined) {
      conditions.push('cards.list_id = ?');
      parameters.push(criteria.listId);
    }
    if (criteria.text !== undefined && criteria.text.trim() !== '') {
      // instr() + lower() gives a case-insensitive "contains" without LIKE wildcard surprises.
      conditions.push(
        '(instr(lower(cards.title), ?) > 0 OR instr(lower(cards.description), ?) > 0)',
      );
      const lowerCaseText = criteria.text.trim().toLowerCase();
      parameters.push(lowerCaseText, lowerCaseText);
    }
    if (criteria.overdueRelativeTo !== undefined) {
      conditions.push(
        'cards.due_date IS NOT NULL AND cards.due_date < ? AND cards.is_due_complete = 0 AND cards.archived_at IS NULL',
      );
      parameters.push(criteria.overdueRelativeTo);
    }
    if (criteria.labelIds !== undefined && criteria.labelIds.length > 0) {
      const placeholders = criteria.labelIds.map(() => '?').join(', ');
      conditions.push(
        `EXISTS (SELECT 1 FROM card_labels WHERE card_labels.card_id = cards.id AND card_labels.label_id IN (${placeholders}))`,
      );
      parameters.push(...criteria.labelIds);
    }

    return this.database
      .prepare(
        `${SELECT_CARDS_WITH_BOARD} WHERE ${conditions.join(' AND ')}
         ORDER BY board_lists.position, cards.archived_at IS NOT NULL, cards.position`,
      )
      .all(...parameters)
      .map(toCardRecord);
  }

  insertCardAtBottom(fields: NewCardFields): string {
    const cardId = randomUUID();
    this.database
      .prepare(
        `INSERT INTO cards (id, list_id, title, description, due_date, is_due_complete, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      )
      .run(
        cardId,
        fields.listId,
        fields.title,
        fields.description,
        fields.dueDate,
        this.countActiveCards(fields.listId),
        fields.createdAt,
        fields.createdAt,
      );
    return cardId;
  }

  updateCardFields(cardId: string, fields: EditableCardFields, updatedAt: string): void {
    const assignments = ['updated_at = ?'];
    const parameters: SQLInputValue[] = [updatedAt];
    if (fields.title !== undefined) {
      assignments.push('title = ?');
      parameters.push(fields.title);
    }
    if (fields.description !== undefined) {
      assignments.push('description = ?');
      parameters.push(fields.description);
    }
    if (fields.dueDate !== undefined) {
      assignments.push('due_date = ?');
      parameters.push(fields.dueDate);
    }
    if (fields.isDueComplete !== undefined) {
      assignments.push('is_due_complete = ?');
      parameters.push(fields.isDueComplete ? 1 : 0);
    }
    this.database
      .prepare(`UPDATE cards SET ${assignments.join(', ')} WHERE id = ?`)
      .run(...parameters, cardId);
  }

  replaceCardLabels(cardId: string, labelIds: readonly string[]): void {
    this.database.prepare('DELETE FROM card_labels WHERE card_id = ?').run(cardId);
    const linkLabel = this.database.prepare(
      'INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)',
    );
    for (const labelId of labelIds) linkLabel.run(cardId, labelId);
  }

  /**
   * Puts an active card at `targetIndex` among the active cards of `toListId` (clamped to the
   * list's length) and renumbers the affected lists so positions stay 0, 1, 2, … with no gaps.
   */
  placeActiveCard(cardId: string, toListId: string, targetIndex: number, updatedAt: string): void {
    const card = this.findCardById(cardId);
    if (card === undefined) return;

    const sourceListCardIds = this.activeCardIds(card.listId).filter((id) => id !== cardId);
    const targetListCardIds =
      toListId === card.listId ? sourceListCardIds : this.activeCardIds(toListId);
    const insertAt = Math.min(Math.max(targetIndex, 0), targetListCardIds.length);
    targetListCardIds.splice(insertAt, 0, cardId);

    this.database
      .prepare('UPDATE cards SET list_id = ?, updated_at = ? WHERE id = ?')
      .run(toListId, updatedAt, cardId);
    if (toListId !== card.listId) this.writePositions(sourceListCardIds);
    this.writePositions(targetListCardIds);
  }

  setArchivedAt(cardId: string, archivedAt: string | null, updatedAt: string): void {
    this.database
      .prepare('UPDATE cards SET archived_at = ?, updated_at = ? WHERE id = ?')
      .run(archivedAt, updatedAt, cardId);
  }

  /** Renumbers a list's active cards 0, 1, 2, … keeping their current order. */
  compactPositions(listId: string): void {
    this.writePositions(this.activeCardIds(listId));
  }

  countActiveCards(listId: string): number {
    const row = this.database
      .prepare('SELECT COUNT(*) AS total FROM cards WHERE list_id = ? AND archived_at IS NULL')
      .get(listId);
    return row === undefined ? 0 : readInteger(row, 'total');
  }

  private activeCardIds(listId: string): string[] {
    return this.listActiveCardsForList(listId).map((card) => card.id);
  }

  private writePositions(cardIdsInOrder: readonly string[]): void {
    const setPosition = this.database.prepare('UPDATE cards SET position = ? WHERE id = ?');
    for (const [position, cardId] of cardIdsInOrder.entries()) setPosition.run(position, cardId);
  }
}

function toCardRecord(row: SqlRow): CardRecord {
  return {
    id: readText(row, 'id'),
    listId: readText(row, 'list_id'),
    boardId: readText(row, 'board_id'),
    title: readText(row, 'title'),
    description: readText(row, 'description'),
    dueDate: readNullableText(row, 'due_date'),
    isDueComplete: readBoolean(row, 'is_due_complete'),
    position: readInteger(row, 'position'),
    archivedAt: readNullableText(row, 'archived_at'),
    createdAt: readText(row, 'created_at'),
    updatedAt: readText(row, 'updated_at'),
  };
}
