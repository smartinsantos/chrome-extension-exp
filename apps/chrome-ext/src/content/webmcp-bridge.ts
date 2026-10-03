import { browser } from 'wxt/browser';

import {
  type ToolListResponse,
  type ToolsChangedEvent,
  parseExtensionMessage,
} from '../messaging/extension-messages';
import { createWebMcpHost } from '../webmcp-host/webmcp-host';

interface WebMcpBridgeOptions {
  /** The page's `document.modelContext`, or undefined when the page has no WebMCP. */
  modelContext: WebMCP.ModelContext | undefined;
  origin: string;
  ownWindow: Window;
}

const UNSUPPORTED_PAGE: ToolListResponse = { status: 'unsupported', reason: 'webmcp-unavailable' };

/**
 * Connects the page's WebMCP tools to the rest of the extension: answers list / execute /
 * cancel requests from the side panel and announces tool changes. Returns a stop function.
 */
export function startWebMcpBridge({
  modelContext,
  origin,
  ownWindow,
}: WebMcpBridgeOptions): () => void {
  const host =
    modelContext === undefined ? undefined : createWebMcpHost({ modelContext, origin, ownWindow });
  const runningExecutions = new Map<string, AbortController>();

  const answerMessage = (rawMessage: unknown): Promise<unknown> | undefined => {
    const message = parseExtensionMessage(rawMessage);
    switch (message?.type) {
      case 'webmcp/list-tools':
        return host === undefined ? Promise.resolve(UNSUPPORTED_PAGE) : host.listTools();
      case 'webmcp/execute-tool': {
        if (host === undefined) {
          return Promise.resolve({
            status: 'error',
            code: 'WEBMCP_UNAVAILABLE',
            message: 'This page does not support WebMCP.',
          });
        }
        const execution = new AbortController();
        runningExecutions.set(message.executionId, execution);
        return host
          .executeTool(message.toolName, message.toolArguments, execution.signal)
          .finally(() => runningExecutions.delete(message.executionId));
      }
      case 'webmcp/cancel-tool-execution':
        runningExecutions.get(message.executionId)?.abort();
        return Promise.resolve({ cancelled: runningExecutions.has(message.executionId) });
      default:
        // Not a request for us: return nothing so other listeners can answer.
        return undefined;
    }
  };
  // Chrome's messaging contract: call sendResponse later and return true to keep the channel
  // open; return undefined for messages we don't handle, so other listeners can answer them.
  const handleMessage = (
    rawMessage: unknown,
    _sender: unknown,
    sendResponse: (response: unknown) => void,
  ): true | undefined => {
    const pendingAnswer = answerMessage(rawMessage);
    if (pendingAnswer === undefined) return undefined;
    void pendingAnswer.then(sendResponse);
    return true;
  };
  browser.runtime.onMessage.addListener(handleMessage);

  const stopWatchingToolChanges = host?.onToolsChanged(() => {
    void announceToolCount(host, origin);
  });

  return () => {
    browser.runtime.onMessage.removeListener(handleMessage);
    stopWatchingToolChanges?.();
    for (const execution of runningExecutions.values()) execution.abort();
  };
}

async function announceToolCount(
  host: ReturnType<typeof createWebMcpHost>,
  origin: string,
): Promise<void> {
  const toolList = await host.listTools();
  const event: ToolsChangedEvent = {
    type: 'webmcp/tools-changed',
    origin,
    toolCount: toolList.status === 'ok' ? toolList.tools.length : 0,
  };
  // Nobody may be listening (side panel closed); that's fine.
  await browser.runtime.sendMessage(event).catch(() => undefined);
}
