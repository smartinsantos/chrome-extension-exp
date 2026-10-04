import {
  chatRequestBodySchema,
  createApiErrorBody,
  normalizeToolDescriptors,
} from '@repo/agent-protocol';
import {
  InvalidToolInputError,
  type LanguageModel,
  NoSuchToolError,
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from 'ai';

import { mapUpstreamError } from '../ollama/map-upstream-error';
import { buildPageToolSet } from './build-page-tools';
import { buildSystemPrompt } from './system-prompt';
import { truncateToolOutputs } from './truncate-tool-outputs';

interface ChatHandlerOptions {
  model: LanguageModel;
  maxToolResultChars: number;
  today?: () => string;
}

const UNEXPECTED_ERROR_MESSAGE = 'The agent hit an unexpected error. Check the BFF logs.';

/**
 * Model calls per chat request. Page tools run in the browser, so a call to one always ends the
 * request; extra steps only happen after a call the SDK rejected itself (a tool that wasn't
 * offered, or input that doesn't match its schema), letting the model read why and recover.
 */
const MAX_MODEL_STEPS_PER_REQUEST = 3;

/**
 * Handles one chat turn: validates what the side panel sent, offers the page's tools to the
 * model, and streams the answer (text and tool calls) back as AI SDK UI message chunks.
 */
export function createChatHandler({
  model,
  maxToolResultChars,
  today = () => new Date().toISOString().slice(0, 10),
}: ChatHandlerOptions) {
  return async (request: Request): Promise<Response> => {
    const rawBody: unknown = await request.json().catch(() => undefined);
    const parsedBody = chatRequestBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return Response.json(
        createApiErrorBody(
          'invalid_request',
          'The chat request is not valid.',
          parsedBody.error.issues,
        ),
        { status: 400 },
      );
    }
    const { messages, pageContext } = parsedBody.data;

    const validatedMessages = await safeValidateUIMessages({ messages });
    if (!validatedMessages.success) {
      return Response.json(createApiErrorBody('invalid_request', validatedMessages.error.message), {
        status: 400,
      });
    }

    // The model never sees an untrusted site's tools: their descriptions are text the site wrote.
    // The extension already checked the tools, but the BFF never trusts its callers' input.
    const { tools: pageTools } = pageContext.isTrustedOrigin
      ? normalizeToolDescriptors(pageContext.tools, pageContext.origin)
      : { tools: [] };
    const { toolSet } = buildPageToolSet(pageTools);

    const result = streamText({
      model,
      instructions: buildSystemPrompt(pageContext, today()),
      messages: await convertToModelMessages(
        truncateToolOutputs(validatedMessages.data, maxToolResultChars),
      ),
      tools: toolSet,
      stopWhen: isStepCount(MAX_MODEL_STEPS_PER_REQUEST),
      abortSignal: request.signal,
      // Errors are reported once, below, where they are turned into a message for the user.
      onError: () => undefined,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        onError: (error) => {
          const rejectedToolCallReason = describeRejectedToolCall(error);
          if (rejectedToolCallReason !== undefined) return rejectedToolCallReason;
          const upstreamFailure = mapUpstreamError(error);
          if (upstreamFailure === undefined) console.error('Chat request failed:', error);
          return upstreamFailure?.message ?? UNEXPECTED_ERROR_MESSAGE;
        },
        messageMetadata: ({ part }) =>
          part.type === 'finish' ? { totalTokens: part.totalUsage.totalTokens } : undefined,
      }),
    });
  };
}

/**
 * Why the SDK rejected a tool call (a tool that wasn't offered, or input that doesn't match its
 * schema). The reason is stored in the conversation and read by the model in later turns, so it
 * must stay this precise. The SDK reports it as the error itself, or already as its message.
 */
function describeRejectedToolCall(error: unknown): string | undefined {
  if (NoSuchToolError.isInstance(error) || InvalidToolInputError.isInstance(error)) {
    return error.message;
  }
  return typeof error === 'string' ? error : undefined;
}
