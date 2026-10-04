# chrome-ext

A Chrome extension that lives in the **side panel** and works with any website that offers [WebMCP](https://webmachinelearning.github.io/webmcp/) tools:

- it **finds** the tools the current page offers,
- shows what each one does and which ones claim to be safe,
- lets you **run** a tool by hand, exactly as an AI agent would,
- and lets an **AI agent** run them for you through a chat, asking first when it matters.

It's built with [WXT](https://wxt.dev), [React](https://react.dev), the [AI SDK](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) chat hooks and the shared [design system](../../packages/ui). The AI itself runs in the [agent backend](../chrome-ext-bff), so the extension never holds an API key.

## Try it

1. Use **Chrome 154 or newer** and enable WebMCP: open `chrome://flags/#enable-webmcp-testing`, set it to **Enabled**, and relaunch Chrome.
2. Build the extension:

   ```bash
   pnpm --filter chrome-ext build      # or `pnpm --filter chrome-ext dev` to rebuild on changes
   ```

3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose `apps/chrome-ext/dist/chrome-mv3`. With `dev`, choose `dist/chrome-mv3-dev`.
4. Open a page with WebMCP tools (for example the [web demo](../web-demo) at <http://localhost:5173>) and click the extension's toolbar icon. The side panel opens, and the badge on the icon shows how many tools the page offers.
5. For the **Chat** view, also start the [agent backend](../chrome-ext-bff/README.md#set-it-up). `pnpm dev` at the repository root starts everything at once.

The extension always has the same id, `dmnphemkaphmemfkmonbngjofhmbenck`, on every computer (see [Why the id never changes](#why-the-id-never-changes)).

## What you'll see

| View         | What it's for                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------- |
| **Tools**    | The current site, whether you trust it, its tools, and a form to run any tool with JSON arguments |
| **Chat**     | Ask the AI agent to do things on the page; approve or deny its tool calls; see the tokens used    |
| **Settings** | The agent backend's address, automatic runs for read-only tools, your trusted sites, diagnostics  |

When something is missing, the panel says why:

| Message                             | Meaning and fix                                                            |
| ----------------------------------- | -------------------------------------------------------------------------- |
| _WebMCP is not available_           | The browser has no WebMCP. Enable the flag above and relaunch Chrome.      |
| _Reload the page to connect_        | The tab was open before the extension loaded. Reload it.                   |
| _Extensions can't run on this page_ | Browser pages such as `chrome://` and the Chrome Web Store are off limits. |
| _The agent backend isn't running_   | Chat only. Start it with `pnpm --filter chrome-ext-bff dev`.               |

More fixes are in the [troubleshooting guide](../../docs/troubleshooting.md#in-the-side-panel).

## How the chat works

The chat sends your message and the page's tools to the agent backend. When the model asks for a tool, the side panel runs it in the page (asking you first when needed) and sends the result back, so the model can carry on.

```mermaid
sequenceDiagram
  actor You
  participant Panel as Side panel
  participant BFF as Agent backend
  participant Page as Page
  You->>Panel: "Move the urgent cards to Doing"
  Panel->>BFF: conversation + page tools
  BFF-->>Panel: tool call: move_card({ … })
  Panel->>You: Allow or Deny?
  You->>Panel: Allow
  Panel->>Page: executeTool(move_card)
  Page-->>Panel: result
  Panel->>BFF: conversation + result
  BFF-->>Panel: "Moved 2 cards." (+ tokens used)
```

A few rules keep it predictable:

| Rule                                             | Why                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| A chat stays with the tab and site it started on | Tools never run on a page you switched to by accident. **New chat** starts over.         |
| Tool names and inputs are checked before running | The page may have dropped the tool since the model saw it; inputs must be JSON objects   |
| At most 10 tool rounds per message               | A confused model can't loop forever. Send another message to let it keep going.          |
| **Stop** cancels everything                      | It ends the answer, denies waiting approvals and cancels tools still running in the page |
| Denying a tool tells the model not to retry it   | You stay in charge without arguing with the agent                                        |
| Untrusted sites' tools are off limits            | The agent explains the site isn't trusted instead of acting on it                        |

## How the pieces talk

```mermaid
sequenceDiagram
  participant Panel as Side panel
  participant Content as Content script (in the page)
  participant Page as Page (document.modelContext)
  participant Background as Background worker

  Panel->>Content: list tools
  Content->>Page: getTools()
  Page-->>Content: tools
  Content-->>Panel: checked tools + skipped ones
  Panel->>Content: run "move_card" with { … }
  Content->>Page: executeTool(…)
  Page-->>Content: result (JSON)
  Content-->>Panel: result, or a coded error
  Page-)Content: toolchange (a tool appeared or vanished)
  Content-)Panel: tools changed → refresh the list
  Content-)Background: tools changed → update the badge
```

| Part                                                | Runs in            | Job                                                                           |
| --------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| [Content script](src/entrypoints/webmcp.content.ts) | Every web page     | Talks to the page's WebMCP API and answers the side panel                     |
| [WebMCP host](src/webmcp-host/webmcp-host.ts)       | (inside the above) | Lists, runs and watches tools; handles timeouts, cancelling and Chrome quirks |
| [Background worker](src/entrypoints/background.ts)  | Extension          | Opens the side panel, connects already-open tabs, keeps the tool-count badge  |
| [Side panel](src/sidepanel)                         | Extension page     | Everything you see                                                            |
| [Agent chat](src/agent-chat)                        | Side panel         | Talks to the agent backend and runs the agent's tool calls safely             |
| [Trust rules](src/trust/decide-tool-approval.ts)    | Side panel         | Decides whether a tool call runs on its own, asks you first, or is refused    |
| [Messages](src/messaging/extension-messages.ts)     | Shared             | The exact shape of every message, checked on arrival                          |

## Staying safe on any website

Any site can offer tools and describe them however it likes, so the extension treats everything a page sends as **untrusted**:

- **Limits.** Tool lists, descriptions and schemas are capped and checked (see the [limits table](../../packages/agent-protocol/README.md#limits-for-untrusted-pages)). Anything the extension skips is listed with the reason.
- **Trust is yours to give.** Every site starts untrusted, except the local web demo. You can trust a site with **Trust this site** in the Tools view.
- **The agent only uses trusted sites' tools.** On an untrusted site the model isn't even shown the site's tools, and if it still asks for one, the extension refuses. The agent tells you the site isn't trusted and how to trust it. (You can still run any tool yourself from the Tools view.)
- **Labels are only believed on trusted sites.** A page can _claim_ a tool is read-only. On a site you trust, such a tool runs without asking if that's switched on in Settings. Everything else asks you first:

| The tool says… | Trusted site         | Untrusted site     |
| -------------- | -------------------- | ------------------ |
| read-only      | runs automatically\* | agent can't use it |
| changes data   | asks you             | agent can't use it |
| consequential  | asks you             | agent can't use it |

\* when "Run read-only tools on trusted sites without asking" is on.

The rule lives in [`decide-tool-approval.ts`](src/trust/decide-tool-approval.ts).

## Why these permissions?

| Permission      | Why it's needed                                                                        |
| --------------- | -------------------------------------------------------------------------------------- |
| `sidePanel`     | The whole UI lives in Chrome's side panel                                              |
| `storage`       | Saves your settings and trusted sites                                                  |
| `scripting`     | Connects tabs that were already open when the extension was installed                  |
| `webNavigation` | Resets the tool badge when a tab goes to a new page                                    |
| `<all_urls>`    | WebMCP tools can be on any website, so the content script must be able to run anywhere |

## Why the id never changes

Chrome normally derives an unpacked extension's id from its folder path, so it differs from machine to machine. The manifest includes a fixed public `key` (in [`wxt.config.ts`](wxt.config.ts)), which pins the id. The agent backend then allows requests from exactly one origin: `chrome-extension://dmnphemkaphmemfkmonbngjofhmbenck`.

The key was created like this. Only the public half is needed, so the private key isn't kept:

```bash
openssl genrsa -out private-key.pem 2048
openssl rsa -in private-key.pem -pubout -outform DER | base64     # → manifest "key"
```

## Scripts

| Command                          | What it does                                                 |
| -------------------------------- | ------------------------------------------------------------ |
| `pnpm --filter chrome-ext dev`   | Builds to `dist/chrome-mv3-dev` and rebuilds on every change |
| `pnpm --filter chrome-ext build` | Production build in `dist/chrome-mv3`                        |
| `pnpm --filter chrome-ext test`  | Unit and component tests (with WXT's fake browser)           |
| `pnpm --filter chrome-ext zip`   | Packs the build into a zip                                   |
