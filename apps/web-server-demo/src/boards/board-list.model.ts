import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A column of cards on a board, such as "To Do" or "Done".' })
export class BoardList {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  boardId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Int, { description: 'Left-to-right order on the board, starting at 0.' })
  position!: number;
}
