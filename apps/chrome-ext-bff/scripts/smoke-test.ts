/**
 * One real round trip to Ollama Cloud, to check the key, the model and tool calling before a
 * demo. It spends a few tokens of free usage. Run: pnpm --filter chrome-ext-bff smoke
 */
import { jsonSchema, streamText, tool } from 'ai';

import { describeConfigForLogs, loadBffConfig } from '../src/config/bff-config';
import { createOllamaChatModel } from '../src/ollama/create-ollama-model';
import { mapUpstreamError } from '../src/ollama/map-upstream-error';

const config = loadBffConfig(process.env);
console.info(`Smoke test with ${describeConfigForLogs(config)}`);

const result = streamText({
  model: createOllamaChatModel(config),
  instructions: 'You operate a task board through tools. Use tools; never guess.',
  prompt: 'Which cards are overdue on the board? Use the tool.',
  tools: {
    get_board: tool({
      description: 'Returns the board lists and cards. Optional filter: overdue.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: { overdue: { type: 'boolean', description: 'Only overdue cards' } },
      }),
    }),
  },
});

let streamedText = '';
let toolCallSummary: string | undefined;
let failure: unknown;
for await (const part of result.stream) {
  if (part.type === 'text-delta') streamedText += part.text;
  if (part.type === 'tool-call')
    toolCallSummary = `${part.toolName}(${JSON.stringify(part.input)})`;
  if (part.type === 'error') failure = part.error;
}

if (failure !== undefined) {
  console.error('❌ Failed:', mapUpstreamError(failure)?.message ?? failure);
  process.exit(1);
}
const usage = await result.totalUsage;
console.info(`Text: ${streamedText.trim() === '' ? '(none)' : streamedText.trim()}`);
console.info(`Tool call: ${toolCallSummary ?? '(none)'}`);
console.info(
  `Tokens: ${usage.totalTokens ?? 'unknown'} (input ${usage.inputTokens ?? '?'}, output ${usage.outputTokens ?? '?'})`,
);
if (toolCallSummary === undefined) {
  console.error('❌ The model answered without calling the tool.');
  process.exit(1);
}
console.info('✅ Ollama Cloud key, model and tool calling all work.');
