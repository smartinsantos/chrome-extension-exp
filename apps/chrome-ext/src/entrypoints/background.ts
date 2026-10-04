import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

import { injectContentScriptsIntoOpenTabs } from '../background/inject-into-open-tabs';
import { createToolCountBadge } from '../background/tool-count-badge';
import { parseExtensionMessage } from '../messaging/extension-messages';

export default defineBackground(() => {
  // Clicking the toolbar icon opens the side panel instead of a popup.
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
    console.error('Could not make the toolbar icon open the side panel.', error);
  });

  browser.runtime.onInstalled.addListener(() => {
    void injectContentScriptsIntoOpenTabs();
  });

  const toolCountBadge = createToolCountBadge(browser.action);
  browser.runtime.onMessage.addListener((rawMessage: unknown, sender) => {
    const message = parseExtensionMessage(rawMessage);
    const tabId = sender.tab?.id;
    if (message?.type === 'webmcp/tools-changed' && tabId !== undefined) {
      void toolCountBadge.showToolCount(tabId, message.toolCount);
    }
    return undefined;
  });

  // A new page in the tab starts with no tools until its content script reports them.
  browser.webNavigation.onCommitted.addListener(({ tabId, frameId }) => {
    if (frameId === 0) void toolCountBadge.clear(tabId);
  });
});
