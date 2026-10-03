import type { UIMessage } from 'ai';

/**
 * Shortens tool results that are too long before the conversation goes to the model. Pages can
 * return a lot of data, and every token counts against the free Ollama usage.
 */
export function truncateToolOutputs(
  messages: readonly UIMessage[],
  maxCharacters: number,
): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!('output' in part) || part.output === undefined) return part;
      const serializedOutput =
        typeof part.output === 'string' ? part.output : JSON.stringify(part.output);
      if (serializedOutput.length <= maxCharacters) return part;
      const hiddenCharacters = serializedOutput.length - maxCharacters;
      return {
        ...part,
        output: `${serializedOutput.slice(0, maxCharacters)}… [truncated: ${hiddenCharacters} more characters]`,
      };
    }),
  }));
}
