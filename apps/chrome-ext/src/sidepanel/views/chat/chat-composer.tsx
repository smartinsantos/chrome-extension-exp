import { Button } from '@repo/ui/components/button';
import { Textarea } from '@repo/ui/components/textarea';
import { Send, Square } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useState } from 'react';

interface ChatComposerProps {
  isBusy: boolean;
  isDisabled: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function ChatComposer({ isBusy, isDisabled, onSend, onStop }: ChatComposerProps) {
  const [text, setText] = useState('');

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText === '' || isBusy || isDisabled) return;
    onSend(trimmedText);
    setText('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t p-3">
      <Textarea
        aria-label="Message to the agent"
        placeholder="Ask the agent to do something on this page…"
        rows={2}
        value={text}
        disabled={isDisabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {isBusy ? (
        <Button type="button" size="icon" variant="outline" aria-label="Stop" onClick={onStop}>
          <Square aria-hidden />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          aria-label="Send"
          disabled={isDisabled || text.trim() === ''}
        >
          <Send aria-hidden />
        </Button>
      )}
    </form>
  );
}
