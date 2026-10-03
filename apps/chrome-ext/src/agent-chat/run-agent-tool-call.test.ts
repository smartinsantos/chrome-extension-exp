import { type WebMcpToolDescriptor, createToolNameCodec } from '@repo/agent-protocol';
import { describe, expect, it, vi } from 'vitest';

import type { ActiveTabTools } from '../sidepanel/active-tab/active-tab-api';
import { type AgentToolCallDependencies, runAgentToolCall } from './run-agent-tool-call';

const ORIGIN = 'https://boards.example';

function pageTool(name: string, annotations: Partial<WebMcpToolDescriptor['annotations']> = {}) {
  return {
    name,
    description: name,
    inputSchema: { type: 'object' as const },
    annotations: {
      readOnlyHint: false,
      consequentialHint: false,
      untrustedContentHint: false,
      ...annotations,
    },
    origin: ORIGIN,
  };
}

const TOOLS = [
  pageTool('get_board', { readOnlyHint: true }),
  pageTool('cards.archive', { consequentialHint: true }),
];
const codec = createToolNameCodec(TOOLS.map((tool) => tool.name));

function readyTab(
  overrides: Partial<Extract<ActiveTabTools, { kind: 'ready' }>> = {},
): ActiveTabTools {
  return {
    kind: 'ready',
    tabId: 4,
    url: `${ORIGIN}/b/1`,
    title: 'Board',
    origin: ORIGIN,
    tools: TOOLS,
    rejectedTools: [],
    ...overrides,
  };
}

function dependencies(
  overrides: Partial<AgentToolCallDependencies> = {},
): AgentToolCallDependencies {
  return {
    binding: { tabId: 4, origin: ORIGIN },
    loadBoundTabTools: vi
      .fn<AgentToolCallDependencies['loadBoundTabTools']>()
      .mockResolvedValue(readyTab()),
    readApprovalSettings: vi
      .fn<AgentToolCallDependencies['readApprovalSettings']>()
      .mockResolvedValue({ isTrustedOrigin: true, autoRunReadOnlyOnTrustedOrigins: true }),
    requestUserApproval: vi
      .fn<AgentToolCallDependencies['requestUserApproval']>()
      .mockResolvedValue(true),
    runTool: vi
      .fn<AgentToolCallDependencies['runTool']>()
      .mockResolvedValue({ status: 'ok', result: { lists: [] } }),
    ...overrides,
  };
}

const getBoardCall = {
  toolCallId: 'call-1',
  toolName: codec.toModelToolName('get_board'),
  input: { overdue: true },
};
const archiveCall = {
  toolCallId: 'call-2',
  toolName: codec.toModelToolName('cards.archive'),
  input: { cardId: 'c1' },
};

describe('runAgentToolCall', () => {
  it("runs a read-only tool on a trusted site without asking, using the page's own tool name", async () => {
    const deps = dependencies();

    const outcome = await runAgentToolCall(getBoardCall, deps);

    expect(outcome).toEqual({ kind: 'output', output: { lists: [] } });
    expect(deps.requestUserApproval).not.toHaveBeenCalled();
    expect(deps.runTool).toHaveBeenCalledWith(4, 'get_board', { overdue: true }, 'call-1');
  });

  it('asks before a consequential tool and runs it once the user allows it', async () => {
    const deps = dependencies();

    const outcome = await runAgentToolCall(archiveCall, deps);

    expect(deps.requestUserApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        toolCallId: 'call-2',
        toolName: 'cards.archive',
        input: { cardId: 'c1' },
        origin: ORIGIN,
      }),
    );
    expect(deps.runTool).toHaveBeenCalledWith(4, 'cards.archive', { cardId: 'c1' }, 'call-2');
    expect(outcome.kind).toBe('output');
  });

  it('asks even for read-only tools when the site is not trusted', async () => {
    const deps = dependencies({
      readApprovalSettings: vi
        .fn<AgentToolCallDependencies['readApprovalSettings']>()
        .mockResolvedValue({ isTrustedOrigin: false, autoRunReadOnlyOnTrustedOrigins: true }),
    });

    await runAgentToolCall(getBoardCall, deps);

    expect(deps.requestUserApproval).toHaveBeenCalledOnce();
  });

  it('reports a denial to the model and runs nothing', async () => {
    const deps = dependencies({
      requestUserApproval: vi
        .fn<AgentToolCallDependencies['requestUserApproval']>()
        .mockResolvedValue(false),
    });

    expect(await runAgentToolCall(archiveCall, deps)).toEqual({
      kind: 'error',
      errorText: 'The user declined this action. Do not retry it.',
    });
    expect(deps.runTool).not.toHaveBeenCalled();
  });

  it('refuses to act when the bound tab now shows a different site', async () => {
    const deps = dependencies({
      loadBoundTabTools: vi
        .fn<AgentToolCallDependencies['loadBoundTabTools']>()
        .mockResolvedValue(
          readyTab({ origin: 'https://other.example', url: 'https://other.example/' }),
        ),
    });

    const outcome = await runAgentToolCall(getBoardCall, deps);

    expect(outcome).toEqual({
      kind: 'error',
      errorText: `The tab now shows https://other.example. This chat only acts on ${ORIGIN}.`,
    });
    expect(deps.runTool).not.toHaveBeenCalled();
  });

  it('reports a tool that disappeared from the page', async () => {
    const deps = dependencies({
      loadBoundTabTools: vi
        .fn<AgentToolCallDependencies['loadBoundTabTools']>()
        .mockResolvedValue(readyTab({ tools: [pageTool('get_board')] })),
    });

    expect(await runAgentToolCall(archiveCall, deps)).toEqual({
      kind: 'error',
      errorText: `The page no longer offers the tool "${archiveCall.toolName}".`,
    });
  });

  it('explains when the bound tab is gone or has no WebMCP', async () => {
    const deps = dependencies({
      loadBoundTabTools: vi
        .fn<AgentToolCallDependencies['loadBoundTabTools']>()
        .mockResolvedValue({ kind: 'no-tab' }),
    });

    expect(await runAgentToolCall(getBoardCall, deps)).toMatchObject({ kind: 'error' });
  });

  it('passes on page errors with their code', async () => {
    const deps = dependencies({
      runTool: vi.fn<AgentToolCallDependencies['runTool']>().mockResolvedValue({
        status: 'error',
        code: 'TIMEOUT',
        message: 'The page did not answer.',
      }),
    });

    expect(await runAgentToolCall(getBoardCall, deps)).toEqual({
      kind: 'error',
      errorText: 'TIMEOUT: The page did not answer.',
    });
  });

  it('rejects tool input that is not an object', async () => {
    const deps = dependencies();

    expect(await runAgentToolCall({ ...getBoardCall, input: 'cardId=1' }, deps)).toMatchObject({
      kind: 'error',
    });
    expect(deps.runTool).not.toHaveBeenCalled();
  });
});
