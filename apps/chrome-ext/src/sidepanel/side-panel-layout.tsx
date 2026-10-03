import { TooltipProvider } from '@repo/ui/components/tooltip';
import { Toaster } from '@repo/ui/components/toaster';
import { Link, Outlet } from '@tanstack/react-router';
import { MessagesSquare, Settings, Wrench } from 'lucide-react';

const NAVIGATION_ITEMS = [
  { to: '/tools', label: 'Tools', Icon: Wrench },
  { to: '/chat', label: 'Chat', Icon: MessagesSquare },
  { to: '/settings', label: 'Settings', Icon: Settings },
] as const;

export function SidePanelLayout() {
  return (
    <TooltipProvider>
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
            </Link>
          ))}
        </nav>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
