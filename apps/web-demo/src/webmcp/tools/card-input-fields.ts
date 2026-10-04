import { z } from 'zod';

/** Field schemas shared by the card tools, so every tool describes them the same way. */
export const cardIdField = z.string().min(1).describe('Card id, as returned by get_board');
export const dueDateField = z.iso.date().describe('Due date as YYYY-MM-DD');
export const labelNamesField = z
  .array(z.string().min(1))
  .max(5)
  .describe("Label names that exist on the board (see get_board's labels)");
