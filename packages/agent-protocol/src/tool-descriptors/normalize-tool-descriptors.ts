import type {
  RejectedTool,
  ToolAnnotations,
  ToolInputSchema,
  ToolRejectionReason,
  WebMcpToolDescriptor,
} from './tool-descriptor-schema';
import { UNTRUSTED_INPUT_LIMITS } from './untrusted-input-limits';

export interface NormalizedToolList {
  tools: WebMcpToolDescriptor[];
  rejectedTools: RejectedTool[];
}

const UNNAMED_TOOL_LABEL = '(unnamed)';
const TRUNCATION_MARKER = '… [truncated]';
const utf8Encoder = new TextEncoder();
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

  // The shape check must come before serializing: it is bounded, while JSON.stringify can
  // overflow the stack, loop on self-references, or explode on heavily shared sub-objects.
  const shapeProblem = findJsonShapeProblem(parsedInputSchema);
  if (shapeProblem !== undefined) {
    return { isValid: false, reason: shapeProblem };
  }
  const serializedSize = utf8Encoder.encode(JSON.stringify(parsedInputSchema)).length;
  if (serializedSize > UNTRUSTED_INPUT_LIMITS.maxInputSchemaBytes) {
    return { isValid: false, reason: 'input-schema-too-large' };
  }

  return { isValid: true, inputSchema: { ...parsedInputSchema, type: 'object' } };
}

/**
 * Walks a schema with two hard bounds, so hostile input can never hang or crash the walk:
 * - depth: how many objects/arrays sit inside one another (a flat object is depth 1);
 * - node count: every serialized JSON value takes at least one byte, so a schema within the
 *   byte limit can't contain more values than the byte limit allows.
 */
function findJsonShapeProblem(rootValue: unknown): ToolRejectionReason | undefined {
  const maxNodeCount = UNTRUSTED_INPUT_LIMITS.maxInputSchemaBytes;
  const pending: { value: unknown; depth: number }[] = [{ value: rootValue, depth: 1 }];
  let visitedNodeCount = 0;

  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    const { value, depth } = next;
    visitedNodeCount++;
    if (visitedNodeCount > maxNodeCount) return 'input-schema-too-large';
    if (value === null || typeof value !== 'object') continue;
    if (depth > UNTRUSTED_INPUT_LIMITS.maxInputSchemaJsonDepth) return 'input-schema-too-deep';

    const children: unknown[] = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) pending.push({ value: child, depth: depth + 1 });
  }
  return undefined;
}

function normalizeAnnotations(rawAnnotations: unknown): ToolAnnotations {
  const annotations = isPlainObject(rawAnnotations) ? rawAnnotations : {};
  return {
    readOnlyHint: Boolean(annotations['readOnlyHint']),
    consequentialHint: Boolean(annotations['consequentialHint']),
    untrustedContentHint: Boolean(annotations['untrustedContentHint']),
  };
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
