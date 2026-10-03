import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readExtensionSettings, setOriginTrust } from '../../../settings/extension-settings';
import { type ActiveTabTools, loadActiveTabTools } from '../../active-tab/active-tab-api';
import { SettingsView } from './settings-view';

vi.mock('../../active-tab/active-tab-api', () => ({
  loadActiveTabTools: vi.fn<() => Promise<ActiveTabTools>>(),
}));

function renderSettings() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SettingsView />
    </QueryClientProvider>,
  );
}

describe('SettingsView', () => {
  beforeEach(() => {
    vi.mocked(loadActiveTabTools).mockResolvedValue({
      kind: 'webmcp-unavailable',
      tabId: 1,
      url: 'https://example.com',
      title: '',
      origin: 'https://example.com',
    });
  });

  it('saves a new agent backend URL', async () => {
    const user = userEvent.setup();
    renderSettings();

    const urlField = await screen.findByRole('textbox', { name: 'Agent backend URL' });
    await waitFor(() => expect(urlField).toHaveValue('http://127.0.0.1:8787'));
    await user.clear(urlField);
    await user.type(urlField, 'http://127.0.0.1:9000');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () =>
      expect((await readExtensionSettings()).bffUrl).toBe('http://127.0.0.1:9000'),
    );
  });

  it('refuses a URL that is not http or https', async () => {
    const user = userEvent.setup();
    renderSettings();

    const urlField = await screen.findByRole('textbox', { name: 'Agent backend URL' });
    await user.clear(urlField);
    await user.type(urlField, 'ftp://somewhere');

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText('Enter an http:// or https:// address.')).toBeInTheDocument();
  });

  it('turns automatic read-only runs off', async () => {
    const user = userEvent.setup();
    renderSettings();

    const autoRunSwitch = await screen.findByRole('switch', {
      name: 'Run read-only tools on trusted sites without asking',
    });
    await waitFor(() => expect(autoRunSwitch).toBeChecked());
    await user.click(autoRunSwitch);

    await waitFor(async () =>
      expect((await readExtensionSettings()).autoRunReadOnlyOnTrustedOrigins).toBe(false),
    );
  });

  it('lists trusted sites and lets the user remove one', async () => {
    const user = userEvent.setup();
    await setOriginTrust('https://example.com', true);
    renderSettings();

    const trustedSites = await screen.findByRole('list', { name: 'Trusted sites' });
    await waitFor(() =>
      expect(within(trustedSites).getByText('https://example.com')).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Stop trusting https://example.com' }));

    await waitFor(async () =>
      expect((await readExtensionSettings()).trustedOrigins).toEqual(['http://localhost:5173']),
    );
  });

  it('reports whether the active tab has WebMCP', async () => {
    renderSettings();

    expect(await screen.findByText('Not available on the active tab')).toBeInTheDocument();
  });
});
