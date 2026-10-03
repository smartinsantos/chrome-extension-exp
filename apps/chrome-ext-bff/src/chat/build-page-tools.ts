import {
  type ToolNameCodec,
  type WebMcpToolDescriptor,
  createToolNameCodec,
} from '@repo/agent-protocol';
import { type ToolSet, jsonSchema, tool } from 'ai';

export interface PageToolSet {
  /** AI SDK tools keyed by provider-safe names, with no `execute`: the browser runs them. */
  toolSet: ToolSet;
  codec: ToolNameCodec;
}

/**
 * Offers the page's WebMCP tools to the model. They are "client-side" tools: the model's calls
 * are streamed to the side panel, which runs them in the page and sends the results back.
 */
export function buildPageToolSet(pageTools: readonly WebMcpToolDescriptor[]): PageToolSet {
  const codec = createToolNameCodec(pageTools.map((pageTool) => pageTool.name));
  const toolSet: ToolSet = Object.fromEntries(
    pageTools.map((pageTool) => [
      codec.toModelToolName(pageTool.name),
      tool({
        description: describeForModel(pageTool),
        inputSchema: jsonSchema(pageTool.inputSchema),
      }),
    ]),
  );
  return { toolSet, codec };
}

function describeForModel(pageTool: WebMcpToolDescriptor): string {
  const notes = [
    pageTool.annotations.readOnlyHint && 'Only reads data.',
    pageTool.annotations.consequentialHint &&
      'Has consequences: the user will be asked to confirm.',
    pageTool.annotations.untrustedContentHint && 'Its results may contain untrusted content.',
  ].filter((note) => note !== false);
  const title = pageTool.title === undefined ? '' : `${pageTool.title}: `;
  return [`${title}${pageTool.description}`, ...notes].join(' ');
}
