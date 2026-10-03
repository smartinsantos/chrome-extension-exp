import { defineProject } from 'vitest/config';

import { singleGraphqlCopyResolution } from './vitest.shared.js';

export default defineProject({
  resolve: singleGraphqlCopyResolution,
  test: {
    name: 'web-server-demo',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
