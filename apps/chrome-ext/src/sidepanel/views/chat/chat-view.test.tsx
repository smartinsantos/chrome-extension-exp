import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setOriginTrust } from '../../../settings/extension-settings';
import {
  type ActiveTabTools,
  type cancelToolInTab,
  loadActiveTabTools,
  loadToolsForTabId,
  runToolInTab,
} from '../../active-tab/active-tab-api';
import { ChatView } from './chat-view';

vi.mock('../../active-tab/active-tab-api', () => ({
  loadActiveTabTools: vi.fn<() => Promise<ActiveTabTools>>(),
  loadToolsForTabId: vi.fn<(tabId: number) => Promise<ActiveTabTools>>(),
  runToolInTab: vi.fn<typeof runToolInTab>(),
  cancelToolInTab: vi.fn<typeof cancelToolInTab>(),
}));

const BOARD_PAGE: ActiveTabTools = {
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

interface ChatRequestBody {
  messages: {
    role: string;
    parts: { type: string; state?: string; output?: unknown; errorText?: string }[];
  }[];
  pageContext: { origin: string; isTrustedOrigin: boolean };
}

function installFakeBff() {
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

function renderChat() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ChatView />
    </QueryClientProvider>,
  );
}

async function askTheAgent(text: string) {
  const user = userEvent.setup();
  const messageField = await screen.findByRole('textbox', { name: 'Message to the agent' });
  await waitFor(() => expect(messageField).toBeEnabled());
  await user.type(messageField, text);
  await user.click(screen.getByRole('button', { name: 'Send' }));
  return user;
}

describe('ChatView', () => {
  beforeEach(() => {
    vi.mocked(loadActiveTabTools).mockResolvedValue(BOARD_PAGE);
    vi.mocked(loadToolsForTabId).mockResolvedValue(BOARD_PAGE);
    vi.mocked(runToolInTab)
      .mockReset()
      .mockResolvedValue({ status: 'ok', result: { cards: ['Fix bug'] } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks before running a tool on an untrusted site, runs it once allowed, and shows the answer', async () => {
    const { chatRequests } = installFakeBff();
    renderChat();

    const user = await askTheAgent('What is overdue?');

    const toolCard = await screen.findByRole('article', { name: 'Tool call get_board' });
    expect(within(toolCard).getByText('Needs your approval')).toBeInTheDocument();
    expect(runToolInTab).not.toHaveBeenCalled();

    await user.click(within(toolCard).getByRole('button', { name: 'Allow' }));

    expect(await screen.findByText('One card is overdue: Fix bug.')).toBeInTheDocument();
    expect(runToolInTab).toHaveBeenCalledWith(7, 'get_board', { overdue: true }, 'call-1');
    expect(chatRequests[0]?.pageContext).toMatchObject({
      origin: 'https://boards.example',
      isTrustedOrigin: false,
    });
    expect(JSON.stringify(chatRequests[1]?.messages)).toContain('"output":{"cards":["Fix bug"]}');
    expect(await screen.findByText('321 tokens')).toBeInTheDocument();
  });

  it('tells the agent when the user denies a tool call, without running it', async () => {
    const { chatRequests } = installFakeBff();
    renderChat();

    const user = await askTheAgent('What is overdue?');
    const toolCard = await screen.findByRole('article', { name: 'Tool call get_board' });
    await user.click(within(toolCard).getByRole('button', { name: 'Deny' }));

    await waitFor(() => expect(chatRequests).toHaveLength(2));
    expect(runToolInTab).not.toHaveBeenCalled();
    expect(JSON.stringify(chatRequests[1]?.messages)).toContain('The user declined this action');
  });

  it('runs read-only tools on a trusted site without asking', async () => {
    await setOriginTrust('https://boards.example', true);
    installFakeBff();
    renderChat();

    await askTheAgent('What is overdue?');

    expect(await screen.findByText('One card is overdue: Fix bug.')).toBeInTheDocument();
    expect(screen.queryByText('Needs your approval')).not.toBeInTheDocument();
    expect(runToolInTab).toHaveBeenCalledOnce();
  });

  it('explains how to start the agent backend when it is not running', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    renderChat();

    expect(await screen.findByText(/pnpm --filter chrome-ext-bff dev/)).toBeInTheDocument();
  });
});
