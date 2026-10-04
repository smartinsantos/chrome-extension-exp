import type { LabelColor } from './label-color.enum.js';

export interface LabelRecord {
  id: string;
  boardId: string;
  name: string;
  color: LabelColor;
}
