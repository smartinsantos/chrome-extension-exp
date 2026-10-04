/**
 * The Ollama Cloud models that free usage credits cover (from ollama.com → Settings → Usage,
 * checked 2026-10-03). All of them support tool calling. Re-check that page if Ollama changes
 * its free plan.
 */
export const FREE_TIER_MODELS = [
  'gpt-oss:120b',
  'gpt-oss:20b',
  'gemma4:31b',
  'nemotron-3-nano:30b',
  'nemotron-3-super',
  'nemotron-3-ultra',
] as const;

export function isFreeTierModel(model: string): boolean {
  return (FREE_TIER_MODELS as readonly string[]).includes(model);
}
