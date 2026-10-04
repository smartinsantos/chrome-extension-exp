import { type ReactNode, createContext, useContext } from 'react';

import { useAgentChat } from './use-agent-chat';

export type AgentChatSession = ReturnType<typeof useAgentChat>;

const AgentChatSessionContext = createContext<AgentChatSession | undefined>(undefined);

/**
 * Owns the side panel's one agent chat above the views, so switching to Tools or Settings neither
 * erases the conversation nor stops an answer or a tool that is still running.
 */
export function AgentChatSessionProvider({ children }: { children: ReactNode }) {
  const agentChatSession = useAgentChat();
  return (
    <AgentChatSessionContext.Provider value={agentChatSession}>
      {children}
    </AgentChatSessionContext.Provider>
  );
}

export function useAgentChatSession(): AgentChatSession {
  const agentChatSession = useContext(AgentChatSessionContext);
  if (agentChatSession === undefined) {
    throw new Error('useAgentChatSession must be used inside <AgentChatSessionProvider>.');
  }
  return agentChatSession;
}
