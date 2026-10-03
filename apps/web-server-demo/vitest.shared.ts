import { createRequire } from 'node:module';

import type { ViteUserConfig } from 'vitest/config';

const require = createRequire(import.meta.url);

/**
 * `graphql` ships two builds: ESM ("module" field) and CommonJS ("main"). In tests, Vite would
 * load the ESM build for our code while NestJS loads the CommonJS one through Node, giving two
 * copies of graphql ("Cannot use GraphQLObjectType from another module or realm"). Pointing the
 * bare `graphql` import at the file Node resolves keeps one copy, exactly like production.
 */
export const singleGraphqlCopyResolution: ViteUserConfig['resolve'] = {
  alias: [{ find: /^graphql$/, replacement: require.resolve('graphql') }],
};
