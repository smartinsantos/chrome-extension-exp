import { createFileRoute } from '@tanstack/react-router';

import { BoardSummaryList } from '../features/boards/components/board-summary-list';

export const Route = createFileRoute('/')({
  component: BoardsPage,
});

function BoardsPage() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your boards</h1>
      <BoardSummaryList />
    </section>
  );
}
