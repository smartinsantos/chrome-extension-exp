import { rejectedToolSchema, webMcpToolDescriptorSchema } from '@repo/agent-protocol';
import { z } from 'zod';

/*
 * Messages between the extension's parts:
 * - side panel → content script (via tabs.sendMessage): list, execute or cancel tools;
 * - content script → side panel and background (via runtime.sendMessage): tools changed.
 * Every incoming message is validated, because pages and other extensions can send messages too.
 */

export const listToolsRequestSchema = z.object({ type: z.literal('webmcp/list-tools') });

export const executeToolRequestSchema = z.object({
  type: z.literal('webmcp/execute-tool'),
  /** Chosen by the side panel, so it can cancel this exact run later. */
  executionId: z.string().min(1),
  toolName: z.string().min(1),
  toolArguments: z.record(z.string(), z.unknown()),
});

export const cancelToolExecutionRequestSchema = z.object({
  type: z.literal('webmcp/cancel-tool-execution'),
  executionId: z.string().min(1),
});

export const toolsChangedEventSchema = z.object({
  type: z.literal('webmcp/tools-changed'),
  origin: z.string(),
  toolCount: z.int().nonnegative(),
});

const extensionMessageSchema = z.discriminatedUnion('type', [
  listToolsRequestSchema,
  executeToolRequestSchema,
  cancelToolExecutionRequestSchema,
  toolsChangedEventSchema,
]);

export type ListToolsRequest = z.infer<typeof listToolsRequestSchema>;
export type ExecuteToolRequest = z.infer<typeof executeToolRequestSchema>;
export type CancelToolExecutionRequest = z.infer<typeof cancelToolExecutionRequestSchema>;
export type ToolsChangedEvent = z.infer<typeof toolsChangedEventSchema>;
export type ExtensionMessage = z.infer<typeof extensionMessageSchema>;

/** Returns the message if it is one of ours and well-formed, otherwise undefined. */
export function parseExtensionMessage(rawMessage: unknown): ExtensionMessage | undefined {
  const parsed = extensionMessageSchema.safeParse(rawMessage);
  return parsed.success ? parsed.data : undefined;
}

export const toolListResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    origin: z.string(),
    tools: z.array(webMcpToolDescriptorSchema),
    rejectedTools: z.array(rejectedToolSchema),
  }),
  z.object({
    status: z.literal('unsupported'),
    /** The page has no `document.modelContext` (flag off, old Chrome, or a special page). */
    reason: z.literal('webmcp-unavailable'),
  }),
]);
export type ToolListResponse = z.infer<typeof toolListResponseSchema>;

export const toolExecutionErrorCodeSchema = z.enum([
  'WEBMCP_UNAVAILABLE',
  'TOOL_NOT_FOUND',
  'TIMEOUT',
  'ABORTED',
  'TOOL_FAILED',
]);
export type ToolExecutionErrorCode = z.infer<typeof toolExecutionErrorCodeSchema>;

export const toolExecutionResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), result: z.unknown() }),
  z.object({ status: z.literal('error'), code: toolExecutionErrorCodeSchema, message: z.string() }),
]);
export type ToolExecutionResponse = z.infer<typeof toolExecutionResponseSchema>;
