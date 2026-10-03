import { browser } from 'wxt/browser';

/** Built from `entrypoints/webmcp.content.ts`; WXT's types reject this path if the entry moves. */
const WEBMCP_CONTENT_SCRIPT_FILE = '/content-scripts/webmcp.js';

/**
 * Chrome only adds content scripts to pages loaded after the extension is installed or
 * updated. This adds them to tabs that were already open, so tools show up without a reload.
 */
export async function injectContentScriptsIntoOpenTabs(): Promise<void> {
  const openTabs = await browser.tabs.query({});
  await Promise.allSettled(
    openTabs.flatMap((tab) =>
      tab.id === undefined
        ? []
        : // Fails on pages extensions can't touch (chrome://, the Web Store); those are skipped.
          [
            browser.scripting.executeScript({
              target: { tabId: tab.id },
              files: [WEBMCP_CONTENT_SCRIPT_FILE],
            }),
          ],
    ),
  );
}
