import { defineConfig } from 'vitest/config';

// Each app and package owns its Vitest config; the root only lists them so `pnpm test`
// runs everything at once and `pnpm test --project <name>` runs a single one.
export default defineConfig({
  test: {
    projects: [
      'apps/*/vitest.config.ts',
      'apps/*/vitest.config.e2e.ts',
      'packages/*/vitest.config.ts',
    ],
    passWithNoTests: true,
  },
});
