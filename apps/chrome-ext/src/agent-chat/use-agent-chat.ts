import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useMemo, useRef, useState } from 'react';

import { isOriginTrusted, readExtensionSettings } from '../settings/extension-settings';
import {
  cancelToolInTab,
  loadToolsForTabId,
  runToolInTab,
} from '../sidepanel/active-tab/active-tab-api';
import { shouldContinueAutomatically } from './automatic-round-trips';
import { loadPageContext } from './load-page-context';
import {
  type AgentToolCall,
  type ChatBinding,
  type ToolApprovalRequest,
  runAgentToolCall,
} from './run-agent-tool-call';

interface PendingApproval {
  request: ToolApprovalRequest;
  decide: (isApproved: boolean) => void;
}

/**
 * The side panel's agent chat: AI SDK `useChat` talking to the BFF, plus everything that makes
 * tool calls safe — running them in the bound tab, asking the user when needed, and stopping.
 */
export function useAgentChat({ bffUrl }: { bffUrl: string }) {
  const bindingRef = useRef<ChatBinding | undefined>(undefined);
  const [binding, setBinding] = useState<ChatBinding>();
  const [chatId, setChatId] = useState(() => crypto.randomUUID());
  const [pendingApprovals, setPendingApprovals] = useState<ReadonlyMap<string, PendingApproval>>(
    new Map(),
  );
  const runningToolCallIds = useRef(new Set<string>());

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${bffUrl}/api/chat`,
        prepareSendMessagesRequest: async ({ id, messages }) => {
          const currentBinding = bindingRef.current;
          if (currentBinding === undefined) throw new Error('Open a page with WebMCP tools first.');
          return { body: { id, messages, pageContext: await loadPageContext(currentBinding) } };
        },
      }),
    [bffUrl],
  );

  const requestUserApproval = useCallback(
    (request: ToolApprovalRequest) =>
      new Promise<boolean>((resolve) => {
        setPendingApprovals((current) =>
          new Map(current).set(request.toolCallId, {
            request,
            decide: (isApproved) => {
              setPendingApprovals((latest) => {
                const next = new Map(latest);
                next.delete(request.toolCallId);
                return next;
              });
              resolve(isApproved);
            },
          }),
        );
      }),
    [],
  );

  const chat = useChat({
    id: chatId,
    transport,
    sendAutomaticallyWhen: ({ messages }) => shouldContinueAutomatically(messages),
    onToolCall: ({ toolCall }) => {
      // Not awaited: the tool may wait for the user's approval, which must not block the chat.
      void handleToolCall({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        input: toolCall.input,
      });
    },
  });

  async function handleToolCall(toolCall: AgentToolCall) {
    const currentBinding = bindingRef.current;
    if (currentBinding === undefined) return;
    runningToolCallIds.current.add(toolCall.toolCallId);
    try {
      const outcome = await runAgentToolCall(toolCall, {
        binding: currentBinding,
        loadBoundTabTools: () => loadToolsForTabId(currentBinding.tabId),
        readApprovalSettings: async () => ({
          isTrustedOrigin: await isOriginTrusted(currentBinding.origin),
          autoRunReadOnlyOnTrustedOrigins: (await readExtensionSettings())
            .autoRunReadOnlyOnTrustedOrigins,
        }),
        requestUserApproval,
        runTool: runToolInTab,
      });
      if (outcome.kind === 'output') {
        void chat.addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: outcome.output,
        });
      } else {
        void chat.addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: 'output-error',
          errorText: outcome.errorText,
        });
      }
    } finally {
      runningToolCallIds.current.delete(toolCall.toolCallId);
    }
  }

  function sendUserMessage(text: string, activeTabBinding: ChatBinding) {
    if (bindingRef.current === undefined) {
      bindingRef.current = activeTabBinding;
      setBinding(activeTabBinding);
    }
    void chat.sendMessage({ text });
  }

  /** Stops the answer, declines waiting approvals and cancels tools still running in the page. */
  function stop() {
    void chat.stop();
    for (const pendingApproval of pendingApprovals.values()) pendingApproval.decide(false);
    const currentBinding = bindingRef.current;
    if (currentBinding === undefined) return;
    for (const toolCallId of runningToolCallIds.current) {
      void cancelToolInTab(currentBinding.tabId, toolCallId);
    }
  }

  function startNewChat() {
    stop();
    bindingRef.current = undefined;
    setBinding(undefined);
    setChatId(crypto.randomUUID());
  }

  return {
    binding,
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    pendingApprovals,
    sendUserMessage,
    stop,
    startNewChat,
  };
}
