import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

import { BoardList } from '../boards/board-list.model.js';
import type { BoardListRecord } from '../boards/board.records.js';
import { BoardsRepository } from '../boards/boards.repository.js';
import { notFoundError } from '../common/graphql-errors.js';
import { Label } from '../labels/label.model.js';
import type { LabelRecord } from '../labels/label.record.js';
import {
  CardSearchFilter,
  CreateCardInput,
  MoveCardInput,
  UpdateCardInput,
} from './card.inputs.js';
import { Card } from './card.model.js';
import type { CardRecord } from './card.record.js';
import { CardsService } from './cards.service.js';

@Resolver(() => Card)
export class CardsResolver {
  constructor(
    private readonly cardsService: CardsService,
    private readonly boardsRepository: BoardsRepository,
  ) {}

  @Query(() => Card, { nullable: true, description: 'One card, or null if the id is unknown.' })
  card(@Args('id', { type: () => ID }) cardId: string): CardRecord | undefined {
    return this.cardsService.findCard(cardId);
  }

  @Query(() => [Card], {
    description: 'Cards on a board, in board order (list by list, top to bottom).',
  })
  searchCards(
    @Args('boardId', { type: () => ID }) boardId: string,
    @Args('filter', { type: () => CardSearchFilter, nullable: true }) filter?: CardSearchFilter,
  ): CardRecord[] {
    return this.cardsService.searchCards(boardId, filter ?? {});
  }

  @Mutation(() => Card)
  createCard(@Args('input') input: CreateCardInput): CardRecord {
    return this.cardsService.createCard(input);
  }

  @Mutation(() => Card)
  updateCard(
    @Args('id', { type: () => ID }) cardId: string,
    @Args('input') input: UpdateCardInput,
  ): CardRecord {
    return this.cardsService.updateCard(cardId, input);
  }

  @Mutation(() => Card)
  moveCard(
    @Args('id', { type: () => ID }) cardId: string,
    @Args('input') input: MoveCardInput,
  ): CardRecord {
    return this.cardsService.moveCard(cardId, input);
  }

  @Mutation(() => Card, { description: 'Hides a card from its list. Use restoreCard to undo.' })
  archiveCard(@Args('id', { type: () => ID }) cardId: string): CardRecord {
    return this.cardsService.archiveCard(cardId);
  }

  @Mutation(() => Card, { description: 'Brings an archived card back, at the bottom of its list.' })
  restoreCard(@Args('id', { type: () => ID }) cardId: string): CardRecord {
    return this.cardsService.restoreCard(cardId);
  }

  @ResolveField(() => Boolean, {
    description: 'Past its due date, not completed and not archived.',
  })
  isOverdue(@Parent() card: CardRecord): boolean {
    return this.cardsService.isOverdue(card);
  }

  @ResolveField(() => [Label])
  labels(@Parent() card: CardRecord): LabelRecord[] {
    return this.cardsService.listLabelsForCard(card.id);
  }

  @ResolveField(() => BoardList, { description: 'The list the card is in.' })
  list(@Parent() card: CardRecord): BoardListRecord {
    const list = this.boardsRepository.findListById(card.listId);
    if (list === undefined) throw notFoundError('List', card.listId);
    return list;
  }
}

/** Adds `cards` to the BoardList type; lives here so the boards module doesn't depend on cards. */
@Resolver(() => BoardList)
export class BoardListCardsResolver {
  constructor(private readonly cardsService: CardsService) {}

  @ResolveField(() => [Card], { description: 'Active cards in this list, top to bottom.' })
  cards(@Parent() list: BoardListRecord): CardRecord[] {
    return this.cardsService.listActiveCardsForList(list.id);
  }
}
