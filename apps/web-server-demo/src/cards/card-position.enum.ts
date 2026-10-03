import { registerEnumType } from '@nestjs/graphql';

export const CardPositionEnum = { TOP: 'TOP', BOTTOM: 'BOTTOM' } as const;

registerEnumType(CardPositionEnum, {
  name: 'CardPosition',
  description: 'Where to put a card in a list.',
});
