import type { DatabaseSync } from 'node:sqlite';

import { Inject, Injectable } from '@nestjs/common';

import { type SqlRow, readText } from '../common/sql-row.js';
import { DATABASE } from '../database/database.tokens.js';
import { LabelColor } from './label-color.enum.js';
import type { LabelRecord } from './label.record.js';

export interface LabelLookupResult {
  foundLabels: LabelRecord[];
  /** Requested names that match no label on the board, in the order they were requested. */
  missingNames: string[];
}

@Injectable()
export class LabelsRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseSync) {}

  listLabelsForBoard(boardId: string): LabelRecord[] {
    return this.database
      .prepare('SELECT * FROM labels WHERE board_id = ? ORDER BY name COLLATE NOCASE')
      .all(boardId)
      .map(toLabelRecord);
  }

  listLabelsForCard(cardId: string): LabelRecord[] {
    return this.database
      .prepare(
        `SELECT labels.* FROM labels
         JOIN card_labels ON card_labels.label_id = labels.id
         WHERE card_labels.card_id = ? ORDER BY labels.name COLLATE NOCASE`,
      )
      .all(cardId)
      .map(toLabelRecord);
  }

  findLabelsByNames(boardId: string, labelNames: readonly string[]): LabelLookupResult {
    const boardLabelsByLowerCaseName = new Map(
      this.listLabelsForBoard(boardId).map((label) => [label.name.toLowerCase(), label]),
    );
    const foundLabels: LabelRecord[] = [];
    const missingNames: string[] = [];
    for (const labelName of labelNames) {
      const label = boardLabelsByLowerCaseName.get(labelName.trim().toLowerCase());
      if (label === undefined) missingNames.push(labelName);
      else if (!foundLabels.includes(label)) foundLabels.push(label);
    }
    return { foundLabels, missingNames };
  }
}

const LABEL_COLOR_VALUES: ReadonlySet<string> = new Set(Object.values(LabelColor));

function toLabelRecord(row: SqlRow): LabelRecord {
  const color = readText(row, 'color');
  return {
    id: readText(row, 'id'),
    boardId: readText(row, 'board_id'),
    name: readText(row, 'name'),
    color: isLabelColor(color) ? color : LabelColor.GRAY,
  };
}

function isLabelColor(value: string): value is LabelColor {
  return LABEL_COLOR_VALUES.has(value);
}
