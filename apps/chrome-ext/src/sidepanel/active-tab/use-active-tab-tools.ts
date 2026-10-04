import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { browser } from 'wxt/browser';

import { parseExtensionMessage } from '../../messaging/extension-messages';
import { loadActiveTabTools } from './active-tab-api';

export const activeTabToolsQueryKey = ['active-tab-tools'] as const;

/**
 * The tools of the tab you're looking at, kept fresh: reloaded when you switch tabs, when a tab
 * finishes loading or changes URL, and when a page reports that its tools changed.
 */
export function useActiveTabTools() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: activeTabToolsQueryKey });
    };
    const handleTabUpdated = (_tabId: number, changeInfo: { status?: string; url?: string }) => {
      if (changeInfo.status === 'complete' || changeInfo.url !== undefined) refresh();
    };
    const handleMessage = (rawMessage: unknown) => {
      if (parseExtensionMessage(rawMessage)?.type === 'webmcp/tools-changed') refresh();
      return undefined;
    };

    browser.tabs.onActivated.addListener(refresh);
    browser.tabs.onUpdated.addListener(handleTabUpdated);
    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.tabs.onActivated.removeListener(refresh);
      browser.tabs.onUpdated.removeListener(handleTabUpdated);
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [queryClient]);

  return useQuery({ queryKey: activeTabToolsQueryKey, queryFn: loadActiveTabTools });
}
