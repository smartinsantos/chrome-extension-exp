import './styles/app.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createAppQueryClient } from './query-client';
import { createAppRouter } from './router';

const queryClient = createAppQueryClient();
const router = createAppRouter(queryClient);

const rootElement = document.getElementById('root');
if (rootElement === null) throw new Error('index.html must contain <div id="root">.');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
