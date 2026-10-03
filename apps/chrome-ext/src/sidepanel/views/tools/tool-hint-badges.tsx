import type { ToolAnnotations } from '@repo/agent-protocol';
import { Badge } from '@repo/ui/components/badge';

export function ToolHintBadges({ annotations }: { annotations: ToolAnnotations }) {
  return (
    <span className="flex flex-wrap gap-1">
      {annotations.readOnlyHint && <Badge variant="secondary">Read-only</Badge>}
      {annotations.consequentialHint && <Badge variant="destructive">Consequential</Badge>}
      {annotations.untrustedContentHint && <Badge variant="outline">Untrusted content</Badge>}
    </span>
  );
}
