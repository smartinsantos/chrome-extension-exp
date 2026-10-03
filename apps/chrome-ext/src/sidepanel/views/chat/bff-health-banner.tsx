import { useQuery } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { z } from 'zod';

const healthResponseSchema = z.object({
  model: z.string(),
  ollama: z.object({ reachable: z.boolean(), authOk: z.boolean(), modelListed: z.boolean() }),
});

async function fetchBffHealth(bffUrl: string) {
  const response = await fetch(`${bffUrl}/api/health`);
  return healthResponseSchema.parse(await response.json());
}

/** Explains, before the user types, why the agent can't answer (backend down, bad key…). */
export function BffHealthBanner({ bffUrl }: { bffUrl: string }) {
  const healthQuery = useQuery({
    queryKey: ['bff-health', bffUrl],
    queryFn: () => fetchBffHealth(bffUrl),
    retry: false,
    refetchInterval: 30_000,
  });

  const problem = healthQuery.isError
    ? `The agent backend isn't running at ${bffUrl}. Start it with: pnpm --filter chrome-ext-bff dev`
    : healthQuery.data === undefined
      ? undefined
      : !healthQuery.data.ollama.reachable
        ? 'The agent backend cannot reach Ollama Cloud. Check your internet connection.'
        : !healthQuery.data.ollama.authOk
          ? 'Ollama Cloud rejected the API key. Check OLLAMA_API_KEY in apps/chrome-ext-bff/.env.'
          : !healthQuery.data.ollama.modelListed
            ? `Ollama Cloud doesn't offer the model "${healthQuery.data.model}". Change AI_MODEL.`
            : undefined;

  if (problem === undefined) return null;
  return (
    <p
      role="status"
      className="flex gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {problem}
    </p>
  );
}
