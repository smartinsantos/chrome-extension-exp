import { z } from 'zod';

import { GraphqlRequestError } from '../graphql/execute-graphql';
import type { WebMcpToolDefinition } from './webmcp-tool-definition';

export interface WebMcpToolError {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

/**
 * Validates the agent's input, runs the tool and turns every failure into a plain, readable
 * error object. Tools never throw at the agent: a clear error lets it correct itself.
 */
export async function runWebMcpTool<TInput, TContext>(
  definition: WebMcpToolDefinition<TInput, TContext>,
  rawInput: unknown,
  context: TContext,
  signal: AbortSignal,
): Promise<unknown> {
  const parsedInput = definition.inputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return toolError('INVALID_INPUT', z.prettifyError(parsedInput.error));
  }
  try {
    return await definition.execute(parsedInput.data, context, signal);
  } catch (error) {
    if (error instanceof GraphqlRequestError) {
      return Object.keys(error.details).length > 0
        ? toolError(error.code, error.message, error.details)
        : toolError(error.code, error.message);
    }
    return toolError('TOOL_FAILED', error instanceof Error ? error.message : String(error));
  }
}

export function toolError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): WebMcpToolError {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/** JSON Schema for the tool's input, without the `$schema` URL agents don't need. */
export function toToolInputJsonSchema(inputSchema: z.ZodType): object {
  const { $schema: _schemaDialect, ...jsonSchema } = z.toJSONSchema(inputSchema, { io: 'input' });
  return jsonSchema;
}
