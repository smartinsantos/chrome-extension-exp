# Phase 2 Server + Web Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A NestJS + SQLite GraphQL server for a Trello-like board, a React web demo on top of it, and WebMCP tools in the web demo that drive the same real app actions.

**Architecture:** `apps/web-server-demo` is NestJS 12 (ESM) with code-first GraphQL (Apollo 5 on Express 5) and `node:sqlite` repositories behind services. `apps/web-demo` is Vite + React + TanStack Router (file-based) + TanStack Query. It uses typed GraphQL documents generated from the committed `schema.gql`, with no GraphQL client library. WebMCP tools are registered through one `useWebMcpTool` hook and call the same query/mutation functions the UI uses.

**Tech Stack:** NestJS 12.1.2 · @nestjs/graphql + apollo 14.0.3 · @apollo/server 5.5.1 · @as-integrations/express5 1.1.2 · graphql 16.14.2 · node:sqlite · Vite 8.3.2 · React 19.3 · TanStack Router 1.170 / Query 5.104 · GraphQL Codegen 7.4.3 + client-preset 6.2.0 · Pragmatic drag and drop 4.0.0 · webmcp-types 0.1.10 · zod 4.6.5.

**Spec:** [2026-10-03-webmcp-monorepo.md](2026-10-03-webmcp-monorepo.md) (Phase 2a/2b/2c, §3 server choices, §6 testing)

## Global Constraints

- Node ESM everywhere; the server uses `nodenext` (`.js` relative import specifiers) via `@repo/tsconfig/nestjs.json`.
- `graphql` stays on **16.x** (Apollo Server 5 peers `^16.11`).
- No ORM. Plain SQL with prepared statements on `node:sqlite` `DatabaseSync`; tests use `:memory:`.
- Code-first GraphQL with explicit `@Field(() => Type)` everywhere (no Nest CLI plugin).
- All versions go through the pnpm catalog.
- Names are explicit; comments only for non-obvious intent; docs are friendly and every reference is a link.
- Every GraphQL error carries `extensions.code` (`NOT_FOUND` or `BAD_USER_INPUT`) and a message an LLM can act on (for example, by listing the valid label names).

## Review Focus

1. **Moving a card within the same list** (up or down), to an empty list, to `TOP`/`BOTTOM`/an explicit index past the end. Positions must stay a gap-free `0..n-1` sequence in both lists.
2. **Archiving then restoring a card** whose original list has since changed. Restore appends it to the bottom of that list, and the remaining positions close the gap.
3. **Label names in any letter case, or unknown labels.** Matching is case-insensitive; unknown names produce `BAD_USER_INPUT` listing the board's labels; nothing is written.
4. **Due dates that are invalid (`2026-02-30`), malformed or set to `null`.** Invalid dates are rejected; `null` clears the date. "Overdue" uses the server's local today and ignores completed due dates.
5. **WebMCP tools registered while a board route is mounted, when the user navigates between boards.** The old board's tools are aborted before the new ones register; no duplicate-name registration errors.

---

### Task 1: Server scaffold, config and DI smoke test

**Files:** `apps/web-server-demo/{package.json,nest-cli.json,tsconfig.json,tsconfig.build.json,vitest.config.ts,vitest.config.e2e.ts,.env.example,README.md}`, `src/main.ts`, `src/app.module.ts`, `src/config/server-config.ts`, `src/config/server-config.spec.ts`, `src/health/health.resolver.ts`, `src/health/health.resolver.spec.ts`

**Interfaces:**

- Produces: `loadServerConfig(env: NodeJS.ProcessEnv): ServerConfig` with `{ port: number; databasePath: string; corsOrigin: string }` (defaults `4000`, `data/dev.sqlite`, `http://localhost:5173`); invalid values throw a readable error.
- Produces: `SERVER_CONFIG` injection token. GraphQL `Query.health: String!` returns `"ok"`.

- [ ] Step 1: failing tests. `server-config.spec.ts`: defaults; a custom port; a non-numeric port throws, naming the variable. `health.resolver.spec.ts` (the **DI smoke test**): `Test.createTestingModule({ providers: [HealthResolver, HealthService] })` resolves `HealthResolver` with `HealthService` injected through constructor metadata alone (no `@Inject`), and `health()` returns `'ok'`.
- [ ] Step 2: run, expect FAIL.
- [ ] Step 3: implement. If the DI test fails on missing metadata, add `unplugin-swc` + `@swc/core` to the Vitest config (spec §3 fallback) and record a ruling.
- [ ] Step 4: run, expect PASS; `pnpm --filter web-server-demo typecheck` passes.
- [ ] Step 5: commit `feat(web-server-demo): scaffold NestJS GraphQL server`.

