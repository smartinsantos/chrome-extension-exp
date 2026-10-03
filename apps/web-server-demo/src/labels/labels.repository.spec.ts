import { beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';

import {
  createTestDatabase,
  insertTestBoard,
  insertTestLabel,
} from '../test-support/test-database.js';
import { LabelsRepository } from './labels.repository.js';

describe('LabelsRepository', () => {
  let database: DatabaseSync;
  let labelsRepository: LabelsRepository;
  let boardId: string;

  beforeEach(() => {
    database = createTestDatabase();
    labelsRepository = new LabelsRepository(database);
    boardId = insertTestBoard(database);
    insertTestLabel(database, boardId, 'urgent', 'ORANGE');
    insertTestLabel(database, boardId, 'bug', 'RED');
  });

  it("lists a board's labels alphabetically", () => {
    expect(labelsRepository.listLabelsForBoard(boardId).map((label) => label.name)).toEqual([
      'bug',
      'urgent',
    ]);
  });

  it('matches label names in any letter case and reports the ones it cannot find', () => {
    const { foundLabels, missingNames } = labelsRepository.findLabelsByNames(boardId, [
      'URGENT',
      'Bug',
      'someday',
    ]);

    expect(foundLabels.map((label) => label.name).toSorted()).toEqual(['bug', 'urgent']);
    expect(missingNames).toEqual(['someday']);
  });

  it("only looks at the given board's labels", () => {
    const otherBoardId = insertTestBoard(database, 'Other');

    const { foundLabels, missingNames } = labelsRepository.findLabelsByNames(otherBoardId, ['bug']);

    expect(foundLabels).toEqual([]);
    expect(missingNames).toEqual(['bug']);
  });
});
