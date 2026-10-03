import { Badge } from '@repo/ui/components/badge';
import { Switch } from '@repo/ui/components/switch';
import { Globe } from 'lucide-react';

import { useOriginTrust } from '../../active-tab/use-origin-trust';

export function ActiveTabHeader({ origin, toolCount }: { origin: string; toolCount: number }) {
  const { isTrusted, setTrusted } = useOriginTrust(origin);
  return (
    <header className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">{origin}</span>
        <Badge variant={isTrusted ? 'secondary' : 'outline'}>
          {isTrusted ? 'Trusted' : 'Untrusted'}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span>
          {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
        </span>
        <span className="flex items-center gap-2">
          <Switch checked={isTrusted} onCheckedChange={setTrusted} aria-label="Trust this site" />
          <span aria-hidden>Trust this site</span>
        </span>
      </div>
    </header>
  );
}
