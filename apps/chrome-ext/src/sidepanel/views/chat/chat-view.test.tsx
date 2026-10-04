import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentChatSessionProvider } from '../../../agent-chat/agent-chat-session';
import { setOriginTrust } from '../../../settings/extension-settings';
import { askTheAgent, trustSiteButAskBeforeEveryTool } from '../../../test/chat-interactions';
import { BOARD_PAGE, installFakeAgentBackend } from '../../../test/fake-agent-backend';
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

function renderChat() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AgentChatSessionProvider>
        <ChatView />
      </AgentChatSessionProvider>
    </QueryClientProvider>,
  );
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

  it('asks before running a tool when automatic runs are off, runs it once allowed, and shows the answer', async () => {
    await trustSiteButAskBeforeEveryTool(BOARD_PAGE.origin);
    const { chatRequests } = installFakeAgentBackend();
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
      isTrustedOrigin: true,
    });
    expect(JSON.stringify(chatRequests[1]?.messages)).toContain('"output":{"cards":["Fix bug"]}');
    expect(await screen.findByText('321 tokens')).toBeInTheDocument();
  });

  it('tells the agent when the user denies a tool call, without running it', async () => {
    await trustSiteButAskBeforeEveryTool(BOARD_PAGE.origin);
    const { chatRequests } = installFakeAgentBackend();
    renderChat();

    const user = await askTheAgent('What is overdue?');
    const toolCard = await screen.findByRole('article', { name: 'Tool call get_board' });
    await user.click(within(toolCard).getByRole('button', { name: 'Deny' }));

    await waitFor(() => expect(chatRequests).toHaveLength(2));
    expect(runToolInTab).not.toHaveBeenCalled();
    expect(JSON.stringify(chatRequests[1]?.messages)).toContain('The user declined this action');
  });

  it('never runs or offers to run tools on a site the user has not trusted, and tells the agent why', async () => {
    const { chatRequests } = installFakeAgentBackend();
    renderChat();

    await askTheAgent('What is overdue?');

    await waitFor(() => expect(chatRequests).toHaveLength(2));
    expect(chatRequests[0]?.pageContext.isTrustedOrigin).toBe(false);
    expect(screen.queryByRole('button', { name: 'Allow' })).not.toBeInTheDocument();
    expect(runToolInTab).not.toHaveBeenCalled();
    expect(JSON.stringify(chatRequests[1]?.messages)).toContain('is not trusted');
  });

  it('runs read-only tools on a trusted site without asking', async () => {
    await setOriginTrust('https://boards.example', true);
    installFakeAgentBackend();
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
