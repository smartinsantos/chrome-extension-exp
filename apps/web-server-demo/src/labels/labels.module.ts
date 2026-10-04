import { Module } from '@nestjs/common';

import { LabelsRepository } from './labels.repository.js';

@Module({ providers: [LabelsRepository], exports: [LabelsRepository] })
export class LabelsModule {}
