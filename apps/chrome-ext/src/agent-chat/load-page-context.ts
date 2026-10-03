import type { PageContext } from '@repo/agent-protocol';

import { isOriginTrusted } from '../settings/extension-settings';
import { loadToolsForTabId } from '../sidepanel/active-tab/active-tab-api';
import type { ChatBinding } from './run-agent-tool-call';

/**
 * What the agent needs to know about the page, read fresh before every request, because the
 * page's tools can change between turns (for example after opening a board).
 */
export async function loadPageContext(binding: ChatBinding): Promise<PageContext> {
  const boundTab = await loadToolsForTabId(binding.tabId);
  if (boundTab.kind !== 'ready') {
    throw new Error(
      "The page this chat is about can't be reached. Start a new chat on a WebMCP page.",
    );
  }
  if (boundTab.origin !== binding.origin) {
    throw new Error(`The tab now shows ${boundTab.origin}. Start a new chat to work with it.`);
  }
  return {
    tabId: boundTab.tabId,
    url: boundTab.url,
    origin: boundTab.origin,
    title: boundTab.title,
    isTrustedOrigin: await isOriginTrusted(boundTab.origin),
    tools: boundTab.tools,
  };
}
