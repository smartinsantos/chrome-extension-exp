import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { BoardList } from './board-list.model.js';
import { CreateListInput } from './board.inputs.js';
import type { BoardListRecord } from './board.records.js';
import { BoardsService } from './boards.service.js';

@Resolver(() => BoardList)
export class BoardListsResolver {
  constructor(private readonly boardsService: BoardsService) {}

  @Mutation(() => BoardList)
  createList(@Args('input') input: CreateListInput): BoardListRecord {
    return this.boardsService.createList(input);
  }
}
