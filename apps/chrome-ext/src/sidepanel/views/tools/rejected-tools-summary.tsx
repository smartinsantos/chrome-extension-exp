import type { RejectedTool } from '@repo/agent-protocol';

const REJECTION_REASON_TEXT: Record<string, string> = {
  'invalid-shape': 'not a valid tool',
  'name-too-long': 'name is too long',
  'duplicate-name': 'another tool has the same name',
  'invalid-input-schema': 'input schema is not valid',
  'input-schema-too-large': 'input schema is too large',
  'input-schema-too-deep': 'input schema is nested too deeply',
  'over-tool-limit': 'the page offers too many tools',
};

/** Tools the page offered but the extension skipped, because pages are untrusted input. */
export function RejectedToolsSummary({
  rejectedTools,
}: {
  rejectedTools: readonly RejectedTool[];
}) {
  if (rejectedTools.length === 0) return null;
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">
        {rejectedTools.length} {rejectedTools.length === 1 ? 'tool was' : 'tools were'} skipped
      </summary>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {rejectedTools.map((rejectedTool, index) => (
          <li key={`${rejectedTool.name}-${index}`}>
            <code>{rejectedTool.name}</code>:{' '}
            {REJECTION_REASON_TEXT[rejectedTool.reason] ?? rejectedTool.reason}
          </li>
        ))}
      </ul>
    </details>
  );
}
