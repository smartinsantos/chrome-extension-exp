import { defineConfig } from 'tsdown';

// Bundles the server and the workspace packages it uses (shipped as TypeScript source) into
// one runnable file; npm dependencies stay external and load from node_modules.
export default defineConfig({
  entry: ['src/main.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node24',
  noExternal: [/^@repo\//],
});
