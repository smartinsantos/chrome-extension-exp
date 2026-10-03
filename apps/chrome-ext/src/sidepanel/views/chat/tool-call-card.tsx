import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { getToolName } from 'ai';
import { Check, LoaderCircle, ShieldQuestion, X } from 'lucide-react';

import type { ToolApprovalRequest } from '../../../agent-chat/run-agent-tool-call';

interface ToolCallCardProps {
  part: ToolUIPart | DynamicToolUIPart;
  pendingApproval:
    { request: ToolApprovalRequest; decide: (isApproved: boolean) => void } | undefined;
}

/** One tool call by the agent: what it wants to do, the user's decision, and the outcome. */
export function ToolCallCard({ part, pendingApproval }: ToolCallCardProps) {
  const toolName = pendingApproval?.request.toolName ?? getToolName(part);
  return (
    <article
      aria-label={`Tool call ${toolName}`}
      className="space-y-2 rounded-lg border p-2.5 text-xs"
    >
      <header className="flex items-center gap-2">
        <code className="font-medium">{toolName}</code>
        <ToolCallStatus part={part} isAwaitingApproval={pendingApproval !== undefined} />
      </header>
      {part.input !== undefined && (
        <pre className="max-h-32 overflow-auto rounded bg-muted p-2">
          {JSON.stringify(part.input, null, 2)}
        </pre>
      )}
      {pendingApproval !== undefined && (
        <div className="space-y-2 rounded-md bg-amber-500/10 p-2">
          <p>
            The agent wants to run this on <strong>{pendingApproval.request.origin}</strong>.
          </p>
          <div className="flex gap-2">
            <Button size="xs" onClick={() => pendingApproval.decide(true)}>
              <Check aria-hidden />
              Allow
            </Button>
            <Button size="xs" variant="outline" onClick={() => pendingApproval.decide(false)}>
              <X aria-hidden />
              Deny
            </Button>
          </div>
        </div>
      )}
      {part.state === 'output-available' && (
        <details>
          <summary className="cursor-pointer text-muted-foreground">Result</summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2">
            {JSON.stringify(part.output, null, 2)}
          </pre>
        </details>
      )}
      {part.state === 'output-error' && <p className="text-destructive">{part.errorText}</p>}
    </article>
  );
}

function ToolCallStatus({
  part,
  isAwaitingApproval,
}: {
  part: ToolCallCardProps['part'];
  isAwaitingApproval: boolean;
}) {
  if (isAwaitingApproval) {
    return (
      <Badge variant="outline">
        <ShieldQuestion aria-hidden />
        Needs your approval
      </Badge>
    );
  }
  switch (part.state) {
    case 'output-available':
      return <Badge variant="secondary">Done</Badge>;
    case 'output-error':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return (
        <Badge variant="outline">
          <LoaderCircle className="animate-spin" aria-hidden />
          Running
        </Badge>
      );
  }
}
