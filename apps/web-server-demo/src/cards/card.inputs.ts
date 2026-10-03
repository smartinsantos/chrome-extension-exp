import { Field, ID, InputType, Int } from '@nestjs/graphql';

import type { CardPosition } from './card.record.js';
import { CardPositionEnum } from './card-position.enum.js';

@InputType({ description: 'A new card, added at the bottom of its list.' })
export class CreateCardInput {
  @Field(() => ID)
  listId!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true, description: 'YYYY-MM-DD' })
  dueDate?: string | null;

  @Field(() => [String], {
    nullable: true,
    description: 'Existing label names of the board (any letter case).',
  })
  labelNames?: string[] | null;
}

@InputType({
  description: 'Fields to change on a card. Leave a field out to keep its current value.',
})
export class UpdateCardInput {
  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'YYYY-MM-DD, or null to remove the due date.',
  })
  dueDate?: string | null;

  @Field(() => Boolean, { nullable: true })
  isDueComplete?: boolean | null;

  @Field(() => [String], { nullable: true, description: 'Replaces all labels on the card.' })
  labelNames?: string[] | null;
}

@InputType({
  description: 'Where to move a card: a list on the same board, plus a position or an exact index.',
})
export class MoveCardInput {
  @Field(() => ID)
  toListId!: string;

  @Field(() => CardPositionEnum, { nullable: true, description: 'Defaults to BOTTOM.' })
  position?: CardPosition | null;

  @Field(() => Int, { nullable: true, description: '0-based slot; past the end means the bottom.' })
  index?: number | null;
}

@InputType({ description: 'Narrows a card search. All given conditions must match.' })
export class CardSearchFilter {
  @Field(() => String, {
    nullable: true,
    description: 'Text found in the title or description (any case).',
  })
  text?: string | null;

  @Field(() => [String], {
    nullable: true,
    description: 'Cards with at least one of these labels.',
  })
  labelNames?: string[] | null;

  @Field(() => ID, { nullable: true })
  listId?: string | null;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Only cards past their due date and not completed.',
  })
  isOverdue?: boolean | null;

  @Field(() => Boolean, { nullable: true, description: 'Include archived cards (default false).' })
  includeArchived?: boolean | null;
}
