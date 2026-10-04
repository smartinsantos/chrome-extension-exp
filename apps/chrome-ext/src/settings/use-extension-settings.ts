import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  readExtensionSettings,
  setOriginTrust,
  updateExtensionSettings,
  watchExtensionSettings,
} from './extension-settings';

const extensionSettingsQueryKey = ['extension-settings'] as const;

/** Extension settings for React, refreshed whenever any part of the extension changes them. */
export function useExtensionSettings() {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      watchExtensionSettings(() => {
        void queryClient.invalidateQueries({ queryKey: extensionSettingsQueryKey });
        void queryClient.invalidateQueries({ queryKey: ['origin-trust'] });
      }),
    [queryClient],
  );

  const settingsQuery = useQuery({
    queryKey: extensionSettingsQueryKey,
    queryFn: readExtensionSettings,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: extensionSettingsQueryKey });
  const updateSettingsMutation = useMutation({
    mutationFn: updateExtensionSettings,
    onSettled: refresh,
  });
  const setOriginTrustMutation = useMutation({
    mutationFn: ({ origin, isTrusted }: { origin: string; isTrusted: boolean }) =>
      setOriginTrust(origin, isTrusted),
    onSettled: refresh,
  });

  return {
    settings: settingsQuery.data,
    updateSettings: updateSettingsMutation.mutate,
    setOriginTrust: setOriginTrustMutation.mutate,
  };
}
