import { Field, ID, ObjectType } from '@nestjs/graphql';

import { LabelColor } from './label-color.enum.js';

@ObjectType({ description: 'A colored tag that can be put on cards of one board.' })
export class Label {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => LabelColor)
  color!: LabelColor;
}
