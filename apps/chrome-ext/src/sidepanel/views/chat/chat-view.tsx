import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import type { UIMessage } from 'ai';
import { RotateCcw } from 'lucide-react';

import { useAgentChatSession } from '../../../agent-chat/agent-chat-session';
import { describeChatError } from '../../../agent-chat/describe-chat-error';
import { useExtensionSettings } from '../../../settings/use-extension-settings';
import { useActiveTabTools } from '../../active-tab/use-active-tab-tools';
import { BffHealthBanner } from './bff-health-banner';
import { ChatComposer } from './chat-composer';
import { ChatMessageList } from './chat-message-list';

export function ChatView() {
  const { settings } = useExtensionSettings();
  if (settings === undefined) return <Skeleton className="m-4 h-40" aria-busy="true" />;
  return <AgentChat bffUrl={settings.bffUrl} />;
}

function AgentChat({ bffUrl }: { bffUrl: string }) {
  const agentChat = useAgentChatSession();
  const activeTabTools = useActiveTabTools().data;
  const isBusy = agentChat.status === 'submitted' || agentChat.status === 'streaming';
  const activeTabIsReady = activeTabTools?.kind === 'ready';
  const isBoundToAnotherPage =
    agentChat.binding !== undefined &&
    (!activeTabIsReady ||
      activeTabTools.tabId !== agentChat.binding.tabId ||
      activeTabTools.origin !== agentChat.binding.origin);

  return (
    <section className="flex h-full flex-col">
      <div className="space-y-3 p-4 pb-2">
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-base font-semibold">Chat</h1>
          <div className="flex items-center gap-2">
            <TokenCount messages={agentChat.messages} />
            <Button
              size="xs"
              variant="ghost"
              onClick={agentChat.startNewChat}
              disabled={agentChat.messages.length === 0}
            >
              <RotateCcw aria-hidden />
              New chat
            </Button>
          </div>
        </header>
        <BffHealthBanner bffUrl={bffUrl} />
        {agentChat.binding !== undefined && (
          <p className="text-xs text-muted-foreground">
            This chat works on{' '}
            <strong className="text-foreground">{agentChat.binding.origin}</strong>
            {isBoundToAnotherPage &&
              ' — switch back to that tab, or start a new chat for this one.'}
          </p>
        )}
        {agentChat.binding === undefined && !activeTabIsReady && (
          <p className="text-muted-foreground">
            Open a page that offers WebMCP tools to chat about it.
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <ChatMessageList
          messages={agentChat.messages}
          pendingApprovals={agentChat.pendingApprovals}
        />
        {agentChat.error !== undefined && (
          <p role="alert" className="mt-3 rounded bg-destructive/10 p-2 text-xs text-destructive">
            {describeChatError(agentChat.error)}
          </p>
        )}
      </div>
      <ChatComposer
        isBusy={isBusy}
        isDisabled={agentChat.binding === undefined ? !activeTabIsReady : isBoundToAnotherPage}
        onStop={agentChat.stop}
        onSend={(text) => {
          if (activeTabTools?.kind !== 'ready') return;
          agentChat.sendUserMessage(text, {
            tabId: activeTabTools.tabId,
            origin: activeTabTools.origin,
          });
        }}
      />
    </section>
  );
}

/** Tokens used by this chat, from the usage the BFF attaches to each answer. */
function TokenCount({ messages }: { messages: UIMessage[] }) {
  const totalTokens = messages.reduce((total, message) => {
    const metadata: unknown = message.metadata;
    const tokens: unknown =
      typeof metadata === 'object' && metadata !== null
        ? Reflect.get(metadata, 'totalTokens')
        : undefined;
    return total + (typeof tokens === 'number' ? tokens : 0);
  }, 0);
  if (totalTokens === 0) return null;
  return <Badge variant="outline">{totalTokens.toLocaleString()} tokens</Badge>;
}
