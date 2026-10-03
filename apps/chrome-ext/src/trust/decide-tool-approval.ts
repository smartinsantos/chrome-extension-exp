import type { ToolAnnotations } from '@repo/agent-protocol';

export type ToolApprovalDecision = 'run-automatically' | 'ask-user';

interface ToolApprovalInput {
  annotations: ToolAnnotations;
  isTrustedOrigin: boolean;
  autoRunReadOnlyOnTrustedOrigins: boolean;
}

/**
 * Decides whether an agent's tool call may run without the user clicking "Allow".
 * Annotations are claims made by the website, so they only count on sites the user trusts:
 * a read-only tool runs automatically there (if the user enabled that); everything else asks.
 */
export function decideToolApproval({
  annotations,
  isTrustedOrigin,
  autoRunReadOnlyOnTrustedOrigins,
}: ToolApprovalInput): ToolApprovalDecision {
  const isSafeToAutoRun =
    isTrustedOrigin &&
    autoRunReadOnlyOnTrustedOrigins &&
    annotations.readOnlyHint &&
    !annotations.consequentialHint;
  return isSafeToAutoRun ? 'run-automatically' : 'ask-user';
}
