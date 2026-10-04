import { type UIMessage, isToolUIPart } from 'ai';

import type { ToolApprovalRequest } from '../../../agent-chat/run-agent-tool-call';
import { ToolCallCard } from './tool-call-card';

interface ChatMessageListProps {
  messages: UIMessage[];
  pendingApprovals: ReadonlyMap<
    string,
    { request: ToolApprovalRequest; decide: (isApproved: boolean) => void }
  >;
}

export function ChatMessageList({ messages, pendingApprovals }: ChatMessageListProps) {
  return (
    <ol aria-label="Conversation" className="space-y-3">
      {messages.map((message) => (
        <li
          key={message.id}
          className={
            message.role === 'user'
              ? 'ml-8 rounded-lg bg-primary p-2.5 text-primary-foreground'
              : 'space-y-2'
          }
        >
          {message.parts.map((part, index) => {
            const key = `${message.id}-${index}`;
            if (part.type === 'text') {
              return (
                <p key={key} className="whitespace-pre-wrap">
                  {part.text}
                </p>
              );
            }
            if (part.type === 'reasoning' && part.text.trim() !== '') {
              return (
                <details key={key} className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Thinking</summary>
                  <p className="mt-1 whitespace-pre-wrap">{part.text}</p>
                </details>
              );
            }
            if (isToolUIPart(part)) {
              return (
                <ToolCallCard
                  key={key}
                  part={part}
                  pendingApproval={pendingApprovals.get(part.toolCallId)}
                />
              );
            }
            return null;
          })}
        </li>
      ))}
    </ol>
  );
}
