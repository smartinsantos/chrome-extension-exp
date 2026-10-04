import { CircleAlert } from 'lucide-react';

export function QueryErrorMessage({ error }: { error: Error }) {
  return (
    <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
      <CircleAlert className="size-4" aria-hidden />
      {error.message}
    </p>
  );
}
