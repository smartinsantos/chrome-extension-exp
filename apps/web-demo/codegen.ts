import type { CodegenConfig } from '@graphql-codegen/cli';

// Types and typed documents come from the server's committed schema, so no server needs to run.
const config: CodegenConfig = {
  schema: '../web-server-demo/schema.gql',
  documents: ['src/**/*.{ts,tsx}', '!src/gql/**'],
  ignoreNoDocuments: true,
  generates: {
    './src/gql/': {
      preset: 'client',
      config: {
        documentMode: 'string',
        enumsAsTypes: true,
        useTypeImports: true,
      },
    },
  },
};

export default config;
