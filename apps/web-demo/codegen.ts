import type { CodegenConfig } from '@graphql-codegen/cli';

// Types and typed documents come from the server's committed schema, so no server needs to run.
const config: CodegenConfig = {
  schema: '../web-server-demo/schema.gql',
  documents: ['src/**/*.{ts,tsx}', '!src/gql/**'],
  ignoreNoDocuments: true,
  generates: {
    './src/gql/': {
      preset: 'client',
      // Fragments only share field selections here; masking would add useFragment ceremony.
      presetConfig: { fragmentMasking: false },
      config: {
        documentMode: 'string',
        // The server's IDs are always strings (UUIDs), never numbers.
        scalars: { ID: { input: 'string', output: 'string' } },
        enumsAsTypes: true,
        useTypeImports: true,
      },
    },
  },
};

export default config;
