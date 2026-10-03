import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'web-server-demo-e2e',
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
  },
});
