import { z } from 'zod';

import { FREE_TIER_MODELS, isFreeTierModel } from './free-tier-models';

export type ThinkingLevel = 'low' | 'medium' | 'high' | 'off';

export interface BffConfig {
  ollamaApiKey: string;
  ollamaBaseUrl: string;
  model: string;
  isFreeTierModel: boolean;
  think: ThinkingLevel;
  port: number;
  /** Browser origins allowed to call the API; normally just the Chrome extension. */
  allowedOrigins: string[];
  /** Tool results longer than this are cut before they reach the model (saves tokens). */
  maxToolResultChars: number;
}

const EXTENSION_ORIGIN = 'chrome-extension://dmnphemkaphmemfkmonbngjofhmbenck';

const environmentSchema = z.object({
  OLLAMA_API_KEY: z
    .string({ error: 'OLLAMA_API_KEY is missing. Copy .env.example to .env and paste your key.' })
    .trim()
    .min(1, 'OLLAMA_API_KEY is empty. Paste your key from ollama.com → Settings → Keys into .env.'),
  OLLAMA_BASE_URL: z.url().default('https://ollama.com'),
  AI_MODEL: z.string().trim().min(1).default('gpt-oss:120b'),
  AI_ALLOW_ANY_MODEL: z.enum(['true', 'false']).default('false'),
  AI_THINK: z.enum(['low', 'medium', 'high', 'off']).default('low'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
  ALLOWED_ORIGINS: z.string().default(EXTENSION_ORIGIN),
  MAX_TOOL_RESULT_CHARS: z.coerce.number().int().min(500).default(20_000),
});

/** Reads and validates the BFF settings. Errors name the variable to fix and never echo values. */
export function loadBffConfig(environment: Record<string, string | undefined>): BffConfig {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `- ${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid chrome-ext-bff settings:\n${problems.join('\n')}`);
  }
  const settings = parsed.data;

  const modelIsFree = isFreeTierModel(settings.AI_MODEL);
  if (!modelIsFree && settings.AI_ALLOW_ANY_MODEL !== 'true') {
    throw new Error(
      `AI_MODEL "${settings.AI_MODEL}" is not covered by Ollama's free usage. Use one of: ` +
        `${FREE_TIER_MODELS.join(', ')} (or set AI_ALLOW_ANY_MODEL=true if you added credits).`,
    );
  }

  return {
    ollamaApiKey: settings.OLLAMA_API_KEY,
    ollamaBaseUrl: settings.OLLAMA_BASE_URL.replace(/\/+$/, ''),
    model: settings.AI_MODEL,
    isFreeTierModel: modelIsFree,
    think: settings.AI_THINK,
    port: settings.PORT,
    allowedOrigins: settings.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ''),
    maxToolResultChars: settings.MAX_TOOL_RESULT_CHARS,
  };
}

/** A one-line summary that is safe to print: everything except the key. */
export function describeConfigForLogs(config: BffConfig): string {
  const { ollamaApiKey: _secret, ...safeSettings } = config;
  return JSON.stringify(safeSettings);
}

/** For entry points: load the settings, or print what to fix and stop the process. */
export function loadBffConfigOrExit(environment: Record<string, string | undefined>): BffConfig {
  try {
    return loadBffConfig(environment);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return process.exit(1);
  }
}
