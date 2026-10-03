import { serve } from '@hono/node-server';

import { type BffConfig, describeConfigForLogs, loadBffConfig } from './config/bff-config';
import { createChatHandler } from './chat/handle-chat';
import { createApp } from './http/create-app';
import { createOllamaHealthCheck } from './ollama/check-ollama-health';
import { createOllamaChatModel } from './ollama/create-ollama-model';

function loadConfigOrExit(): BffConfig {
  try {
    return loadBffConfig(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return process.exit(1);
  }
}

const config = loadConfigOrExit();
const app = createApp({
  config,
  checkOllamaHealth: createOllamaHealthCheck({
    baseUrl: config.ollamaBaseUrl,
    apiKey: config.ollamaApiKey,
    model: config.model,
  }),
  handleChat: createChatHandler({
    model: createOllamaChatModel(config),
    maxToolResultChars: config.maxToolResultChars,
  }),
});

// Loopback only: the API key must never be reachable from other machines on the network.
serve({ fetch: app.fetch, hostname: '127.0.0.1', port: config.port }, ({ port }) => {
  console.info(`Agent backend ready at http://127.0.0.1:${port} ${describeConfigForLogs(config)}`);
});
