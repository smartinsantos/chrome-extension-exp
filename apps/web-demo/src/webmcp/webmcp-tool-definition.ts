import type { z } from 'zod';

/**
 * Everything a page needs to offer one WebMCP tool. The zod schema is the single source of
 * truth: it becomes the JSON Schema agents see and also validates what they send.
 */
export interface WebMcpToolDefinition<TInput, TContext> {
  name: string;
  title?: string;
  /** Written for an AI agent: what the tool does, when to use it, what it returns. */
  description: string;
  annotations?: WebMCP.ToolAnnotations;
  inputSchema: z.ZodType<TInput>;
  /** Runs the real app action. `context` carries live app objects such as the query client. */
  execute: (input: TInput, context: TContext, signal: AbortSignal) => Promise<unknown>;
}

/** Identity helper that lets TypeScript infer the input type from the schema. */
export function defineWebMcpTool<TInput, TContext>(
  definition: WebMcpToolDefinition<TInput, TContext>,
): WebMcpToolDefinition<TInput, TContext> {
  return definition;
}
