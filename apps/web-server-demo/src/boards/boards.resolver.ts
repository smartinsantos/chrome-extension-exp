import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

import { Label } from '../labels/label.model.js';
import type { LabelRecord } from '../labels/label.record.js';
import { LabelsRepository } from '../labels/labels.repository.js';
import { BoardList } from './board-list.model.js';
import { CreateBoardInput } from './board.inputs.js';
import { Board } from './board.model.js';
import type { BoardListRecord, BoardRecord } from './board.records.js';
import { BoardsService } from './boards.service.js';

@Resolver(() => Board)
export class BoardsResolver {
  constructor(
    private readonly boardsService: BoardsService,
    private readonly labelsRepository: LabelsRepository,
  ) {}

  @Query(() => [Board], { description: 'Every board, oldest first.' })
  boards(): BoardRecord[] {
    return this.boardsService.listBoards();
  }

  @Query(() => Board, { nullable: true, description: 'One board, or null if the id is unknown.' })
  board(@Args('id', { type: () => ID }) boardId: string): BoardRecord | undefined {
    return this.boardsService.findBoardById(boardId);
  }

  @Mutation(() => Board)
  createBoard(@Args('input') input: CreateBoardInput): BoardRecord {
    return this.boardsService.createBoard(input);
  }

  @ResolveField(() => [BoardList], { description: "The board's lists, left to right." })
  lists(@Parent() board: BoardRecord): BoardListRecord[] {
    return this.boardsService.listListsForBoard(board.id);
  }

  @ResolveField(() => [Label], { description: 'Labels available on this board, A to Z.' })
  labels(@Parent() board: BoardRecord): LabelRecord[] {
    return this.labelsRepository.listLabelsForBoard(board.id);
  }

  @ResolveField(() => Int)
  listCount(@Parent() board: BoardRecord): number {
    return this.boardsService.countLists(board.id);
  }

  @ResolveField(() => Int, { description: 'Active (not archived) cards on the board.' })
  cardCount(@Parent() board: BoardRecord): number {
    return this.boardsService.countActiveCards(board.id);
  }
}
