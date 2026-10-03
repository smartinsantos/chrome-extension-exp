import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'web-server-demo',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
