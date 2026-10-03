import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import type { Clock } from '../../clock/clock.js';
import { addDaysToIsoDate } from '../../common/iso-date.js';
import { DEMO_BOARDS, type DemoCard } from './demo-boards.js';

/**
 * Fills an empty database with the demo boards. Does nothing if any board exists, so restarting
 * the server never duplicates data or overwrites your changes.
 */
export function seedDemoData(database: DatabaseSync, clock: Clock): void {
  const existingBoard = database.prepare('SELECT 1 FROM boards LIMIT 1').get();
  if (existingBoard !== undefined) return;

  const createdAt = clock.now().toISOString();
  const today = clock.todayIsoDate();
  const insertBoard = database.prepare(
    'INSERT INTO boards (id, name, created_at) VALUES (?, ?, ?)',
  );
  const insertList = database.prepare(
    'INSERT INTO board_lists (id, board_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)',
  );
  const insertLabel = database.prepare(
    'INSERT INTO labels (id, board_id, name, color) VALUES (?, ?, ?, ?)',
  );
  const insertCard = database.prepare(
    `INSERT INTO cards (id, list_id, title, description, due_date, is_due_complete, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const linkCardToLabel = database.prepare(
    'INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)',
  );

  database.exec('BEGIN');
  try {
    for (const board of DEMO_BOARDS) {
      const boardId = randomUUID();
      insertBoard.run(boardId, board.name, createdAt);

      const labelIdByName = new Map<string, string>();
      for (const label of board.labels) {
        const labelId = randomUUID();
        insertLabel.run(labelId, boardId, label.name, label.color);
        labelIdByName.set(label.name, labelId);
      }

      for (const [listPosition, list] of board.lists.entries()) {
        const listId = randomUUID();
        insertList.run(listId, boardId, list.name, listPosition, createdAt);

        for (const [cardPosition, card] of list.cards.entries()) {
          const cardId = randomUUID();
          insertCard.run(
            cardId,
            listId,
            card.title,
            card.description ?? '',
            dueDateFor(card, today),
            card.isDueComplete === true ? 1 : 0,
            cardPosition,
            createdAt,
            createdAt,
          );
          for (const labelName of card.labelNames ?? []) {
            const labelId = labelIdByName.get(labelName);
            if (labelId === undefined) {
              throw new Error(`Demo card "${card.title}" uses unknown label "${labelName}".`);
            }
            linkCardToLabel.run(cardId, labelId);
          }
        }
      }
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function dueDateFor(card: DemoCard, today: string): string | null {
  return card.dueInDays === undefined ? null : addDaysToIsoDate(today, card.dueInDays);
}
