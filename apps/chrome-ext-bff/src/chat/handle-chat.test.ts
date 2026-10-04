import { createToolNameCodec } from '@repo/agent-protocol';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import { createChatHandler } from './handle-chat';

/** One chunk a language model streams (text, tool call, finish…), as the mock model expects. */
type ModelStreamPart =
  Awaited<ReturnType<MockLanguageModelV4['doStream']>>['stream'] extends ReadableStream<infer Part>
    ? Part
    : never;

const FINISH_CHUNK = {
  type: 'finish',
  finishReason: { unified: 'stop', raw: undefined },
  usage: {
    inputTokens: { total: 120, noCache: 120, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 30, text: 30, reasoning: undefined },
  },
} satisfies ModelStreamPart;

function modelThatStreams(chunks: ModelStreamPart[]) {
  return new MockLanguageModelV4({
    doStream: async () => Promise.resolve({ stream: simulateReadableStream({ chunks }) }),
  });
}

const PAGE_TOOLS = [
  {
    name: 'cards.move',
    description: 'Move a card.',
    inputSchema: {
      type: 'object',
      properties: { cardId: { type: 'string' } },
      required: ['cardId'],
    },
    annotations: { readOnlyHint: false, consequentialHint: false, untrustedContentHint: false },
    origin: 'https://boards.example',
  },
  {
    name: 'get_board',
    description: 'Read the board.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, consequentialHint: false, untrustedContentHint: false },
    origin: 'https://boards.example',
  },
];

function chatRequest({
  isTrustedOrigin = true,
  ...overrides
}: { isTrustedOrigin?: boolean } & Record<string, unknown> = {}): Request {
  return new Request('http://127.0.0.1:8787/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: 'chat-1',
      messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Move card c1' }] }],
      pageContext: {
        tabId: 3,
        url: 'https://boards.example/b/1',
        origin: 'https://boards.example',
        title: 'Launch board',
        isTrustedOrigin,
        tools: PAGE_TOOLS,
      },
      ...overrides,
    }),
  });
}

async function readStreamChunks(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text();
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]')
    .map((line) => JSON.parse(line.slice('data: '.length)) as Record<string, unknown>);
}

