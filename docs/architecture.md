# Architecture overview

This page explains how the pieces of WebMCP Lab fit together.

## The big idea

Each part of the system has one job, and secrets stay on the server.

| Part                        | Its one job                                                                    | Knows about                     |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------------- |
| **Web page** (web demo)     | Offers its actions as WebMCP tools and runs them when asked                    | Its own app; nothing about AI   |
| **Chrome extension**        | Finds the page's tools, asks you before risky actions, runs the tools          | The page's tools, your approval |
| **BFF** (agent backend)     | Talks to the AI model and decides _which_ tool to call next                    | The model and the API key       |
| **AI model** (Ollama Cloud) | Reads the conversation and the tool list, then answers or requests a tool call | Only what the BFF sends it      |
| **Server** (NestJS)         | Stores boards, lists and cards                                                 | The database                    |

## How one request flows

You ask the side panel: _"Move all urgent cards to Doing"_.

```mermaid
sequenceDiagram
  autonumber
  actor You
  participant Panel as Side panel
  participant Page as Web page
  participant BFF
  participant Model as AI model
  participant Server as NestJS server

  Panel->>Page: Which tools do you have?
  Page-->>Panel: get_board, move_card, …
  You->>Panel: "Move all urgent cards to Doing"
  Panel->>BFF: Conversation + the page's tools
  BFF->>Model: Same, as model-friendly tools
  Model-->>BFF: Call get_board(labels: urgent)
  BFF-->>Panel: Tool call (streamed)
  Panel->>Page: Run get_board
  Page->>Server: GraphQL query
  Server-->>Page: Cards
  Page-->>Panel: Result
  Panel->>BFF: Result, continue
  BFF->>Model: Conversation + result
  Model-->>BFF: Call move_card × 3
  BFF-->>Panel: Tool calls
  Panel->>You: Approve these moves?
  You->>Panel: Approve
  Panel->>Page: Run move_card × 3 (the board updates live)
  Panel->>BFF: Results, continue
  BFF->>Model: Conversation + results
  Model-->>BFF: "Moved 3 cards to Doing."
  BFF-->>Panel: Final answer + tokens used
```

Notice that **the model never touches the page directly**. It only _asks_ for tool calls, and the extension carries them out after the checks described below.

## Where everything runs

| Part             | Runs at                                 | Holds secrets?                     |
| ---------------- | --------------------------------------- | ---------------------------------- |
| NestJS server    | `localhost:4000`                        | No                                 |
| Web demo         | `localhost:5173` (forwards `/graphql`)  | No                                 |
| Agent backend    | `127.0.0.1:8787`, this machine only     | Yes: the Ollama API key, in `.env` |
| Chrome extension | Chrome's side panel, fixed extension id | No                                 |
| AI model         | [Ollama Cloud](https://ollama.com)      | n/a                                |

## Staying safe on any website

The extension works on any site that uses WebMCP, and any site can describe its tools however it likes. So everything a page sends is treated as untrusted:

- **Size limits.** A page can expose at most 64 tools, and descriptions and schemas have size caps. The full table is in the [agent-protocol README](../packages/agent-protocol/README.md#limits-for-untrusted-pages).
- **Trusted sites only.** The agent can only use the tools of sites you've marked as trusted. On any other site the model isn't shown the tools, the extension refuses any tool call, and the agent tells you the site isn't trusted.
- **Approval first.** On trusted sites, every tool call that changes something needs your click. Only tools the site marks read-only may run on their own, and only if you allow that in Settings.
- **One page per chat.** A chat stays with the tab it started on, so the agent can't act on a page you switched to.
- **Safe tool names.** Page tool names are converted into names every AI provider accepts, and converted back before running. See [how tool names are translated](../packages/agent-protocol/README.md#translating-tool-names-for-the-model).

## Shared packages ✅

```mermaid
flowchart TD
  tsconfig["@repo/tsconfig<br/>TypeScript settings"]
  protocol["@repo/agent-protocol<br/>extension ↔ BFF contract"]
  ui["@repo/ui<br/>design system"]

  tsconfig --> protocol
  tsconfig --> ui
  protocol -.-> ext[chrome-ext ✅]
  protocol -.-> bff[chrome-ext-bff ✅]
  ui -.-> ext
  ui -.-> web[web-demo ✅]
```

| Package                                              | Used by                | Read more                                                   |
| ---------------------------------------------------- | ---------------------- | ----------------------------------------------------------- |
| [`@repo/tsconfig`](../packages/tsconfig)             | Everything             | [Which preset to use](../packages/tsconfig/README.md)       |
| [`@repo/agent-protocol`](../packages/agent-protocol) | Extension and BFF      | [Contract and limits](../packages/agent-protocol/README.md) |
| [`@repo/ui`](../packages/ui)                         | Web demo and extension | [Using the design system](../packages/ui/README.md)         |

Shared packages ship their TypeScript source directly; there is no separate build step. Each app's bundler (Vite, or WXT for the extension) compiles the package code together with the app.

## Apps

| App                                          | Status | Read more                                                                         |
| -------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| [`web-server-demo`](../apps/web-server-demo) | ✅     | [Data model, API and errors](../apps/web-server-demo/README.md)                   |
| [`web-demo`](../apps/web-demo)               | ✅     | [The WebMCP tools it offers](../apps/web-demo/README.md#the-tools-agents-can-use) |
| [`chrome-ext`](../apps/chrome-ext)           | ✅     | [Install, trust model and permissions](../apps/chrome-ext/README.md)              |
| [`chrome-ext-bff`](../apps/chrome-ext-bff)   | ✅     | [Setup, API, models and errors](../apps/chrome-ext-bff/README.md)                 |

## Where to go next

- The [demo walkthrough](demo-walkthrough.md) lets you try every piece in 10 minutes.
- [Troubleshooting](troubleshooting.md) covers start-up errors and side-panel warnings.
- The [implementation plan](superpowers/plans/2026-10-03-webmcp-monorepo.md) explains every technology choice and the phased roadmap.
- The [WebMCP specification](https://webmachinelearning.github.io/webmcp/) and [Chrome's WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) describe the browser API itself.
