# WebMCP Lab

A hands-on playground for learning **WebMCP** and **agentic workflows**: web pages describe the actions they offer as _tools_, and an AI agent living in a Chrome side panel discovers those tools and uses them for you.

> **Status:** ✅ All four apps work: the board API, the web demo with WebMCP tools, the Chrome extension (tool inspector + agent chat) and the agent backend on free Ollama Cloud models (checked live with the [smoke test](apps/chrome-ext-bff/README.md#set-it-up)). Next: polish and experiments (see the [roadmap](#roadmap)).

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

| Piece                                                | What it does                                                           | Status   |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| [`packages/tsconfig`](packages/tsconfig)             | Shared TypeScript settings                                             | ✅ Ready |
| [`packages/agent-protocol`](packages/agent-protocol) | The contract between the extension and the BFF                         | ✅ Ready |
| [`packages/ui`](packages/ui)                         | Shared design system (shadcn/ui + Tailwind)                            | ✅ Ready |
| [`apps/web-server-demo`](apps/web-server-demo)       | NestJS GraphQL API that stores boards, lists and cards in SQLite       | ✅ Ready |
| [`apps/web-demo`](apps/web-demo)                     | A Trello-like board that exposes its actions as WebMCP tools           | ✅ Ready |
| [`apps/chrome-ext`](apps/chrome-ext)                 | Side-panel extension that finds and runs WebMCP tools on any site      | ✅ Ready |
| [`apps/chrome-ext-bff`](apps/chrome-ext-bff)         | Agent backend that talks to Ollama Cloud and streams to the side panel | ✅ Ready |

Want the bigger picture? Read the [architecture overview](docs/architecture.md).

## Getting started

### Prerequisites

| You need                                                                                           | Why                                                                 |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Node.js 24](https://nodejs.org) (with [nvm](https://github.com/nvm-sh/nvm): `nvm use`)            | Runs every app and tool                                             |
| [pnpm 12](https://pnpm.io) via [Corepack](https://nodejs.org/api/corepack.html): `corepack enable` | Installs the workspace; the exact version comes from `package.json` |
| Chrome 154+ with `chrome://flags/#enable-webmcp-testing` **Enabled**                               | WebMCP is still behind a flag                                       |
| A free [Ollama](https://ollama.com) account and API key                                            | The AI model the agent uses                                         |

### Run everything

```bash
nvm use && corepack enable                                     # every new terminal: nvm use
pnpm install
cp apps/chrome-ext-bff/.env.example apps/chrome-ext-bff/.env   # then paste your OLLAMA_API_KEY
pnpm --filter chrome-ext-bff smoke                             # optional: checks key, model and tool calls
pnpm dev                                                       # API :4000, web demo :5173, agent :8787, extension build
```

Then load the extension: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick `apps/chrome-ext/dist/chrome-mv3-dev`. Open <http://localhost:5173> and click the extension's icon.

The [demo walkthrough](docs/demo-walkthrough.md) shows what to try next. If something doesn't start, see [troubleshooting](docs/troubleshooting.md).

| `pnpm dev` starts                                           | Where                                 |
| ----------------------------------------------------------- | ------------------------------------- |
| [NestJS GraphQL server](apps/web-server-demo)               | <http://localhost:4000/graphql>       |
| [Web demo](apps/web-demo)                                   | <http://localhost:5173>               |
| [Agent backend](apps/chrome-ext-bff)                        | <http://127.0.0.1:8787/api/health>    |
| [Extension build](apps/chrome-ext), rebuilt on every change | `apps/chrome-ext/dist/chrome-mv3-dev` |

Only want the board, without the extension and the AI? `pnpm dev:web` starts just the server and the web demo, with no API key needed.

## Everyday commands

| Command           | What it does                                                                           |
| ----------------- | -------------------------------------------------------------------------------------- |
| `pnpm dev`        | Starts every app in watch mode                                                         |
| `pnpm dev:web`    | Starts only the server and the web demo                                                |
| `pnpm build`      | Builds every app (the extension lands in `apps/chrome-ext/dist/chrome-mv3`)            |
| `pnpm check`      | Lint, format check, type check and tests: run it before committing                     |
| `pnpm test`       | Runs every test in the workspace                                                       |
| `pnpm test:watch` | Re-runs tests as you edit                                                              |
| `pnpm lint`       | Lints with [oxlint](https://oxc.rs/docs/guide/usage/linter), type-aware, warnings fail |
| `pnpm format`     | Formats everything with [Prettier](https://prettier.io)                                |
| `pnpm typecheck`  | Type-checks every package                                                              |
| `pnpm codegen`    | Regenerates the web demo's GraphQL types                                               |

Need just one package? Use pnpm's filter, for example `pnpm --filter @repo/agent-protocol test`, or Vitest's project flag: `pnpm test --project ui`.

## How the repository is organized

```text
.
├── apps/                 # runnable applications
│   ├── chrome-ext/       # side-panel extension (WXT + React)
│   ├── chrome-ext-bff/   # agent backend (Hono + AI SDK)
│   ├── web-demo/         # Trello-like board with WebMCP tools (React + Vite)
│   └── web-server-demo/  # GraphQL API (NestJS + SQLite)
├── packages/             # shared code used by the apps
│   ├── agent-protocol/   # extension ↔ backend contract
│   ├── tsconfig/         # TypeScript presets
│   └── ui/               # design system
└── docs/                 # architecture, walkthrough, troubleshooting and plans
```

| Doc                                            | Read it to…                                   |
| ---------------------------------------------- | --------------------------------------------- |
| [Architecture overview](docs/architecture.md)  | See how the pieces fit and where secrets live |
| [Demo walkthrough](docs/demo-walkthrough.md)   | Try the whole thing in 10 minutes             |
| [Troubleshooting](docs/troubleshooting.md)     | Fix a start-up error or a side-panel warning  |
| [Implementation plans](docs/superpowers/plans) | Follow the reasoning behind each phase        |

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
| 4     | Agent backend on Ollama Cloud, with chat in the side panel    | ✅     |
| 5     | Polish, docs and experiments                                  | 🔜     |

The full reasoning, technology choices and task breakdown live in the [implementation plan](docs/superpowers/plans/2026-10-03-webmcp-monorepo.md).
