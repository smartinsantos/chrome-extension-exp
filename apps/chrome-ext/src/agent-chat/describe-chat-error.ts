import { apiErrorBodySchema } from '@repo/agent-protocol';

/** Chat errors arrive as the raw response text; show the BFF's message when there is one. */
export function describeChatError(error: Error): string {
  try {
    const parsed = apiErrorBodySchema.safeParse(JSON.parse(error.message));
    if (parsed.success) return parsed.data.error.message;
  } catch {
    // Not JSON: fall through to the plain message.
  }
  if (error.message.includes('Failed to fetch')) {
    return 'Could not reach the agent backend. Start it with: pnpm --filter chrome-ext-bff dev';
  }
  return error.message;
}
