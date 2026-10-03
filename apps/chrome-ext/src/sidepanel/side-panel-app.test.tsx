import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SidePanelApp } from './side-panel-app';

describe('SidePanelApp', () => {
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
});
