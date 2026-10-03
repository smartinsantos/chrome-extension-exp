import { z } from 'zod';

import { UNTRUSTED_INPUT_LIMITS } from './untrusted-input-limits';

/** WebMCP tool inputs are always a single JSON object, so input schemas must describe one. */
export const toolInputSchemaSchema = z.looseObject({ type: z.literal('object') });
export type ToolInputSchema = z.infer<typeof toolInputSchemaSchema>;

/** Hints a page declares about a tool. Pages can lie, so treat these as claims, not facts. */
export const toolAnnotationsSchema = z.object({
  readOnlyHint: z.boolean(),
  consequentialHint: z.boolean(),
  untrustedContentHint: z.boolean(),
});
export type ToolAnnotations = z.infer<typeof toolAnnotationsSchema>;

/** A WebMCP tool after normalization: the shape the extension sends and the BFF accepts. */
export const webMcpToolDescriptorSchema = z.object({
  name: z.string().trim().min(1).max(UNTRUSTED_INPUT_LIMITS.maxToolNameLength),
  title: z.string().max(UNTRUSTED_INPUT_LIMITS.maxToolTitleLength).optional(),
  description: z.string().max(UNTRUSTED_INPUT_LIMITS.maxToolDescriptionLength),
  inputSchema: toolInputSchemaSchema,
  annotations: toolAnnotationsSchema,
  origin: z.string().min(1),
});
export type WebMcpToolDescriptor = z.infer<typeof webMcpToolDescriptorSchema>;
