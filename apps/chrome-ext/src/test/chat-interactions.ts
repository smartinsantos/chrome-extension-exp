import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';

/** Types a message into the side panel chat once it's ready, and sends it. */
export async function askTheAgent(text: string) {
  const user = userEvent.setup();
  const messageField = await screen.findByRole('textbox', { name: 'Message to the agent' });
  await waitFor(() => expect(messageField).toBeEnabled());
  await user.type(messageField, text);
  await user.click(screen.getByRole('button', { name: 'Send' }));
  return user;
}
