import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeModelContext } from '../test/fake-model-context';
import { createWebMcpHost, detectModelContext } from './webmcp-host';

const PAGE_ORIGIN = 'http://localhost:5173';

describe('createWebMcpHost', () => {
  let fakeModelContext: FakeModelContext;

  function createHost(options: { executionTimeoutMs?: number } = {}) {
    return createWebMcpHost({
      modelContext: fakeModelContext.asModelContext(),
      origin: PAGE_ORIGIN,
      ownWindow: window,
      ...options,
    });
  }

  beforeEach(() => {
    fakeModelContext = new FakeModelContext();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('listTools', () => {
    it('returns the page tools normalized, sorted by name and stamped with the origin', async () => {
      fakeModelContext.addTool('move_card', { annotations: { consequentialHint: false } });
      fakeModelContext.addTool('get_board', {
        annotations: { readOnlyHint: true },
        inputSchema: '{"type":"object","properties":{"query":{"type":"string"}}}',
      });

      const response = await createHost().listTools();

      expect(response).toMatchObject({
        status: 'ok',
        origin: PAGE_ORIGIN,
        rejectedTools: [],
        tools: [
          {
            name: 'get_board',
            origin: PAGE_ORIGIN,
            annotations: { readOnlyHint: true },
            inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
          },
          { name: 'move_card' },
        ],
      });
    });

    it('reports tools it had to reject', async () => {
      fakeModelContext.addTool('broken', { inputSchema: '{ not json' });

      expect(await createHost().listTools()).toMatchObject({
        tools: [],
        rejectedTools: [{ name: 'broken', reason: 'invalid-input-schema' }],
      });
    });

    it('ignores tools that belong to other frames', async () => {
      const otherFrameContext = new FakeModelContext({} as Window);
      otherFrameContext.addTool('iframe_tool');
      fakeModelContext.addTool('top_tool');
      const host = createWebMcpHost({
        modelContext: {
          ...fakeModelContext.asModelContext(),
          getTools: async () => [
            ...(await fakeModelContext.getTools()),
            ...(await otherFrameContext.getTools()),
          ],
        },
        origin: PAGE_ORIGIN,
        ownWindow: window,
      });

      const response = await host.listTools();

      expect(response.status === 'ok' && response.tools.map((tool) => tool.name)).toEqual([
        'top_tool',
      ]);
    });
  });

  describe('executeTool', () => {
    it('passes arguments as an object and parses the JSON result', async () => {
      const execute = vi.fn<(input: unknown) => unknown>((input) => ({ received: input }));
      fakeModelContext.addTool('move_card', { execute });

      const response = await createHost().executeTool('move_card', { cardId: 'c1' });

      expect(response).toEqual({ status: 'ok', result: { received: { cardId: 'c1' } } });
    });

    it('falls back to JSON string arguments on Chrome versions that require them', async () => {
      fakeModelContext.acceptsOnlyStringArguments = true;
      fakeModelContext.addTool('move_card', { execute: (input) => input });

      const response = await createHost().executeTool('move_card', { cardId: 'c1' });

      expect(response).toEqual({ status: 'ok', result: { cardId: 'c1' } });
    });

    it('reports a tool that is no longer on the page', async () => {
      expect(await createHost().executeTool('vanished_tool', {})).toEqual({
        status: 'error',
        code: 'TOOL_NOT_FOUND',
        message: 'The page no longer offers a tool named "vanished_tool".',
      });
    });

    it('reports the page error when the tool throws', async () => {
      fakeModelContext.addTool('explode', {
        execute: () => {
          throw new Error('Board is read-only');
        },
      });

      expect(await createHost().executeTool('explode', {})).toEqual({
        status: 'error',
        code: 'TOOL_FAILED',
        message: 'Board is read-only',
      });
    });

    it('gives up after the timeout when a tool never answers', async () => {
      vi.useFakeTimers();
      fakeModelContext.addTool('hang', { execute: () => new Promise(() => {}) });

      const pendingResponse = createHost({ executionTimeoutMs: 1_000 }).executeTool('hang', {});
      await vi.advanceTimersByTimeAsync(1_000);

      expect(await pendingResponse).toEqual({
        status: 'error',
        code: 'TIMEOUT',
        message: 'The page did not answer within 1 seconds.',
      });
    });

    it('stops when the caller aborts', async () => {
      fakeModelContext.addTool('hang', { execute: () => new Promise(() => {}) });
      const abortController = new AbortController();

      const pendingResponse = createHost().executeTool('hang', {}, abortController.signal);
      abortController.abort();

      expect(await pendingResponse).toMatchObject({ status: 'error', code: 'ABORTED' });
    });
  });

  describe('onToolsChanged', () => {
    it('reports a burst of tool changes once', async () => {
      vi.useFakeTimers();
      const listener = vi.fn<() => void>();
      createHost().onToolsChanged(listener);

      fakeModelContext.addTool('a');
      fakeModelContext.addTool('b');
      fakeModelContext.removeTool('a');
      await vi.advanceTimersByTimeAsync(150);

      expect(listener).toHaveBeenCalledOnce();
    });

    it('stops reporting after unsubscribing', async () => {
      vi.useFakeTimers();
      const listener = vi.fn<() => void>();
      const unsubscribe = createHost().onToolsChanged(listener);

      unsubscribe();
      fakeModelContext.addTool('a');
      await vi.advanceTimersByTimeAsync(150);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('detectModelContext', () => {
  it('finds document.modelContext when the browser supports WebMCP', () => {
    const fakeModelContext = new FakeModelContext().asModelContext();
    const fakeDocument = { modelContext: fakeModelContext } as unknown as Document;

    expect(detectModelContext(fakeDocument)).toBe(fakeModelContext);
  });

  it('returns undefined without WebMCP', () => {
    expect(detectModelContext({} as Document)).toBeUndefined();
  });
});
