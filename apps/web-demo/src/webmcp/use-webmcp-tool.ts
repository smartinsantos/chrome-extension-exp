import { useEffect, useRef } from 'react';

import { getModelContext } from './model-context';
import { runWebMcpTool, toToolInputJsonSchema } from './run-webmcp-tool';
import type { WebMcpToolDefinition } from './webmcp-tool-definition';

/**
 * Offers a WebMCP tool while the calling component is mounted. Mount it inside a route to make
 * the tool available only on that page; unmounting removes it (agents see a `toolchange`).
 */
export function useWebMcpTool<TInput, TContext>(
  definition: WebMcpToolDefinition<TInput, TContext>,
  context: TContext,
): void {
  // Read at call time, so re-renders with new context never re-register the tool.
  const latestContextRef = useRef(context);
  useEffect(() => {
    latestContextRef.current = context;
  });

  useEffect(() => {
    const modelContext = getModelContext();
    if (modelContext === undefined) return undefined;

    // WebMCP has no unregisterTool(): aborting the registration's signal removes the tool.
    const registration = new AbortController();
    modelContext
      .registerTool(
        {
          name: definition.name,
          ...(definition.title !== undefined && { title: definition.title }),
          description: definition.description,
          ...(definition.annotations !== undefined && { annotations: definition.annotations }),
          inputSchema: toToolInputJsonSchema(definition.inputSchema),
          execute: (rawInput, { signal }) =>
            runWebMcpTool(definition, rawInput, latestContextRef.current, signal),
        },
        { signal: registration.signal },
      )
      .catch((error: unknown) => {
        if (!registration.signal.aborted) {
          console.error(`Could not register WebMCP tool "${definition.name}".`, error);
        }
      });
    return () => registration.abort();
  }, [definition]);
}
