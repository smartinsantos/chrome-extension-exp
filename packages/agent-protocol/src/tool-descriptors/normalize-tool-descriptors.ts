import type {
  ToolAnnotations,
  ToolInputSchema,
  WebMcpToolDescriptor,
} from './tool-descriptor-schema';
import { UNTRUSTED_INPUT_LIMITS } from './untrusted-input-limits';

export type ToolRejectionReason =
  | 'invalid-shape'
  | 'name-too-long'
  | 'duplicate-name'
  | 'invalid-input-schema'
  | 'input-schema-too-large'
  | 'input-schema-too-deep'
  | 'over-tool-limit';

export interface RejectedTool {
  name: string;
  reason: ToolRejectionReason;
}

export interface NormalizedToolList {
  tools: WebMcpToolDescriptor[];
  rejectedTools: RejectedTool[];
}

const UNNAMED_TOOL_LABEL = '(unnamed)';
const TRUNCATION_MARKER = '… [truncated]';
const EMPTY_INPUT_SCHEMA: ToolInputSchema = { type: 'object', properties: {} };

type InputSchemaResult =
  { isValid: true; inputSchema: ToolInputSchema } | { isValid: false; reason: ToolRejectionReason };

type ToolResult =
  { isValid: true; tool: WebMcpToolDescriptor } | { isValid: false; rejectedTool: RejectedTool };

/**
 * Turns the raw tool list a page exposes (as returned by `document.modelContext.getTools()`)
 * into validated descriptors. It never throws: anything unusable is reported in
 * `rejectedTools` with a reason, so the UI can explain what was skipped.
 */
export function normalizeToolDescriptors(
  rawTools: readonly unknown[],
  origin: string,
): NormalizedToolList {
  const validTools: WebMcpToolDescriptor[] = [];
  const rejectedTools: RejectedTool[] = [];

  for (const rawTool of rawTools) {
    const result = normalizeToolDescriptor(rawTool, origin);
    if (result.isValid) validTools.push(result.tool);
    else rejectedTools.push(result.rejectedTool);
  }

  // Sorting first makes duplicate handling and the tool limit independent of page order.
  // The sort is stable, so the first registration of a duplicated name wins.
  const toolsSortedByName = validTools.toSorted((first, second) =>
    first.name < second.name ? -1 : first.name > second.name ? 1 : 0,
  );
  const keptTools: WebMcpToolDescriptor[] = [];
  const keptToolNames = new Set<string>();

  for (const tool of toolsSortedByName) {
    if (keptToolNames.has(tool.name)) {
      rejectedTools.push({ name: tool.name, reason: 'duplicate-name' });
    } else if (keptTools.length >= UNTRUSTED_INPUT_LIMITS.maxToolsPerPage) {
      rejectedTools.push({ name: tool.name, reason: 'over-tool-limit' });
    } else {
      keptTools.push(tool);
      keptToolNames.add(tool.name);
    }
  }

  return { tools: keptTools, rejectedTools };
}

function normalizeToolDescriptor(rawTool: unknown, origin: string): ToolResult {
  if (!isPlainObject(rawTool)) {
    return rejected(UNNAMED_TOOL_LABEL, 'invalid-shape');
  }

  const { name, title, description, inputSchema, annotations } = rawTool;
  if (typeof name !== 'string' || name.trim() === '') {
    return rejected(UNNAMED_TOOL_LABEL, 'invalid-shape');
  }
  if (typeof description !== 'string') {
    return rejected(name, 'invalid-shape');
  }
  if (name.length > UNTRUSTED_INPUT_LIMITS.maxToolNameLength) {
    return rejected(name, 'name-too-long');
  }

  const inputSchemaResult = normalizeInputSchema(inputSchema);
  if (!inputSchemaResult.isValid) {
    return rejected(name, inputSchemaResult.reason);
  }

  const tool: WebMcpToolDescriptor = {
    name,
    description: truncate(description, UNTRUSTED_INPUT_LIMITS.maxToolDescriptionLength),
    inputSchema: inputSchemaResult.inputSchema,
    annotations: normalizeAnnotations(annotations),
    origin,
  };
  if (typeof title === 'string' && title.trim() !== '') {
    tool.title = truncate(title, UNTRUSTED_INPUT_LIMITS.maxToolTitleLength);
  }
  return { isValid: true, tool };
}

function normalizeInputSchema(rawInputSchema: unknown): InputSchemaResult {
  if (rawInputSchema === undefined || rawInputSchema === null) {
    return { isValid: true, inputSchema: EMPTY_INPUT_SCHEMA };
  }

  const parsedInputSchema =
    typeof rawInputSchema === 'string' ? parseJsonOrUndefined(rawInputSchema) : rawInputSchema;
  if (!isPlainObject(parsedInputSchema)) {
    return { isValid: false, reason: 'invalid-input-schema' };
  }

  const declaredType = parsedInputSchema['type'];
  if (declaredType !== undefined && declaredType !== 'object') {
    return { isValid: false, reason: 'invalid-input-schema' };
  }

  const serializedInputSchema = JSON.stringify(parsedInputSchema);
  if (
    new TextEncoder().encode(serializedInputSchema).length >
    UNTRUSTED_INPUT_LIMITS.maxInputSchemaBytes
  ) {
    return { isValid: false, reason: 'input-schema-too-large' };
  }
  if (measureJsonDepth(parsedInputSchema) > UNTRUSTED_INPUT_LIMITS.maxInputSchemaJsonDepth) {
    return { isValid: false, reason: 'input-schema-too-deep' };
  }

  return { isValid: true, inputSchema: { ...parsedInputSchema, type: 'object' } };
}

function normalizeAnnotations(rawAnnotations: unknown): ToolAnnotations {
  const annotations = isPlainObject(rawAnnotations) ? rawAnnotations : {};
  return {
    readOnlyHint: Boolean(annotations['readOnlyHint']),
    consequentialHint: Boolean(annotations['consequentialHint']),
    untrustedContentHint: Boolean(annotations['untrustedContentHint']),
  };
}

/** Depth of nested objects and arrays; a flat object has depth 1. */
function measureJsonDepth(value: unknown): number {
  if (value === null || typeof value !== 'object') return 0;
  const children = Array.isArray(value) ? value : Object.values(value);
  let deepestChild = 0;
  for (const child of children) {
    deepestChild = Math.max(deepestChild, measureJsonDepth(child));
  }
  return 1 + deepestChild;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - TRUNCATION_MARKER.length) + TRUNCATION_MARKER;
}

function parseJsonOrUndefined(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejected(name: string, reason: ToolRejectionReason): ToolResult {
  return { isValid: false, rejectedTool: { name, reason } };
}
