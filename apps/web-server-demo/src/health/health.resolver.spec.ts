import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { HealthResolver } from './health.resolver.js';
import { HealthService } from './health.service.js';

// Also a smoke test for the toolchain: HealthResolver receives HealthService through
// constructor type metadata alone, which only works if the test compiler emits it.
describe('HealthResolver', () => {
  it('gets its service injected and reports that the API is up', async () => {
    const testingModule = await Test.createTestingModule({
      providers: [HealthResolver, HealthService],
    }).compile();

    const healthResolver = testingModule.get(HealthResolver);

    expect(healthResolver.health()).toBe('ok');
  });
});
