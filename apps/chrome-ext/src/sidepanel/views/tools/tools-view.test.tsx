import type { WebMcpToolDescriptor } from '@repo/agent-protocol';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isOriginTrusted } from '../../../settings/extension-settings';
import {
  type ActiveTabTools,
  type cancelToolInTab,
  loadActiveTabTools,
  runToolInTab,
} from '../../active-tab/active-tab-api';
import { ToolsView } from './tools-view';

vi.mock('../../active-tab/active-tab-api', () => ({
  loadActiveTabTools: vi.fn<() => Promise<ActiveTabTools>>(),
  runToolInTab: vi.fn<typeof runToolInTab>(),
  cancelToolInTab: vi.fn<typeof cancelToolInTab>(),
}));

const PAGE = {
  tabId: 9,
  url: 'https://boards.example/b/1',
  title: 'Boards',
  origin: 'https://boards.example',
};

function tool(name: string, overrides: Partial<WebMcpToolDescriptor> = {}): WebMcpToolDescriptor {
  return {
    name,
    description: `Description of ${name}`,
    inputSchema: { type: 'object', properties: { cardId: { type: 'string' } } },
    annotations: { readOnlyHint: false, consequentialHint: false, untrustedContentHint: false },
    origin: PAGE.origin,
    ...overrides,
  };
}

function showActiveTab(activeTabTools: ActiveTabTools) {
  vi.mocked(loadActiveTabTools).mockResolvedValue(activeTabTools);
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ToolsView />
    </QueryClientProvider>,
  );
}

describe('ToolsView', () => {
  beforeEach(() => {
    vi.mocked(runToolInTab).mockReset();
  });

  it('lists the page tools with their hints', async () => {
    showActiveTab({
      kind: 'ready',
      ...PAGE,
      tools: [
        tool('get_board', {
          annotations: {
            readOnlyHint: true,
            consequentialHint: false,
            untrustedContentHint: false,
          },
        }),
        tool('archive_card', {
          annotations: {
            readOnlyHint: false,
            consequentialHint: true,
            untrustedContentHint: false,
          },
        }),
      ],
      rejectedTools: [{ name: 'broken', reason: 'invalid-input-schema' }],
    });

    const toolList = await screen.findByRole('list', { name: 'Tools on this page' });
    expect(within(toolList).getByText('get_board')).toBeInTheDocument();
    expect(within(toolList).getByText('Read-only')).toBeInTheDocument();
    expect(within(toolList).getByText('Consequential')).toBeInTheDocument();
    expect(screen.getByText('https://boards.example')).toBeInTheDocument();
    expect(screen.getByText(/1 tool was skipped/i)).toBeInTheDocument();
  });

  it('runs a tool with the JSON arguments the user typed and shows the result', async () => {
    const user = userEvent.setup();
    vi.mocked(runToolInTab).mockResolvedValue({ status: 'ok', result: { moved: true } });
    showActiveTab({ kind: 'ready', ...PAGE, tools: [tool('move_card')], rejectedTools: [] });

    await user.click(await screen.findByRole('button', { name: /move_card/ }));
    const argumentsField = screen.getByRole('textbox', { name: 'Arguments (JSON)' });
    await user.clear(argumentsField);
    await user.type(argumentsField, '{{"cardId":"c1"}');
    await user.click(screen.getByRole('button', { name: 'Run tool' }));

    expect(runToolInTab).toHaveBeenCalledWith(9, 'move_card', { cardId: 'c1' }, expect.any(String));
    expect(await screen.findByLabelText('Result')).toHaveTextContent('"moved": true');
  });

  it('shows the error code and message when a tool fails', async () => {
    const user = userEvent.setup();
    vi.mocked(runToolInTab).mockResolvedValue({
      status: 'error',
      code: 'TIMEOUT',
      message: 'Too slow',
    });
    showActiveTab({ kind: 'ready', ...PAGE, tools: [tool('move_card')], rejectedTools: [] });

    await user.click(await screen.findByRole('button', { name: /move_card/ }));
    await user.click(screen.getByRole('button', { name: 'Run tool' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('TIMEOUT: Too slow');
  });

  it('refuses to run with arguments that are not a JSON object', async () => {
    const user = userEvent.setup();
    showActiveTab({ kind: 'ready', ...PAGE, tools: [tool('move_card')], rejectedTools: [] });

    await user.click(await screen.findByRole('button', { name: /move_card/ }));
    const argumentsField = screen.getByRole('textbox', { name: 'Arguments (JSON)' });
    await user.clear(argumentsField);
    await user.type(argumentsField, '[[1, 2');

    expect(screen.getByRole('button', { name: 'Run tool' })).toBeDisabled();
    expect(
      screen.getByText('Arguments must be a JSON object, like {"cardId": "abc"}.'),
    ).toBeInTheDocument();
  });

  it('lets the user trust the site', async () => {
    const user = userEvent.setup();
    showActiveTab({ kind: 'ready', ...PAGE, tools: [], rejectedTools: [] });

    await user.click(await screen.findByRole('switch', { name: 'Trust this site' }));

    await waitFor(async () => expect(await isOriginTrusted(PAGE.origin)).toBe(true));
  });

  it.each([
    [{ kind: 'webmcp-unavailable', ...PAGE } as const, /chrome:\/\/flags\/#enable-webmcp-testing/],
    [{ kind: 'content-script-missing', ...PAGE } as const, /Reload the page/],
    [
      { kind: 'restricted-page', ...PAGE, url: 'chrome://extensions' } as const,
      /can't run on this page/,
    ],
    [{ kind: 'no-tab' } as const, /No tab/],
  ])('explains the %o state', async (activeTabTools, explanation) => {
    showActiveTab(activeTabTools);

    expect(await screen.findByText(explanation)).toBeInTheDocument();
  });

  it('says so when a WebMCP page offers no tools', async () => {
    showActiveTab({ kind: 'ready', ...PAGE, tools: [], rejectedTools: [] });

    expect(
      await screen.findByText(/This page doesn't offer any tools right now/),
    ).toBeInTheDocument();
  });
});
