import { defineProject } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineProject({
  plugins: [WxtVitest()],
  test: {
    name: 'chrome-ext',
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
