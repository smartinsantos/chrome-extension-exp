import { Toaster } from '@repo/ui/components/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ExecuteGraphqlModule from '../../../graphql/execute-graphql';
import { GraphqlRequestError } from '../../../graphql/execute-graphql';
import { BOARD_ID, DOING_LIST_ID, TO_DO_LIST_ID } from '../test-support/board-fixtures';
import { installFakeBoardServer } from '../test-support/fake-board-server';
import { BoardView } from './board-view';

vi.mock('../../../graphql/execute-graphql', async (importOriginal) => ({
  ...(await importOriginal<typeof ExecuteGraphqlModule>()),
  executeGraphql: vi.fn<typeof ExecuteGraphqlModule.executeGraphql>(),
}));

function renderBoard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <BoardView boardId={BOARD_ID} />
      <Toaster />
    </QueryClientProvider>,
  );
}

function cardTitlesIn(listName: string): string[] {
  const column = screen.getByRole('region', { name: listName });
  return within(column)
    .queryAllByRole('article')
    .map((card) => card.getAttribute('aria-label') ?? '');
}

async function chooseCardAction(cardTitle: string, actionName: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: `Actions for ${cardTitle}` }));
  await user.click(await screen.findByRole('menuitem', { name: actionName }));
}

describe('BoardView', () => {
  let fakeServer: ReturnType<typeof installFakeBoardServer>;

  beforeEach(() => {
    fakeServer = installFakeBoardServer();
  });

  it('shows the lists in board order with their cards, labels and due dates', async () => {
    renderBoard();

    const headings = await screen.findAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['To Do', 'Doing', 'Done']);
    expect(cardTitlesIn('To Do')).toEqual(['Write docs', 'Fix bug']);

    const overdueCard = screen.getByRole('article', { name: 'Fix bug' });
    expect(within(overdueCard).getByText('bug')).toBeInTheDocument();
    expect(within(overdueCard).getByText(/overdue/i)).toBeInTheDocument();
  });

  it('adds a card to the list where the composer was used', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: 'Add a card to To Do' }));
    await user.type(screen.getByRole('textbox', { name: 'Card title' }), 'Record the demo');
    await user.click(screen.getByRole('button', { name: 'Add card' }));

    expect(fakeServer.callsTo('CreateCard')).toEqual([
      { input: { listId: TO_DO_LIST_ID, title: 'Record the demo' } },
    ]);
    await waitFor(() => expect(cardTitlesIn('To Do')).toContain('Record the demo'));
  });

  it('moves a card from the menu, showing it in the new list right away', async () => {
    fakeServer.answer('MoveCard', () => new Promise(() => {}));
    renderBoard();
    await screen.findByRole('article', { name: 'Write docs' });

    await chooseCardAction('Write docs', 'Move to Doing');

    expect(fakeServer.callsTo('MoveCard')).toEqual([
      { cardId: 'card-docs', input: { toListId: DOING_LIST_ID, position: 'BOTTOM' } },
    ]);
    await waitFor(() => expect(cardTitlesIn('Doing')).toEqual(['Ship it', 'Write docs']));
  });

  it('puts the card back and explains why when a move fails', async () => {
    fakeServer.answer('MoveCard', () => {
      throw new GraphqlRequestError('BAD_USER_INPUT', 'Archived cards cannot be moved.');
    });
    renderBoard();
    await screen.findByRole('article', { name: 'Write docs' });

    await chooseCardAction('Write docs', 'Move to Doing');

    expect(await screen.findByText('Archived cards cannot be moved.')).toBeInTheDocument();
    expect(cardTitlesIn('To Do')).toEqual(['Write docs', 'Fix bug']);
    expect(cardTitlesIn('Doing')).toEqual(['Ship it']);
  });

  it('archives a card and lets the user undo it', async () => {
    const user = userEvent.setup();
    renderBoard();
    await screen.findByRole('article', { name: 'Fix bug' });

    await chooseCardAction('Fix bug', 'Archive');

    await waitFor(() => expect(cardTitlesIn('To Do')).toEqual(['Write docs']));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(fakeServer.callsTo('RestoreCard')).toEqual([{ cardId: 'card-bug' }]);
    await waitFor(() => expect(cardTitlesIn('To Do')).toEqual(['Write docs', 'Fix bug']));
  });

  it('edits a card in the details dialog', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: 'Open Write docs' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit card' });
    const titleField = within(dialog).getByRole('textbox', { name: 'Title' });
    await user.clear(titleField);
    await user.type(titleField, 'Write the docs');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(fakeServer.callsTo('UpdateCard')[0]).toMatchObject({
      cardId: 'card-docs',
      input: { title: 'Write the docs' },
    });
    await waitFor(() => expect(cardTitlesIn('To Do')).toContain('Write the docs'));
  });
});
