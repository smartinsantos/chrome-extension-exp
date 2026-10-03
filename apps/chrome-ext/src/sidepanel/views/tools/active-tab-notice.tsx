import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ActiveTabTools } from '../../active-tab/active-tab-api';

type NoticeState = Exclude<ActiveTabTools, { kind: 'ready' }>;

const NOTICE_TEXT: Record<NoticeState['kind'], { title: string; body: ReactNode }> = {
  'no-tab': { title: 'No tab to inspect', body: 'There is no active tab in this window.' },
  'restricted-page': {
    title: "Extensions can't run on this page",
    body: 'Browser pages such as chrome:// and the Chrome Web Store are off limits. Open a website to see its tools.',
  },
  'content-script-missing': {
    title: 'Reload the page to connect',
    body: "This tab was open before the extension started, so it isn't connected yet.",
  },
  'webmcp-unavailable': {
    title: 'WebMCP is not available',
    body: (
      <>
        This browser has no WebMCP support. Use Chrome 154 or newer, enable{' '}
        <code className="rounded bg-muted px-1">chrome://flags/#enable-webmcp-testing</code>, then
        relaunch Chrome.
      </>
    ),
  },
};

export function ActiveTabNotice({ state }: { state: NoticeState }) {
  const notice = NOTICE_TEXT[state.kind];
  return (
    <div className="space-y-1 rounded-lg border border-dashed p-4 text-muted-foreground">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <CircleAlert className="size-4" aria-hidden />
        {notice.title}
      </p>
      <p>{notice.body}</p>
    </div>
  );
}
