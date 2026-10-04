import {
  type UIMessage,
  isStaticToolUIPart,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';

/** How many tool rounds the agent may run on its own before the user has to say "continue". */
export const MAX_AUTOMATIC_TOOL_ROUNDS = 10;

/**
 * After every tool result, the chat sends the conversation back to the model so it can carry
 * on. This decides whether to do that: only when all tool calls of the latest answer have a
 * result, at least one of them was run here in the side panel, and the agent hasn't used up its
 * tool rounds since the user last spoke.
 */
export function shouldContinueAutomatically(
  messages: UIMessage[],
  maxToolRounds = MAX_AUTOMATIC_TOOL_ROUNDS,
): boolean {
  if (!lastAssistantMessageIsCompleteWithToolCalls({ messages })) return false;
  const latestAnswer = messages.at(-1);
  if (latestAnswer?.role !== 'assistant') return false;
  // Page tools are declared to the model, so they arrive as static tool parts. A dynamic part is
  // a call the backend already rejected and answered itself: there is nothing new to send back.
  const ranToolsInSidePanel = (splitIntoSteps(latestAnswer).at(-1) ?? []).some((part) =>
    isStaticToolUIPart(part),
  );
  return ranToolsInSidePanel && countToolRounds(latestAnswer) < maxToolRounds;
}

/** A tool round is a model step that called tools. */
export function countToolRounds(assistantMessage: UIMessage): number {
  return splitIntoSteps(assistantMessage).filter((stepParts) =>
    stepParts.some((part) => isToolUIPart(part)),
  ).length;
}

/** Each model step starts with a `step-start` part. */
function splitIntoSteps(assistantMessage: UIMessage): UIMessage['parts'][] {
  const steps: UIMessage['parts'][] = [[]];
  for (const part of assistantMessage.parts) {
    if (part.type === 'step-start') steps.push([]);
    else steps.at(-1)?.push(part);
  }
  return steps;
}
