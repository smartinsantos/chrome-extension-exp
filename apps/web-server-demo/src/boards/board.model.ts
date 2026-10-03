import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A board groups lists of cards, like a Trello board.' })
export class Board {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { description: 'When the board was created (ISO 8601 timestamp).' })
  createdAt!: string;
}
