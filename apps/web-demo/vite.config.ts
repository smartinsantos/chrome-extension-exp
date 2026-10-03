import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const GRAPHQL_SERVER_URL = 'http://localhost:4000';

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // The browser calls same-origin /graphql; Vite forwards it to the NestJS server.
    proxy: { '/graphql': GRAPHQL_SERVER_URL },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: { '/graphql': GRAPHQL_SERVER_URL },
  },
});
