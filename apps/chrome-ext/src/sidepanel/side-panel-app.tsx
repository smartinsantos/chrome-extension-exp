import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';

import { createSidePanelRouter } from './router';

export function SidePanelApp() {
  const [queryClient] = useState(() => new QueryClient());
  const [router] = useState(() => createSidePanelRouter(queryClient));
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
