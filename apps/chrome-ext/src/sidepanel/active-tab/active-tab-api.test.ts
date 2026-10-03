import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { loadActiveTabTools, runToolInTab } from './active-tab-api';

async function openActiveTab(url: string) {
  const focusedWindow = await fakeBrowser.windows.create({ focused: true });
  return fakeBrowser.tabs.create({ url, active: true, windowId: focusedWindow?.id });
}

/** Makes the page answer the next message with `response` (or fail with `error`). */
function pageAnswers(response: unknown) {
  // Chrome's overloads make spyOn pick the callback form (returns void); the answer is untyped JSON.
  return vi.spyOn(fakeBrowser.tabs, 'sendMessage').mockResolvedValue(response as never);
}

function pageIsUnreachable(error: Error) {
  return vi.spyOn(fakeBrowser.tabs, 'sendMessage').mockRejectedValue(error);
}

describe('loadActiveTabTools', () => {
  it('returns the tools the page offers', async () => {
    const tab = await openActiveTab('http://localhost:5173/boards/b1');
    pageAnswers({
      status: 'ok',
      origin: 'http://localhost:5173',
      tools: [],
      rejectedTools: [],
    });

    expect(await loadActiveTabTools()).toEqual({
      kind: 'ready',
      tabId: tab.id,
      url: 'http://localhost:5173/boards/b1',
      title: '',
      origin: 'http://localhost:5173',
      tools: [],
      rejectedTools: [],
    });
  });

  it('explains when the page has no WebMCP', async () => {
    await openActiveTab('https://example.com');
    pageAnswers({
      status: 'unsupported',
      reason: 'webmcp-unavailable',
    });

    expect(await loadActiveTabTools()).toMatchObject({
      kind: 'webmcp-unavailable',
      origin: 'https://example.com',
    });
  });

  it('recognizes browser pages that extensions may not touch', async () => {
    await openActiveTab('chrome://extensions');

    expect(await loadActiveTabTools()).toMatchObject({ kind: 'restricted-page' });
  });

  it('detects a tab that was open before the extension loaded (no content script yet)', async () => {
    await openActiveTab('https://example.com');
    pageIsUnreachable(new Error('Could not establish connection. Receiving end does not exist.'));

    expect(await loadActiveTabTools()).toMatchObject({ kind: 'content-script-missing' });
  });

  it('treats an unexpected answer as a missing content script rather than crashing', async () => {
    await openActiveTab('https://example.com');
    pageAnswers({ hello: 'world' });

    expect(await loadActiveTabTools()).toMatchObject({ kind: 'content-script-missing' });
  });
});

describe('runToolInTab', () => {
  it('sends the tool call to the page and returns its answer', async () => {
    const sendMessage = pageAnswers({ status: 'ok', result: { boards: [] } });

    const response = await runToolInTab(3, 'list_boards', {}, 'run-1');

    expect(sendMessage).toHaveBeenCalledWith(3, {
      type: 'webmcp/execute-tool',
      executionId: 'run-1',
      toolName: 'list_boards',
      toolArguments: {},
    });
    expect(response).toEqual({ status: 'ok', result: { boards: [] } });
  });

  it('turns a lost connection into a readable error', async () => {
    pageIsUnreachable(new Error('The tab was closed.'));

    expect(await runToolInTab(3, 'list_boards', {}, 'run-1')).toEqual({
      status: 'error',
      code: 'TOOL_FAILED',
      message: 'Could not reach the page: The tab was closed.',
    });
  });
});
