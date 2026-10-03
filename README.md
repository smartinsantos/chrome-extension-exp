# WebMCP Lab

A hands-on playground for learning **WebMCP** and **agentic workflows**: web pages describe the actions they offer as _tools_, and an AI agent living in a Chrome side panel discovers those tools and uses them for you.

> **Status:** 🏗️ Server, web demo (with WebMCP tools) and the Chrome extension's tool inspector are working. The AI agent backend is next. See the [roadmap](#roadmap).

## What is WebMCP, in one minute?

Today, AI agents use websites by "looking" at the screen and clicking buttons, which is slow and fragile. [WebMCP](https://webmachinelearning.github.io/webmcp/) lets a page say what it can do instead:

```js
document.modelContext.registerTool({
  name: 'move_card',
  description: 'Move a card to another list',
  inputSchema: {
    type: 'object',
    properties: { cardId: { type: 'string' }, toList: { type: 'string' } },
  },
  execute: ({ cardId, toList }) => moveCard(cardId, toList),
});
```

An agent in the browser can then list the page's tools and call them directly, while you watch and approve.

## What we're building

```mermaid
flowchart LR
  user((You)) --> panel["Chrome extension<br/>side panel"]
  panel <-->|chat + tool calls| bff["BFF<br/>(agent backend)"]
  bff <-->|prompts| llm["Ollama Cloud<br/>(free models)"]
  panel <-->|discovers & calls tools| page["Web demo<br/>Trello-like board"]
  page <-->|GraphQL| server["NestJS server<br/>+ SQLite"]
```

| Piece                                                | What it does                                                           | Status     |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| [`packages/tsconfig`](packages/tsconfig)             | Shared TypeScript settings                                             | ✅ Ready   |
| [`packages/agent-protocol`](packages/agent-protocol) | The contract between the extension and the BFF                         | ✅ Ready   |
| [`packages/ui`](packages/ui)                         | Shared design system (shadcn/ui + Tailwind)                            | ✅ Ready   |
| [`apps/web-server-demo`](apps/web-server-demo)       | NestJS GraphQL API that stores boards, lists and cards in SQLite       | ✅ Ready   |
| [`apps/web-demo`](apps/web-demo)                     | A Trello-like board that exposes its actions as WebMCP tools           | ✅ Ready   |
| [`apps/chrome-ext`](apps/chrome-ext)                 | Side-panel extension that finds and runs WebMCP tools on any site      | ✅ Ready   |
| `apps/chrome-ext-bff`                                | Agent backend that talks to Ollama Cloud and streams to the side panel | 🔜 Phase 4 |

Want the bigger picture? Read the [architecture overview](docs/architecture.md).

## Getting started

### Prerequisites

| You need                                                                                           | Why                                                                 |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Node.js 24](https://nodejs.org) (with [nvm](https://github.com/nvm-sh/nvm): `nvm use`)            | Runtime for every app and tool                                      |
| [pnpm 12](https://pnpm.io) via [Corepack](https://nodejs.org/api/corepack.html): `corepack enable` | Installs the workspace; the exact version comes from `package.json` |

To see the web demo's WebMCP tools you need **Chrome 154+** with `chrome://flags/#enable-webmcp-testing` enabled. Later phases also need an Ollama API key; those steps will be added here as the apps land.

### Install and check

```bash
nvm use            # switches to Node 24 (from .nvmrc)
corepack enable    # makes the pinned pnpm version available
pnpm install
pnpm check         # lint + format check + typecheck + tests
```

## Everyday commands

| Command           | What it does                                                                           |
| ----------------- | -------------------------------------------------------------------------------------- |
| `pnpm check`      | Everything below except formatting fixes: run it before committing                     |
| `pnpm test`       | Runs every test in the workspace                                                       |
| `pnpm test:watch` | Re-runs tests as you edit                                                              |
| `pnpm lint`       | Lints with [oxlint](https://oxc.rs/docs/guide/usage/linter), type-aware, warnings fail |
| `pnpm format`     | Formats everything with [Prettier](https://prettier.io)                                |
| `pnpm typecheck`  | Type-checks every package                                                              |

Need just one package? Use pnpm's filter, for example `pnpm --filter @repo/agent-protocol test`, or Vitest's project flag: `pnpm test --project ui`.

## How the repository is organized

```text
.
├── apps/         # runnable applications (arriving phase by phase)
├── packages/     # shared code used by the apps
│   ├── agent-protocol/
│   ├── tsconfig/
│   └── ui/
└── docs/         # architecture notes and implementation plans
```

| Tool                                                       | Role                                                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [pnpm workspaces](https://pnpm.io/workspaces)              | Links apps and packages together                                                                   |
| [pnpm catalog](https://pnpm.io/catalogs)                   | One place for shared dependency versions: [`pnpm-workspace.yaml`](pnpm-workspace.yaml)             |
| [Turborepo](https://turborepo.com)                         | Runs tasks across the workspace in the right order, with caching: [`turbo.json`](turbo.json)       |
| [Vitest](https://vitest.dev)                               | Tests for every app and package: [`vitest.config.ts`](vitest.config.ts)                            |
| [oxlint](https://oxc.rs) + [Prettier](https://prettier.io) | Linting and formatting: [`.oxlintrc.json`](.oxlintrc.json), [`.prettierrc.json`](.prettierrc.json) |

## Roadmap

| Phase | Goal                                                          | Status |
| ----- | ------------------------------------------------------------- | ------ |
| 0     | Workspace tooling                                             | ✅     |
| 1     | Shared packages                                               | ✅     |
| 2     | NestJS + SQLite server, Trello-like web demo, WebMCP tools    | ✅     |
| 3     | Chrome extension that discovers and runs WebMCP tools by hand | ✅     |
| 4     | Agent backend on Ollama Cloud, with chat in the side panel    | 🔜     |
| 5     | Polish, docs and experiments                                  | 🔜     |

The full reasoning, technology choices and task breakdown live in the [implementation plan](docs/superpowers/plans/2026-10-03-webmcp-monorepo.md).
