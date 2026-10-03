import type { QueryClient } from '@tanstack/react-query';
import {
  createHashHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';

import { SidePanelLayout } from './side-panel-layout';
import { ChatView } from './views/chat-view';
import { SettingsView } from './views/settings-view';
import { ToolsView } from './views/tools-view';

interface SidePanelRouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<SidePanelRouterContext>()({
  component: SidePanelLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/tools' });
  },
});

const toolsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tools',
  component: ToolsView,
});
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat',
  component: ChatView,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsView,
});

const routeTree = rootRoute.addChildren([indexRoute, toolsRoute, chatRoute, settingsRoute]);

/** The side panel is a single extension page, so routes live in the URL hash (#/tools). */
export function createSidePanelRouter(queryClient: QueryClient) {
  return createRouter({ routeTree, history: createHashHistory(), context: { queryClient } });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createSidePanelRouter>;
  }
}
