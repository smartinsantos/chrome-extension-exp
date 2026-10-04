import { normalizeToolDescriptors } from '@repo/agent-protocol';

import type {
  ToolExecutionErrorCode,
  ToolExecutionResponse,
  ToolListResponse,
} from '../messaging/extension-messages';

const DEFAULT_EXECUTION_TIMEOUT_MS = 30_000;
const DEFAULT_TOOL_CHANGE_DEBOUNCE_MS = 100;

export interface WebMcpHostOptions {
  modelContext: WebMCP.ModelContext;
  /** The page origin, stamped on every tool so the side panel knows who offers it. */
  origin: string;
  /** Only this window's tools are listed; tools of embedded frames are left out for now. */
  ownWindow: Window;
  executionTimeoutMs?: number;
  toolChangeDebounceMs?: number;
}

export interface WebMcpHost {
  listTools(): Promise<ToolListResponse>;
  executeTool(
    toolName: string,
    toolArguments: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<ToolExecutionResponse>;
  /** Calls `listener` once per burst of tool registrations/removals. Returns an unsubscribe. */
  onToolsChanged(listener: () => void): () => void;
}

/** `document.modelContext` if the browser supports WebMCP (Chrome with the flag or origin trial). */
export function detectModelContext(targetDocument: Document): WebMCP.ModelContext | undefined {
  return targetDocument.modelContext ?? undefined;
}

/**
 * Everything the content script does with the page's WebMCP API, kept free of extension APIs so
 * it can be tested on its own. All failures come back as coded responses; nothing throws.
 */
export function createWebMcpHost(options: WebMcpHostOptions): WebMcpHost {
  const { modelContext, origin, ownWindow } = options;
  const executionTimeoutMs = options.executionTimeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS;
  const toolChangeDebounceMs = options.toolChangeDebounceMs ?? DEFAULT_TOOL_CHANGE_DEBOUNCE_MS;

  async function findOwnTools(): Promise<WebMCP.RegisteredTool[]> {
    const registeredTools = await modelContext.getTools();
    return registeredTools.filter((tool) => tool.window === ownWindow);
  }

  return {
    async listTools() {
      const ownTools = await findOwnTools();
      const { tools, rejectedTools } = normalizeToolDescriptors(
        ownTools.map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
        })),
        origin,
      );
      return { status: 'ok', origin, tools, rejectedTools };
    },

    async executeTool(toolName, toolArguments, signal) {
      const tool = (await findOwnTools()).find((candidate) => candidate.name === toolName);
      if (tool === undefined) {
        return errorResponse(
          'TOOL_NOT_FOUND',
          `The page no longer offers a tool named "${toolName}".`,
        );
      }
      return runWithTimeout(
        (executionSignal) =>
          executeWithArgumentFallback(modelContext, tool, toolArguments, executionSignal),
        executionTimeoutMs,
        signal,
      );
    },

    onToolsChanged(listener) {
      let pendingNotification: ReturnType<typeof setTimeout> | undefined;
      const handleToolChange = () => {
        clearTimeout(pendingNotification);
        pendingNotification = setTimeout(listener, toolChangeDebounceMs);
      };
      modelContext.addEventListener('toolchange', handleToolChange);
      return () => {
        clearTimeout(pendingNotification);
        modelContext.removeEventListener('toolchange', handleToolChange);
      };
    },
  };
}

/**
 * Chrome first took tool arguments as a JSON string and later switched to a plain object
 * (the string form is deprecated from Chrome 155). Try the object form, and fall back to the
 * string form only when the browser says it couldn't parse the input.
 */
async function executeWithArgumentFallback(
  modelContext: WebMCP.ModelContext,
  tool: WebMCP.RegisteredTool,
  toolArguments: Record<string, unknown>,
  signal: AbortSignal,
): Promise<string> {
  try {
    return await modelContext.executeTool(tool, toolArguments, { signal });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('Failed to parse input'))
      throw error;
    const argumentsAsJsonString: unknown = JSON.stringify(toolArguments);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- older Chrome expects a string here
    return modelContext.executeTool(tool, argumentsAsJsonString as object, { signal });
  }
}

async function runWithTimeout(
  execute: (signal: AbortSignal) => Promise<string>,
  timeoutMs: number,
  callerSignal: AbortSignal | undefined,
): Promise<ToolExecutionResponse> {
  const executionController = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let removeCallerAbortListener: (() => void) | undefined;

  // A page tool may ignore the abort signal, so the race decides the outcome, not the tool.
  const timedOut = new Promise<ToolExecutionResponse>((resolve) => {
    timeoutHandle = setTimeout(() => {
      executionController.abort();
      resolve(
        errorResponse('TIMEOUT', `The page did not answer within ${timeoutMs / 1000} seconds.`),
      );
    }, timeoutMs);
  });
  const aborted = new Promise<ToolExecutionResponse>((resolve) => {
    if (callerSignal === undefined) return;
    const handleCallerAbort = () => {
      executionController.abort();
      resolve(errorResponse('ABORTED', 'The tool run was cancelled.'));
    };
    if (callerSignal.aborted) handleCallerAbort();
    callerSignal.addEventListener('abort', handleCallerAbort, { once: true });
    removeCallerAbortListener = () => callerSignal.removeEventListener('abort', handleCallerAbort);
  });
  const completed = execute(executionController.signal).then(
    (serializedResult): ToolExecutionResponse => ({
      status: 'ok',
      result: parseToolResult(serializedResult),
    }),
    (error: unknown) =>
      errorResponse('TOOL_FAILED', error instanceof Error ? error.message : String(error)),
  );

  try {
    return await Promise.race([completed, timedOut, aborted]);
  } finally {
    clearTimeout(timeoutHandle);
    removeCallerAbortListener?.();
  }
}

/** WebMCP returns tool results as JSON text; decode it, keeping plain text as is. */
function parseToolResult(serializedResult: string): unknown {
  try {
    return JSON.parse(serializedResult) as unknown;
  } catch {
    return serializedResult;
  }
}

function errorResponse(code: ToolExecutionErrorCode, message: string): ToolExecutionResponse {
  return { status: 'error', code, message };
}
