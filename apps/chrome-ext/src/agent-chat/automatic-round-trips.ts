import { type UIMessage, isToolUIPart, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';

/** How many tool rounds the agent may run on its own before the user has to say "continue". */
export const MAX_AUTOMATIC_TOOL_ROUNDS = 10;

/**
 * After every tool result, the chat sends the conversation back to the model so it can carry
 * on. This decides whether to do that: only when all tool calls of the latest answer have a
 * result, and only while the agent hasn't used up its tool rounds since the user last spoke.
 */
export function shouldContinueAutomatically(
  messages: UIMessage[],
  maxToolRounds = MAX_AUTOMATIC_TOOL_ROUNDS,
): boolean {
  if (!lastAssistantMessageIsCompleteWithToolCalls({ messages })) return false;
  const latestAnswer = messages.at(-1);
  if (latestAnswer?.role !== 'assistant') return false;
  return countToolRounds(latestAnswer) < maxToolRounds;
}

/** Each model step starts with a `step-start` part; a tool round is a step that called tools. */
export function countToolRounds(assistantMessage: UIMessage): number {
  const steps: UIMessage['parts'][] = [[]];
  for (const part of assistantMessage.parts) {
    if (part.type === 'step-start') steps.push([]);
    else steps.at(-1)?.push(part);
  }
  return steps.filter((stepParts) => stepParts.some((part) => isToolUIPart(part))).length;
}
