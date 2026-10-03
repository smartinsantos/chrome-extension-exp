import { createApiErrorBody } from '@repo/agent-protocol';
import type { MiddlewareHandler } from 'hono';

/**
 * Browsers always send an Origin header, so this blocks other websites (and other extensions)
 * from using the agent and its API key. Requests without an Origin come from tools on this
 * machine, such as curl; the server only listens on 127.0.0.1, so those stay local.
 */
export function originGuard(allowedOrigins: readonly string[]): MiddlewareHandler {
  return async (context, next) => {
    const origin = context.req.header('origin');
    if (origin !== undefined && !allowedOrigins.includes(origin)) {
      return context.json(
        createApiErrorBody('forbidden_origin', 'Requests must come from the WebMCP Lab extension.'),
        403,
      );
    }
    return next();
  };
}
