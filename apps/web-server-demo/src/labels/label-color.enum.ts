import { registerEnumType } from '@nestjs/graphql';

/** Label colors; stored in SQLite and exposed in GraphQL exactly as named here. */
export const LabelColor = {
  GRAY: 'GRAY',
  RED: 'RED',
  ORANGE: 'ORANGE',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
  BLUE: 'BLUE',
  PURPLE: 'PURPLE',
  PINK: 'PINK',
} as const;
export type LabelColor = (typeof LabelColor)[keyof typeof LabelColor];

registerEnumType(LabelColor, { name: 'LabelColor', description: 'Color of a board label.' });
