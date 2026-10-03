import type { RejectedTool, WebMcpToolDescriptor } from '@repo/agent-protocol';
import { browser } from 'wxt/browser';

import {
  type CancelToolExecutionRequest,
  type ExecuteToolRequest,
  type ListToolsRequest,
  type ToolExecutionResponse,
  toolExecutionResponseSchema,
  toolListResponseSchema,
} from '../../messaging/extension-messages';

interface ActiveTabPage {
  tabId: number;
  url: string;
  title: string;
  origin: string;
}

/** Everything the side panel can find out about the tools of the tab you're looking at. */
export type ActiveTabTools =
  | { kind: 'no-tab' }
  /** chrome://, the Web Store and similar pages, where extensions are not allowed to run. */
  | ({ kind: 'restricted-page' } & ActiveTabPage)
  /** The page was open before the extension loaded; reloading it adds the content script. */
  | ({ kind: 'content-script-missing' } & ActiveTabPage)
  /** The browser has no WebMCP (flag off or Chrome too old). */
  | ({ kind: 'webmcp-unavailable' } & ActiveTabPage)
  | ({
      kind: 'ready';
      tools: WebMcpToolDescriptor[];
      rejectedTools: RejectedTool[];
    } & ActiveTabPage);

const RESTRICTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'chrome-untrusted://',
  'devtools://',
  'edge://',
  'about:',
  'view-source:',
  'https://chromewebstore.google.com/',
  'https://chrome.google.com/webstore',
];

export async function loadActiveTabTools(): Promise<ActiveTabTools> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id === undefined || activeTab.url === undefined) return { kind: 'no-tab' };

  const page: ActiveTabPage = {
    tabId: activeTab.id,
    url: activeTab.url,
    title: activeTab.title ?? '',
    origin: URL.canParse(activeTab.url) ? new URL(activeTab.url).origin : activeTab.url,
  };
  if (RESTRICTED_URL_PREFIXES.some((prefix) => page.url.startsWith(prefix))) {
    return { kind: 'restricted-page', ...page };
  }

  const request: ListToolsRequest = { type: 'webmcp/list-tools' };
  const rawResponse: unknown = await browser.tabs
    .sendMessage(page.tabId, request)
    .catch(() => undefined);
  const response = toolListResponseSchema.safeParse(rawResponse);
  if (!response.success) return { kind: 'content-script-missing', ...page };
  if (response.data.status === 'unsupported') return { kind: 'webmcp-unavailable', ...page };
  return {
    kind: 'ready',
    ...page,
    origin: response.data.origin,
    tools: response.data.tools,
    rejectedTools: response.data.rejectedTools,
  };
}

export async function runToolInTab(
  tabId: number,
  toolName: string,
  toolArguments: Record<string, unknown>,
  executionId: string,
): Promise<ToolExecutionResponse> {
  const request: ExecuteToolRequest = {
    type: 'webmcp/execute-tool',
    executionId,
    toolName,
    toolArguments,
  };
  try {
    const rawResponse: unknown = await browser.tabs.sendMessage(tabId, request);
    const response = toolExecutionResponseSchema.safeParse(rawResponse);
    return response.success
      ? response.data
      : { status: 'error', code: 'TOOL_FAILED', message: 'The page sent an unexpected answer.' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { status: 'error', code: 'TOOL_FAILED', message: `Could not reach the page: ${reason}` };
  }
}

export async function cancelToolInTab(tabId: number, executionId: string): Promise<void> {
  const request: CancelToolExecutionRequest = { type: 'webmcp/cancel-tool-execution', executionId };
  await browser.tabs.sendMessage(tabId, request).catch(() => undefined);
}
