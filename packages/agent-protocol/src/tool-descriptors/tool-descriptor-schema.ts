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
  // Never trim: the name must stay byte-identical so the page can still find the tool.
  name: z
    .string()
    .max(UNTRUSTED_INPUT_LIMITS.maxToolNameLength)
    .refine((name) => name.trim() !== '', 'name must not be blank'),
  title: z.string().max(UNTRUSTED_INPUT_LIMITS.maxToolTitleLength).optional(),
  description: z.string().max(UNTRUSTED_INPUT_LIMITS.maxToolDescriptionLength),
  inputSchema: toolInputSchemaSchema,
  annotations: toolAnnotationsSchema,
  origin: z.string().min(1),
});
export type WebMcpToolDescriptor = z.infer<typeof webMcpToolDescriptorSchema>;

/** Why a tool a page offered was left out (pages are untrusted input). */
export const toolRejectionReasonSchema = z.enum([
  'invalid-shape',
  'name-too-long',
  'duplicate-name',
  'invalid-input-schema',
  'input-schema-too-large',
  'input-schema-too-deep',
  'over-tool-limit',
]);
export type ToolRejectionReason = z.infer<typeof toolRejectionReasonSchema>;

export const rejectedToolSchema = z.object({ name: z.string(), reason: toolRejectionReasonSchema });
export type RejectedTool = z.infer<typeof rejectedToolSchema>;
