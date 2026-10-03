import { z } from 'zod';

import { webMcpToolDescriptorSchema } from '../tool-descriptors/tool-descriptor-schema';
import { UNTRUSTED_INPUT_LIMITS } from '../tool-descriptors/untrusted-input-limits';

/**
 * The minimum shape of an AI SDK `UIMessage`. Unknown fields are kept so the BFF can hand
 * the messages to the AI SDK unchanged; the AI SDK performs the detailed validation.
 */
export const chatUiMessageSchema = z.looseObject({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(z.unknown()),
});
export type ChatUiMessage = z.infer<typeof chatUiMessageSchema>;

/** What the agent needs to know about the browser tab the user is chatting about. */
export const pageContextSchema = z
  .object({
    tabId: z.int().nonnegative(),
    url: z.url(),
    origin: z.string().min(1),
    title: z.string(),
    isTrustedOrigin: z.boolean(),
    tools: z.array(webMcpToolDescriptorSchema).max(UNTRUSTED_INPUT_LIMITS.maxToolsPerPage),
  })
  .refine(
    // An unparseable url is already reported by its own field check.
    (pageContext) =>
      !URL.canParse(pageContext.url) || new URL(pageContext.url).origin === pageContext.origin,
    { message: 'origin must be the origin of url', path: ['origin'] },
  );
export type PageContext = z.infer<typeof pageContextSchema>;

/** Body of `POST /api/chat`, sent by the side panel on every turn. */
export const chatRequestBodySchema = z.object({
  id: z.string().min(1),
  messages: z.array(chatUiMessageSchema).min(1),
  pageContext: pageContextSchema,
});
export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>;
