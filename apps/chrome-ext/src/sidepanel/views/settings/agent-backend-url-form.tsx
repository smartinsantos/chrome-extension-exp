import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { type FormEvent, useId, useState } from 'react';

function isWebUrl(value: string): boolean {
  return URL.canParse(value) && ['http:', 'https:'].includes(new URL(value).protocol);
}

interface AgentBackendUrlFormProps {
  savedUrl: string;
  onSave: (bffUrl: string) => void;
}

export function AgentBackendUrlForm({ savedUrl, onSave }: AgentBackendUrlFormProps) {
  const fieldId = useId();
  const [url, setUrl] = useState(savedUrl);
  const trimmedUrl = url.trim();
  const isValid = isWebUrl(trimmedUrl);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (isValid) onSave(trimmedUrl.replace(/\/+$/, ''));
  }

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <label htmlFor={fieldId} className="text-xs font-medium">
        Agent backend URL
      </label>
      <div className="flex gap-2">
        <Input
          id={fieldId}
          value={url}
          inputMode="url"
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={!isValid || trimmedUrl === savedUrl}>
          Save
        </Button>
      </div>
      {!isValid && (
        <p className="text-xs text-destructive">Enter an http:// or https:// address.</p>
      )}
    </form>
  );
}
