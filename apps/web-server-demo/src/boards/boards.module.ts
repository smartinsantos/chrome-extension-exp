import { Module } from '@nestjs/common';

import { LabelsModule } from '../labels/labels.module.js';
import { BoardListsResolver } from './board-lists.resolver.js';
import { BoardsRepository } from './boards.repository.js';
import { BoardsResolver } from './boards.resolver.js';
import { BoardsService } from './boards.service.js';

@Module({
  imports: [LabelsModule],
  providers: [BoardsRepository, BoardsService, BoardsResolver, BoardListsResolver],
  exports: [BoardsRepository, BoardsService],
})
export class BoardsModule {}
