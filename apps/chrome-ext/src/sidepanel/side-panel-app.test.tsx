import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { askTheAgent, trustSiteButAskBeforeEveryTool } from '../test/chat-interactions';
import { BOARD_PAGE, installFakeAgentBackend } from '../test/fake-agent-backend';
import {
  type ActiveTabTools,
  type cancelToolInTab,
  loadActiveTabTools,
  loadToolsForTabId,
  runToolInTab,
} from './active-tab/active-tab-api';
import { SidePanelApp } from './side-panel-app';

vi.mock('./active-tab/active-tab-api', () => ({
  loadActiveTabTools: vi.fn<() => Promise<ActiveTabTools>>(),
  loadToolsForTabId: vi.fn<(tabId: number) => Promise<ActiveTabTools>>(),
  runToolInTab: vi.fn<typeof runToolInTab>(),
  cancelToolInTab: vi.fn<typeof cancelToolInTab>(),
}));

describe('SidePanelApp', () => {
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

  it('opens on the Tools view', async () => {
    render(<SidePanelApp />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Tools' })).toBeInTheDocument();
  });

  it('switches views from the navigation', async () => {
    const user = userEvent.setup();
    render(<SidePanelApp />);

    await user.click(await screen.findByRole('link', { name: 'Settings' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Chat' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Chat' })).toBeInTheDocument();
  });

  it('keeps the conversation, and a waiting approval, while you look at another view', async () => {
    await trustSiteButAskBeforeEveryTool(BOARD_PAGE.origin);
    installFakeAgentBackend();
    render(<SidePanelApp />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('link', { name: 'Chat' }));
    await askTheAgent('What is overdue?');
    await screen.findByRole('article', { name: 'Tool call get_board' });

    await user.click(screen.getByRole('link', { name: 'Tools' }));
    await screen.findByRole('heading', { level: 1, name: 'Tools' });
    await user.click(screen.getByRole('link', { name: /^Chat/ }));

    expect(await screen.findByText('What is overdue?')).toBeInTheDocument();
    const toolCard = await screen.findByRole('article', { name: 'Tool call get_board' });
    await user.click(within(toolCard).getByRole('button', { name: 'Allow' }));
    expect(await screen.findByText('One card is overdue: Fix bug.')).toBeInTheDocument();
  });

  it('shows on the Chat link how many tool calls wait for your approval', async () => {
    await trustSiteButAskBeforeEveryTool(BOARD_PAGE.origin);
    installFakeAgentBackend();
    render(<SidePanelApp />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('link', { name: 'Chat' }));
    await askTheAgent('What is overdue?');
    await screen.findByRole('article', { name: 'Tool call get_board' });

    await user.click(screen.getByRole('link', { name: 'Tools' }));
    expect(
      await screen.findByRole('link', { name: 'Chat, 1 waiting for approval' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^Chat/ }));
    const toolCard = await screen.findByRole('article', { name: 'Tool call get_board' });
    await user.click(within(toolCard).getByRole('button', { name: 'Allow' }));
    expect(await screen.findByRole('link', { name: 'Chat' })).toBeInTheDocument();
  });
});