### Task 2: SQLite database module, migrations and seed

**Files:** `src/database/{database.module.ts,database.tokens.ts,open-database.ts,run-migrations.ts,run-migrations.spec.ts,migrations/001-initial-schema.sql}`, `src/database/seed/{seed-demo-data.ts,seed-demo-data.spec.ts}`, `src/clock/{clock.ts,clock.module.ts}`

**Interfaces:**

- Produces: `openDatabase(databasePath: string): DatabaseSync` (foreign keys ON, WAL for files), `runMigrations(database, migrations: Migration[]): number` (returns the new `user_version`), `loadMigrationsFromDirectory(directory)`.
- Produces: `DATABASE` token (a `DatabaseSync` provider); `Clock` (`todayIsoDate(): string`, local `YYYY-MM-DD`) under the `CLOCK` token.
- Produces: `seedDemoData(database, clock): void`, which inserts only when there are no boards.
- Schema: `boards`, `board_lists`, `labels`, `cards` (with `due_date`, `is_due_complete`, `position`, `archived_at`), `card_labels`; FKs with `ON DELETE CASCADE`; unique `(board_id, name COLLATE NOCASE)` for labels.

- [ ] Step 1: failing tests. Migrations apply in order and set `user_version`; running twice applies nothing new; a failing migration rolls back entirely. Seed creates the "WebMCP Launch" (Backlog/To Do/Doing/Done, labels bug/feature/docs/urgent) and "Personal" boards; running the seed twice doesn't duplicate; some seeded cards are overdue relative to the injected clock.
- [ ] Steps 2–4: FAIL → implement → PASS.
- [ ] Step 5: commit `feat(web-server-demo): add SQLite database with migrations and demo seed`.

### Task 3: Boards, lists and labels (read side)

**Files:** `src/boards/{board.model.ts,board-list.model.ts,boards.repository.ts,boards.repository.spec.ts,boards.service.ts,boards.resolver.ts}`, `src/labels/{label.model.ts,label-color.enum.ts,labels.repository.ts}`, `src/common/graphql-errors.ts`

**Interfaces:**

- GraphQL: `Board { id name createdAt lists: [BoardList!]! labels: [Label!]! listCount: Int! cardCount: Int! }`, `BoardList { id name position cards: [Card!]! }`, `Label { id name color: LabelColor! }`.
- `Query.boards: [Board!]!`, `Query.board(id: ID!): Board` (null when missing).
- `Mutation.createBoard(input: { name }) : Board` (creates the default lists To Do/Doing/Done), `Mutation.createList(input: { boardId, name }): BoardList`.
- Produces: `notFoundError(entity, id)` and `badUserInputError(message, details?)` helpers.

- [ ] Step 1: failing repository tests against `:memory:`: lists come back ordered by position; label lookup by name is case-insensitive; counts ignore archived cards; creating a board creates its default lists.
- [ ] Steps 2–5: FAIL → implement (resolvers delegate to the service; `@ResolveField` for lists/labels/counts) → PASS → commit `feat(web-server-demo): add boards, lists and labels`.

### Task 4: Cards domain (repository + service)

**Files:** `src/cards/{card.model.ts,card.inputs.ts,cards.repository.ts,cards.repository.spec.ts,cards.service.ts,cards.service.spec.ts,iso-date.ts,iso-date.spec.ts}`

**Interfaces:**

- `Card { id title description dueDate isDueComplete isOverdue labels listId boardId position archivedAt createdAt updatedAt }`
- `CardsService`: `createCard(input)`, `updateCard(id, input)`, `moveCard(id, { toListId, position?: 'TOP'|'BOTTOM', index?: number })`, `archiveCard(id)`, `restoreCard(id)`, `searchCards(boardId, filter)` with `filter: { text?, labelNames?, listId?, isOverdue?, includeArchived? }`.
- `isValidIsoDate(value: string): boolean`.

- [ ] Step 1: failing tests covering every Review Focus 1–4 case, plus: text search matches title and description case-insensitively; `labelNames` replace the whole set; `updatedAt` changes on every write; an unknown card/list → `NOT_FOUND`; moving to a list on another board → `BAD_USER_INPUT`.
- [ ] Steps 2–5: FAIL → implement (each multi-statement write in a transaction) → PASS → commit `feat(web-server-demo): add cards domain with positions, labels and archive`.

### Task 5: Cards GraphQL API, schema file and live API verification

**Files:** `src/cards/cards.resolver.ts`, `src/generate-schema.ts`, `schema.gql`, `test/board-workflow.e2e-spec.ts`, `README.md`

