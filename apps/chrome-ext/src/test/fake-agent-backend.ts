import { vi } from 'vitest';

import type { ActiveTabTools } from '../sidepanel/active-tab/active-tab-api';

export const BOARD_PAGE: ActiveTabTools = {
  kind: 'ready',
  tabId: 7,
  url: 'https://boards.example/b/1',
  title: 'Launch board',
  origin: 'https://boards.example',
  tools: [
    {
      name: 'get_board',
      description: 'Read the board',
      inputSchema: { type: 'object' },
      annotations: { readOnlyHint: true, consequentialHint: false, untrustedContentHint: false },
      origin: 'https://boards.example',
    },
  ],
  rejectedTools: [],
};

/** A UI message stream response, exactly as the BFF sends it. */
function uiMessageStream(chunks: object[]): Response {
  const body = [
    ...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`),
    'data: [DONE]\n\n',
  ].join('');
  return new Response(body, {
    headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
  });
}

const TOOL_CALL_ANSWER = [
  { type: 'start' },
  { type: 'start-step' },
  { type: 'tool-input-start', toolCallId: 'call-1', toolName: 'get_board' },
  {
    type: 'tool-input-available',
    toolCallId: 'call-1',
    toolName: 'get_board',
    input: { overdue: true },
  },
  { type: 'finish-step' },
  { type: 'finish' },
];

const FINAL_TEXT_ANSWER = [
  { type: 'start' },
  { type: 'start-step' },
  { type: 'text-start', id: 't1' },
  { type: 'text-delta', id: 't1', delta: 'One card is overdue: Fix bug.' },
  { type: 'text-end', id: 't1' },
  { type: 'finish-step' },
  { type: 'finish', messageMetadata: { totalTokens: 321 } },
];

export interface ChatRequestBody {
  messages: {
    role: string;
    parts: { type: string; state?: string; output?: unknown; errorText?: string }[];
  }[];
  pageContext: { origin: string; isTrustedOrigin: boolean };
}

/**
 * Replaces `fetch` with a healthy agent backend: the first chat request gets a `get_board` tool
 * call, and once a tool result is in the conversation it answers with text and token usage.
 */
export function installFakeAgentBackend() {
  const chatRequests: ChatRequestBody[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.endsWith('/api/health')) {
      return Response.json({
        status: 'ok',
        model: 'gpt-oss:120b',
        freeTier: true,
        ollama: { reachable: true, authOk: true, modelListed: true },
      });
    }
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as ChatRequestBody;
    chatRequests.push(body);
    const hasToolResult = body.messages.some((message) =>
      message.parts.some(
        (part) => part.state === 'output-available' || part.state === 'output-error',
      ),
    );
    return uiMessageStream(hasToolResult ? FINAL_TEXT_ANSWER : TOOL_CALL_ANSWER);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { chatRequests };
}
