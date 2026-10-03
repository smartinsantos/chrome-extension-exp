import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A task card that lives in one list of a board.' })
export class Card {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  listId!: string;

  @Field(() => ID)
  boardId!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true, description: 'Due date as YYYY-MM-DD, or null.' })
  dueDate!: string | null;

  @Field(() => Boolean, {
    description: 'True once the work is done; a completed card is never overdue.',
  })
  isDueComplete!: boolean;

  @Field(() => Int, { description: 'Top-to-bottom order in its list, starting at 0.' })
  position!: number;

  @Field(() => String, {
    nullable: true,
    description: 'When the card was archived, or null if active.',
  })
  archivedAt!: string | null;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}
