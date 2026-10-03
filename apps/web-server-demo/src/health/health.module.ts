import { Module } from '@nestjs/common';

import { HealthResolver } from './health.resolver.js';
import { HealthService } from './health.service.js';

@Module({ providers: [HealthResolver, HealthService] })
export class HealthModule {}