- [ ] Step 1: failing e2e test (supertest, `:memory:` database, fixed clock): create a card → search it → move it → update its labels → archive → restore; plus error codes for unknown ids and labels.
- [ ] Steps 2–4: FAIL → implement resolvers + `schema` script (`GraphQLSchemaFactory`, no server) → PASS.
- [ ] Step 5: **Live check:** start the server, then call it with `curl` for health, the boards query, `createCard`, `moveCard` and the not-found error. Expected: JSON matches the e2e expectations.
- [ ] Step 6: README (what it is, schema overview, a mermaid ER diagram, how to run, example queries). Commit `feat(web-server-demo): expose cards GraphQL API`.

### Task 6: Web demo scaffold (router, query, GraphQL codegen)

**Files:** `apps/web-demo/{package.json,index.html,vite.config.ts,tsconfig.json,vitest.config.ts,codegen.ts,README.md}`, `src/main.tsx`, `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/styles/app.css`, `src/graphql/execute-graphql.ts`, `src/graphql/execute-graphql.test.ts`, `src/gql/*` (generated)

**Interfaces:**

- Produces: `executeGraphql<TResult, TVariables>(document: TypedDocumentString<TResult, TVariables>, variables?: TVariables): Promise<TResult>`; GraphQL errors throw `GraphqlRequestError { code, message }`.

- [ ] Step 1: failing tests for `executeGraphql` (mocked `fetch`): posts the query and variables to `/graphql`; returns `data`; throws `GraphqlRequestError` with the first error's code on `errors`; throws on a non-2xx status.
- [ ] Steps 2–5: FAIL → implement (Vite proxy `/graphql` → `:4000`) → PASS → commit `feat(web-demo): scaffold Vite app with router, query and typed GraphQL`.

### Task 7: Board UI (picker, lists, cards, composer, card dialog, move menu, archive + undo)

**Files:** `src/features/boards/api/{board-queries.ts,card-mutations.ts}`, `src/features/boards/components/*`, `src/routes/boards.$boardId.tsx`, tests next to the components.

- [ ] Step 1: failing component tests (mocking `executeGraphql`): board columns render in position order with card tiles (labels, due badge, overdue style); the composer creates a card in its list; the move menu calls `moveCard` with the right variables; archiving shows an Undo toast that calls `restoreCard`; an optimistic move rolls back when the mutation fails.
- [ ] Steps 2–5: FAIL → implement → PASS → commit `feat(web-demo): add Trello-like board UI`.

### Task 8: Drag and drop + browser verification

- [ ] Drag-and-drop between and within lists with Pragmatic drag and drop, calling the same `moveCard` mutation as the menu.
- [ ] **Browser check:** run the server and the web demo; in Chrome open a board, then create, edit, drag, move through the menu, archive and undo; reload to confirm everything persisted. Commit `feat(web-demo): drag and drop cards between lists`.

### Task 9: `useWebMcpTool` hook

**Files:** `src/webmcp/{use-webmcp-tool.ts,use-webmcp-tool.test.tsx,webmcp-tool-definition.ts,model-context.ts}`

**Interfaces:**

- Produces: `useWebMcpTool<TInput>(definition: { name, title?, description, inputSchema, annotations?, parseInput: (raw: unknown) => TInput, execute: (input: TInput) => Promise<unknown> })`. Registers on mount, aborts on unmount, keeps the latest `execute` without re-registering, and returns `{ error }` for invalid input (no throw).
- Produces: `getModelContext(): ModelContext | undefined` (feature detection).

- [ ] Steps 1–5: failing tests with a fake `document.modelContext` (registration options carry a signal; unmount aborts it; re-render doesn't re-register; invalid input returns a structured error; no `modelContext` is a no-op) → implement → PASS → commit `feat(web-demo): add useWebMcpTool registration hook`.

### Task 10: Global and board-scoped WebMCP tools + live WebMCP verification

**Files:** `src/webmcp/tools/{list-boards.ts,open-board.ts,get-board.ts,create-card.ts,update-card.ts,move-card.ts,archive-card.ts}` with tests, `src/webmcp/{global-webmcp-tools.tsx,board-webmcp-tools.tsx}`

- [ ] Steps 1–4: failing tests per tool (zod input parsing; name-or-id resolution for boards and lists; GraphQL variables; compact results; structured errors) → implement → PASS.
- [ ] Step 5: **Live check in Chrome** (WebMCP flag on): `document.modelContext.getTools()` shows 2 tools on `/` and 7 on a board; `executeTool(move_card)` moves a card on screen. Commit `feat(web-demo): expose board actions as WebMCP tools`.
- [ ] Step 6: web-demo README (the tool table, a diagram of how tools map to app actions, how to add a tool) and an update to the root README and architecture doc.
