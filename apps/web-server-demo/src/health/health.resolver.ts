import { Query, Resolver } from '@nestjs/graphql';

import { HealthService } from './health.service.js';

@Resolver()
export class HealthResolver {
  constructor(private readonly healthService: HealthService) {}

  @Query(() => String, { description: 'Returns "ok" when the API is up.' })
  health(): string {
    return this.healthService.getStatus();
  }
}
