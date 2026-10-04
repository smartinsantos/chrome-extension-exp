import { z } from 'zod';

/** Every error the BFF can return. The side panel shows a specific message for each one. */
export const apiErrorCodeSchema = z.enum([
  'invalid_request',
  'forbidden_origin',
  'payload_too_large',
  'usage_exhausted',
  'upstream_auth',
  'upstream_busy',
  'upstream_unreachable',
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export function createApiErrorBody(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}
