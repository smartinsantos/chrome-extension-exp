import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { FakeModelContext } from '../test/fake-model-context';
import { startWebMcpBridge } from './webmcp-bridge';

describe('startWebMcpBridge', () => {
  let fakeModelContext: FakeModelContext;
  let stopBridge: () => void;

  function startBridge(modelContext: WebMCP.ModelContext | undefined) {
    stopBridge = startWebMcpBridge({
      modelContext,
      origin: 'http://localhost:5173',
      ownWindow: window,
    });
  }

  beforeEach(() => {
    fakeModelContext = new FakeModelContext();
  });

  afterEach(() => {
    stopBridge();
    vi.useRealTimers();
  });

  it('answers a tool list request', async () => {
    fakeModelContext.addTool('list_boards', { annotations: { readOnlyHint: true } });
    startBridge(fakeModelContext.asModelContext());

    const response: unknown = await browser.runtime.sendMessage({ type: 'webmcp/list-tools' });

    expect(response).toMatchObject({ status: 'ok', tools: [{ name: 'list_boards' }] });
  });

  it('reports pages without WebMCP as unsupported', async () => {
    startBridge(undefined);

    expect(await browser.runtime.sendMessage({ type: 'webmcp/list-tools' })).toEqual({
      status: 'unsupported',
      reason: 'webmcp-unavailable',
    });
  });

  it('runs a tool and returns its result', async () => {
    fakeModelContext.addTool('echo', { execute: (input) => input });
    startBridge(fakeModelContext.asModelContext());

    const response: unknown = await browser.runtime.sendMessage({
      type: 'webmcp/execute-tool',
      executionId: 'run-1',
      toolName: 'echo',
      toolArguments: { text: 'hi' },
    });

    expect(response).toEqual({ status: 'ok', result: { text: 'hi' } });
  });

  it('cancels a running tool when asked', async () => {
    fakeModelContext.addTool('hang', { execute: () => new Promise(() => {}) });
    startBridge(fakeModelContext.asModelContext());

    const pendingResponse = browser.runtime.sendMessage({
      type: 'webmcp/execute-tool',
      executionId: 'run-2',
      toolName: 'hang',
      toolArguments: {},
    });
    await browser.runtime.sendMessage({
      type: 'webmcp/cancel-tool-execution',
      executionId: 'run-2',
    });

    expect(await pendingResponse).toMatchObject({ status: 'error', code: 'ABORTED' });
  });

  it('announces tool changes with the new tool count', async () => {
    vi.useFakeTimers();
    const toolsChangedEvents: unknown[] = [];
    fakeBrowser.runtime.onMessage.addListener((message: unknown) => {
      toolsChangedEvents.push(message);
    });
    startBridge(fakeModelContext.asModelContext());

    fakeModelContext.addTool('a');
    fakeModelContext.addTool('b');
    await vi.advanceTimersByTimeAsync(150);

    expect(toolsChangedEvents).toContainEqual({
      type: 'webmcp/tools-changed',
      origin: 'http://localhost:5173',
      toolCount: 2,
    });
  });

  it('ignores messages that are not part of the protocol', async () => {
    startBridge(fakeModelContext.asModelContext());

    expect(await browser.runtime.sendMessage({ type: 'something-else' })).toBeUndefined();
  });
});
