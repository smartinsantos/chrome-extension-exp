import { defineProject } from 'vitest/config';

import { singleGraphqlCopyResolution } from './vitest.shared.js';

export default defineProject({
  resolve: singleGraphqlCopyResolution,
  test: {
    name: 'web-server-demo-e2e',
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
  },
});
