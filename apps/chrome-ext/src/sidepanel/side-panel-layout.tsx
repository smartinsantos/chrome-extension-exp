import { TooltipProvider } from '@repo/ui/components/tooltip';
import { Toaster } from '@repo/ui/components/toaster';
import { Link, Outlet } from '@tanstack/react-router';
import { MessagesSquare, Settings, Wrench } from 'lucide-react';

import { AgentChatSessionProvider, useAgentChatSession } from '../agent-chat/agent-chat-session';

const NAVIGATION_ITEMS = [
  { to: '/tools', label: 'Tools', Icon: Wrench },
  { to: '/chat', label: 'Chat', Icon: MessagesSquare },
  { to: '/settings', label: 'Settings', Icon: Settings },
] as const;

export function SidePanelLayout() {
  return (
    <TooltipProvider>
      <AgentChatSessionProvider>
        <div className="flex h-svh flex-col bg-background text-sm">
          <nav aria-label="Views" className="flex shrink-0 gap-1 border-b px-2 py-1.5">
            {NAVIGATION_ITEMS.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: 'bg-muted text-foreground font-medium' }}
              >
                <Icon className="size-4" aria-hidden />
                {label}
                {to === '/chat' && <WaitingApprovalsBadge />}
              </Link>
            ))}
          </nav>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </AgentChatSessionProvider>
      <Toaster />
    </TooltipProvider>
  );
}

/** The chat keeps working while another view is open, so approval requests must stay visible. */
function WaitingApprovalsBadge() {
  const waitingApprovalCount = useAgentChatSession().pendingApprovals.size;
  if (waitingApprovalCount === 0) return null;
  return (
    <span className="rounded-full bg-amber-500 px-1.5 text-xs leading-5 font-medium text-white">
      <span aria-hidden>{waitingApprovalCount}</span>
      <span className="sr-only">, {waitingApprovalCount} waiting for approval</span>
    </span>
  );
}
