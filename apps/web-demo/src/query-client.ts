import { QueryClient } from '@tanstack/react-query';

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        // GraphQL errors such as NOT_FOUND won't fix themselves; only retry transport failures.
        retry: (failureCount, error) => error.name !== 'GraphqlRequestError' && failureCount < 2,
      },
    },
  });
}
