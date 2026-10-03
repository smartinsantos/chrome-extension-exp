import { Module } from '@nestjs/common';

import { BoardsModule } from '../boards/boards.module.js';
import { LabelsModule } from '../labels/labels.module.js';
import { BoardListCardsResolver, CardsResolver } from './cards.resolver.js';
import { CardsRepository } from './cards.repository.js';
import { CardsService } from './cards.service.js';

@Module({
  imports: [BoardsModule, LabelsModule],
  providers: [CardsRepository, CardsService, CardsResolver, BoardListCardsResolver],
})
export class CardsModule {}
