import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

/**
 * Public half of the extension's signing key. It pins the extension id to
 * dmnphemkaphmemfkmonbngjofhmbenck on every machine, so the BFF can allow exactly this
 * extension's origin. See README.md for how it was generated.
 */
const EXTENSION_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA901ktSJ73WbzdYDmcXFC+E17ZFSjz7R7w7lO7y93nngiptyr4O27sv5ygKib5jD7dzdd/d4cdNtbfFk/pCZKED8Ffq4PZdzq5evqptkheZdCnSnpuMQ1YUZ14oKf5zf8L6XrbfBixKdVDs9l7ip9yaChKDw55xR/JUMnlbw0Uf9ZxCjUYKaGciSJSX+asCtapDUuk6LZ4D63HP8CN6YRZ/3x44rEBlF8DxRbpBPMos2w8ASOl5PfD2a6xUQmjBSOf8vXlA9QLFFeHfN7LYhq6HgMfODHskFSwyorXPZA9Q77rP5SiRvuEDbCxG8zCOKKSi86pW8giWgIN5vx5RYU1wIDAQAB';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  // The extension is loaded into your own (WebMCP-flagged) Chrome, not a throwaway profile.
  webExt: { disabled: true },
  manifest: {
    name: 'WebMCP Lab',
    description: 'Discover and run WebMCP tools on any website, by hand or with an AI agent.',
    key: EXTENSION_PUBLIC_KEY,
    permissions: ['sidePanel', 'storage', 'scripting', 'webNavigation'],
    host_permissions: ['<all_urls>'],
    action: { default_title: 'Open WebMCP Lab' },
  },
});
