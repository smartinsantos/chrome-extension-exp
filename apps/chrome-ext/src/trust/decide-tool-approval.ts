import type { ToolAnnotations } from '@repo/agent-protocol';

export type ToolApprovalDecision = 'run-automatically' | 'ask-user' | 'refuse';

interface ToolApprovalInput {
  annotations: ToolAnnotations;
  isTrustedOrigin: boolean;
  autoRunReadOnlyOnTrustedOrigins: boolean;
}

/**
 * Decides what happens to an agent's tool call. The agent never uses tools of a site the user
 * hasn't trusted. On a trusted site, a tool the site marks read-only runs automatically (if the
 * user enabled that); everything else waits for the user to click "Allow".
 */
export function decideToolApproval({
  annotations,
  isTrustedOrigin,
  autoRunReadOnlyOnTrustedOrigins,
}: ToolApprovalInput): ToolApprovalDecision {
  if (!isTrustedOrigin) return 'refuse';
  const isSafeToAutoRun =
    autoRunReadOnlyOnTrustedOrigins && annotations.readOnlyHint && !annotations.consequentialHint;
  return isSafeToAutoRun ? 'run-automatically' : 'ask-user';
}
