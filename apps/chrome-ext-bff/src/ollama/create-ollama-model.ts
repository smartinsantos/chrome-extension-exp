import type { LanguageModel } from 'ai';
import { createOllama } from 'ai-sdk-ollama';

import type { BffConfig } from '../config/bff-config';

/** The chat model the agent uses: an Ollama Cloud model, authenticated with the BFF's key. */
export function createOllamaChatModel(config: BffConfig): LanguageModel {
  const ollama = createOllama({ baseURL: config.ollamaBaseUrl, apiKey: config.ollamaApiKey });
  return ollama(config.model, {
    think: config.think === 'off' ? false : config.think,
    // Tools run in the browser, not here: the provider must only stream the model's calls.
    reliableToolCalling: false,
  });
}
