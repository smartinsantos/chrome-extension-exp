import { Toaster } from '@repo/ui/components/toaster';
import { TooltipProvider } from '@repo/ui/components/tooltip';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { KanbanSquare } from 'lucide-react';

import type { AppRouterContext } from '../router';
import { GlobalWebMcpTools } from '../webmcp/global-webmcp-tools';

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-col bg-muted/40">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <KanbanSquare className="size-5 text-primary" aria-hidden />
            Boards
          </Link>
          <span className="text-sm text-muted-foreground">WebMCP Lab demo</span>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
      <Toaster />
      <GlobalWebMcpTools />
      {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </TooltipProvider>
  );
}
