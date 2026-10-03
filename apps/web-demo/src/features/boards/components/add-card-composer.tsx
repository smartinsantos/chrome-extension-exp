import { Button } from '@repo/ui/components/button';
import { Textarea } from '@repo/ui/components/textarea';
import { Plus } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useState } from 'react';

interface AddCardComposerProps {
  listName: string;
  isSaving: boolean;
  onAddCard: (title: string) => Promise<unknown>;
}

export function AddCardComposer({ listName, isSaving, onAddCard }: AddCardComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');

  async function submitCard(event?: FormEvent) {
    event?.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle === '') return;
    await onAddCard(trimmedTitle);
    setTitle('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) void submitCard(event);
    if (event.key === 'Escape') setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground"
        aria-label={`Add a card to ${listName}`}
        onClick={() => setIsOpen(true)}
      >
        <Plus aria-hidden />
        Add a card
      </Button>
    );
  }

  return (
    <form onSubmit={(event) => void submitCard(event)} className="space-y-2">
      <Textarea
        aria-label="Card title"
        placeholder="What needs doing?"
        value={title}
        autoFocus
        rows={2}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSaving || title.trim() === ''}>
          Add card
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
