import { createApiErrorBody } from '@repo/agent-protocol';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import type { BffConfig } from '../config/bff-config';
import { originGuard } from './origin-guard';

/** Chat requests carry the whole conversation and the page's tools; 2 MB is far above normal. */
const MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024;

export interface OllamaHealth {
  reachable: boolean;
  authOk: boolean;
  modelListed: boolean;
}

export interface AppDependencies {
  config: BffConfig;
  checkOllamaHealth: () => Promise<OllamaHealth>;
  handleChat: (request: Request) => Promise<Response>;
}

export function createApp({ config, checkOllamaHealth, handleChat }: AppDependencies) {
  const app = new Hono();

  app.use(
    '/api/*',
    cors({
      origin: (origin) => (config.allowedOrigins.includes(origin) ? origin : null),
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['content-type'],
    }),
  );
  app.use('/api/*', originGuard(config.allowedOrigins));

  app.get('/api/health', async (context) =>
    context.json({
      status: 'ok',
      model: config.model,
      freeTier: config.isFreeTierModel,
      ollama: await checkOllamaHealth(),
    }),
  );

  app.post(
    '/api/chat',
    bodyLimit({
      maxSize: MAX_REQUEST_BODY_BYTES,
      onError: (context) =>
        context.json(
          createApiErrorBody(
            'payload_too_large',
            'The chat request is too large. Start a new chat.',
          ),
          413,
        ),
    }),
    (context) => handleChat(context.req.raw),
  );

  return app;
}
