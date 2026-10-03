import { defineContentScript } from 'wxt/utils/define-content-script';

import { startWebMcpBridge } from '../content/webmcp-bridge';
import { detectModelContext } from '../webmcp-host/webmcp-host';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    startWebMcpBridge({
      modelContext: detectModelContext(document),
      origin: location.origin,
      ownWindow: window,
    });
  },
});
