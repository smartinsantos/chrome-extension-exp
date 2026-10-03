import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'chrome-ext-bff',
    environment: 'node',
  },
});
