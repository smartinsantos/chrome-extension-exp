import { createToolNameCodec } from '@repo/agent-protocol';

import { decideToolApproval } from '../trust/decide-tool-approval';
import type { ToolExecutionResponse } from '../messaging/extension-messages';
import type { ActiveTabTools } from '../sidepanel/active-tab/active-tab-api';

/** The tab and site a conversation is about. Tool calls only ever run there. */
export interface ChatBinding {
  tabId: number;
  origin: string;
}

export interface AgentToolCall {
  toolCallId: string;
  /** The provider-safe name the model used (see the tool-name codec). */
  toolName: string;
  input: unknown;
}

export interface ToolApprovalRequest {
  toolCallId: string;
  toolName: string;
  toolTitle?: string;
  input: Record<string, unknown>;
  origin: string;
}

export interface AgentToolCallDependencies {
  binding: ChatBinding;
  loadBoundTabTools: () => Promise<ActiveTabTools>;
  readApprovalSettings: () => Promise<{
    isTrustedOrigin: boolean;
    autoRunReadOnlyOnTrustedOrigins: boolean;
  }>;
  /** Shows an Allow / Deny card and resolves with the user's choice. */
  requestUserApproval: (request: ToolApprovalRequest) => Promise<boolean>;
  runTool: (
    tabId: number,
    webToolName: string,
    toolArguments: Record<string, unknown>,
    executionId: string,
  ) => Promise<ToolExecutionResponse>;
}

export type AgentToolCallOutcome =
  { kind: 'output'; output: unknown } | { kind: 'error'; errorText: string };

/**
 * Carries out one tool call the agent asked for: checks it's still the right page, finds the
 * tool, asks the user when the trust rules say so, runs it in the page, and describes the
 * outcome for the model. Every refusal becomes an explanation the model can act on.
 */
export async function runAgentToolCall(
  toolCall: AgentToolCall,
  dependencies: AgentToolCallDependencies,
): Promise<AgentToolCallOutcome> {
  const { binding } = dependencies;
  const boundTab = await dependencies.loadBoundTabTools();
  if (boundTab.kind !== 'ready') {
    return failure(`The page this chat is about can't run tools right now (${boundTab.kind}).`);
  }
  if (boundTab.origin !== binding.origin) {
    return failure(
      `The tab now shows ${boundTab.origin}. This chat only acts on ${binding.origin}.`,
    );
  }

  const codec = createToolNameCodec(boundTab.tools.map((tool) => tool.name));
  const webToolName = codec.toWebToolName(toolCall.toolName);
  const tool = boundTab.tools.find((candidate) => candidate.name === webToolName);
  if (tool === undefined || webToolName === undefined) {
    return failure(`The page no longer offers the tool "${toolCall.toolName}".`);
  }
  if (!isPlainObject(toolCall.input)) {
    return failure('Tool input must be a JSON object.');
  }

  const approvalSettings = await dependencies.readApprovalSettings();
  const decision = decideToolApproval({ annotations: tool.annotations, ...approvalSettings });
  if (decision === 'refuse') {
    // Trust can be removed mid-conversation, after the model was offered the site's tools.
    return failure(
      `${binding.origin} is not trusted, so its tools can't be used. Tell the user, and that ` +
        'they can turn on "Trust this site" in the Tools view if they want you to act on it.',
    );
  }
  if (decision === 'ask-user') {
    const isApproved = await dependencies.requestUserApproval({
      toolCallId: toolCall.toolCallId,
      toolName: tool.name,
      ...(tool.title !== undefined && { toolTitle: tool.title }),
      input: toolCall.input,
      origin: binding.origin,
    });
    if (!isApproved) return failure('The user declined this action. Do not retry it.');
  }

  const response = await dependencies.runTool(
    binding.tabId,
    tool.name,
    toolCall.input,
    toolCall.toolCallId,
  );
  return response.status === 'ok'
    ? { kind: 'output', output: response.result }
    : failure(`${response.code}: ${response.message}`);
}

function failure(errorText: string): AgentToolCallOutcome {
  return { kind: 'error', errorText };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
