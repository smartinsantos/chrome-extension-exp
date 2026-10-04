import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isOriginTrusted, setOriginTrust } from '../../settings/extension-settings';

const originTrustQueryKey = (origin: string) => ['origin-trust', origin] as const;

export function useOriginTrust(origin: string) {
  const queryClient = useQueryClient();
  const trustQuery = useQuery({
    queryKey: originTrustQueryKey(origin),
    queryFn: () => isOriginTrusted(origin),
  });
  const trustMutation = useMutation({
    mutationFn: (isTrusted: boolean) => setOriginTrust(origin, isTrusted),
    onSettled: () => queryClient.invalidateQueries({ queryKey: originTrustQueryKey(origin) }),
  });
  return {
    isTrusted: trustQuery.data ?? false,
    setTrusted: (isTrusted: boolean) => trustMutation.mutate(isTrusted),
  };
}
