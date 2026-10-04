import { Field, ID, InputType } from '@nestjs/graphql';

@InputType({ description: 'A new board. It starts with the lists To Do, Doing and Done.' })
export class CreateBoardInput {
  @Field(() => String)
  name!: string;
}

@InputType({ description: 'A new list, added after the existing lists of the board.' })
export class CreateListInput {
  @Field(() => ID)
  boardId!: string;

  @Field(() => String)
  name!: string;
}