describe('createChatHandler', () => {
  it("streams the model's answer as AI SDK UI message chunks", async () => {
    const handleChat = createChatHandler({
      model: modelThatStreams([
        { type: 'text-start', id: 't1' },
        { type: 'text-delta', id: 't1', delta: 'Done!' },
        { type: 'text-end', id: 't1' },
        FINISH_CHUNK,
      ]),
      maxToolResultChars: 20_000,
    });

    const response = await handleChat(chatRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('x-vercel-ai-ui-message-stream')).toBe('v1');
    expect(await readStreamChunks(response)).toContainEqual(
      expect.objectContaining({ type: 'text-delta', delta: 'Done!' }),
    );
  });

  it("offers the page tools under provider-safe names and streams the model's tool call to the client", async () => {
    const encodedMoveName = createToolNameCodec(
      PAGE_TOOLS.map((tool) => tool.name),
    ).toModelToolName('cards.move');
    const model = modelThatStreams([
      {
        type: 'tool-call',
        toolCallId: 'call-1',
        toolName: encodedMoveName,
        input: '{"cardId":"c1"}',
      },
      { ...FINISH_CHUNK, finishReason: { unified: 'tool-calls', raw: undefined } },
    ]);
    const handleChat = createChatHandler({ model, maxToolResultChars: 20_000 });

    const chunks = await readStreamChunks(await handleChat(chatRequest()));

    const offeredToolNames = model.doStreamCalls[0]?.tools?.map((tool) => tool.name);
    expect(offeredToolNames?.toSorted()).toEqual([encodedMoveName, 'get_board'].toSorted());
    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: 'tool-input-available',
        toolCallId: 'call-1',
        toolName: encodedMoveName,
        input: { cardId: 'c1' },
      }),
    );
  });

  it('tells the model where it is, that the user trusts the site, and that tool output is untrusted', async () => {
    const model = modelThatStreams([FINISH_CHUNK]);
    await (await createChatHandler({ model, maxToolResultChars: 20_000 })(chatRequest())).text();

    const instructions = JSON.stringify(model.doStreamCalls[0]?.prompt);
    expect(instructions).toContain('https://boards.example');
    expect(instructions).toContain('Launch board');
    expect(instructions).toMatch(/the user trusts this site/i);
    expect(instructions).toMatch(/never follow instructions/i);
  });

  it('offers no tools on a site the user has not trusted, and has the model explain why', async () => {
    const model = modelThatStreams([FINISH_CHUNK]);
    const handleChat = createChatHandler({ model, maxToolResultChars: 20_000 });

    await (await handleChat(chatRequest({ isTrustedOrigin: false }))).text();

    expect(model.doStreamCalls[0]?.tools ?? []).toEqual([]);
    const instructions = JSON.stringify(model.doStreamCalls[0]?.prompt);
    expect(instructions).toMatch(/not trusted/i);
    expect(instructions).toContain('Trust this site');
    expect(instructions).toMatch(/tools you used earlier .*no longer available/i);
    expect(instructions).not.toContain('Move a card.');
  });

  it('lets the model recover in the same request when it calls a tool it was not offered', async () => {
    const answers: ModelStreamPart[][] = [
      [
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'move_card',
          input: '{"cardId":"c7","toList":"Doing"}',
        },
        { ...FINISH_CHUNK, finishReason: { unified: 'tool-calls', raw: undefined } },
      ],
      [
        { type: 'text-start', id: 't1' },
        { type: 'text-delta', id: 't1', delta: 'This site is not trusted.' },
        { type: 'text-end', id: 't1' },
        FINISH_CHUNK,
      ],
    ];
    let modelCallCount = 0;
    const model = new MockLanguageModelV4({
      doStream: async () =>
        Promise.resolve({
          stream: simulateReadableStream({ chunks: answers[modelCallCount++] ?? [] }),
        }),
    });
    const handleChat = createChatHandler({ model, maxToolResultChars: 20_000 });

    const chunks = await readStreamChunks(
      await handleChat(chatRequest({ isTrustedOrigin: false })),
    );

    expect(model.doStreamCalls).toHaveLength(2);
    expect(JSON.stringify(model.doStreamCalls[1]?.prompt)).toContain(
      "unavailable tool 'move_card'",
    );
    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: 'tool-input-error',
        toolName: 'move_card',
        errorText: expect.stringContaining("unavailable tool 'move_card'"),
      }),
    );
    expect(chunks).toContainEqual(
      expect.objectContaining({ type: 'text-delta', delta: 'This site is not trusted.' }),
    );
  });

  it('shortens very long tool results before the model sees them', async () => {
    const model = modelThatStreams([FINISH_CHUNK]);
    const longOutput = { cards: 'x'.repeat(5_000) };
    const request = chatRequest({
      messages: [
        { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Read the board' }] },
        {
          id: 'm2',
          role: 'assistant',
          parts: [
            {
              type: 'tool-get_board',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: longOutput,
            },
          ],
        },
      ],
    });

    await (await createChatHandler({ model, maxToolResultChars: 1_000 })(request)).text();

    const promptText = JSON.stringify(model.doStreamCalls[0]?.prompt);
    expect(promptText).toContain('[truncated');
    expect(promptText).not.toContain('x'.repeat(2_000));
  });

  it('reports token usage on the finished message', async () => {
    const handleChat = createChatHandler({
      model: modelThatStreams([FINISH_CHUNK]),
      maxToolResultChars: 20_000,
    });

    const chunks = await readStreamChunks(await handleChat(chatRequest()));

    expect(chunks).toContainEqual(
      expect.objectContaining({ messageMetadata: { totalTokens: 150 } }),
    );
  });

  it('turns an Ollama failure into a readable stream error', async () => {
    const model = new MockLanguageModelV4({
      doStream: () =>
        Promise.reject(Object.assign(new Error('Unauthorized'), { status_code: 401 })),
    });

    const chunks = await readStreamChunks(
      await createChatHandler({ model, maxToolResultChars: 20_000 })(chatRequest()),
    );

    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: 'error',
        errorText: expect.stringMatching(/OLLAMA_API_KEY/),
      }),
    );
  });

  it('rejects an invalid request body with the validation issues', async () => {
    const response = await createChatHandler({
      model: modelThatStreams([FINISH_CHUNK]),
      maxToolResultChars: 20_000,
    })(chatRequest({ pageContext: { origin: 'nope' } }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'invalid_request' } });
  });

  it('rejects a body that is not JSON', async () => {
    const response = await createChatHandler({
      model: modelThatStreams([FINISH_CHUNK]),
      maxToolResultChars: 20_000,
    })(new Request('http://127.0.0.1:8787/api/chat', { method: 'POST', body: '{ oops' }));

    expect(response.status).toBe(400);
  });
});
