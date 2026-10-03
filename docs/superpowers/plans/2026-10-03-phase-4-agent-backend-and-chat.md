# Phase 4 Agent Backend + Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An agent that chats in the side panel and uses the active page's WebMCP tools: the BFF (Hono + AI SDK 7 + Ollama Cloud) reasons and streams; the side panel runs the tools in the page behind the approval rules.

**Architecture:** The BFF exposes `GET /api/health` and `POST /api/chat`. Chat requests carry the UI messages plus the page context (origin, trust, normalized tools). The BFF re-validates the request, maps every page tool to an AI SDK client-side tool (no `execute`) under codec-safe names, calls `streamText` against Ollama Cloud and streams AI SDK UI messages back. The side panel's `useChat` decodes each tool call, applies `decideToolApproval`, runs the tool through the content script, and returns the output with `addToolOutput`. A capped number of automatic round trips continues the conversation.

**Tech Stack:** Hono 4.13.12 · @hono/node-server 2.1.3 · ai 7.0.127 · @ai-sdk/react 4.0.130 · ai-sdk-ollama 4.4.0 · zod 4.6.5 · tsdown (build) · tsx (dev).

**Spec:** [2026-10-03-webmcp-monorepo.md](2026-10-03-webmcp-monorepo.md) (Phase 4, §3 BFF and Ollama, §7 env)

## Global Constraints

- `OLLAMA_API_KEY` lives only in `apps/chrome-ext-bff/.env` (gitignored) and is never logged or returned.
- `AI_MODEL` must be one of the 6 free-tier models unless `AI_ALLOW_ANY_MODEL=true`.
- The BFF listens on `127.0.0.1` only and accepts browser requests only from `chrome-extension://dmnphemkaphmemfkmonbngjofhmbenck` (configurable).
- Never force tool use; never call the real model from automated tests (use the AI SDK mock model).
- Error responses use `@repo/agent-protocol`'s `createApiErrorBody` codes.

## Review Focus

1. **A page with hostile tool names or descriptions.** The BFF re-applies the protocol limits and the codec, so a name can't collide with or impersonate another tool.
2. **The tool set changes between turns** (`open_board`). Every request re-sends the current tools; a call to a vanished tool comes back as a structured error, not a hang.
3. **Runaway loops.** At most 10 automatic round trips per user prompt; after that the panel asks the user to continue.
4. **Ollama Cloud failures** (bad key, free credits used up, busy, offline). Each maps to a distinct, actionable error code and message in the panel.
5. **The user switches tabs mid-conversation.** Tool calls run only in the tab/origin the chat is bound to; a different origin is refused.

---

### Task 1: BFF scaffold — config, app factory, origin guard, health
- Files: `apps/chrome-ext-bff/{package.json,tsconfig.json,tsdown.config.ts,vitest.config.ts,.env.example}`, `src/config/{bff-config.ts,bff-config.test.ts,free-tier-models.ts}`, `src/http/{create-app.ts,create-app.test.ts,origin-guard.ts,api-errors.ts}`, `src/main.ts`.
- Config tests: defaults; a missing key fails with a clear message; a non-free model is rejected unless explicitly allowed; the error output never contains the key.
- App tests (`app.request`): a wrong `Origin` → 403 `forbidden_origin`; the extension origin → passes, with CORS headers for it only; `OPTIONS` preflight; health → `{ status, model, freeTier, ollama }` with the upstream check injected.

### Task 2: Ollama Cloud client, upstream health and error mapping
- Files: `src/ollama/{create-ollama-model.ts,check-ollama-health.ts,map-upstream-error.ts}` + tests.
- `checkOllamaHealth({ baseUrl, apiKey, model, fetch })` → `{ reachable, authOk, modelListed }` via `GET {base}/api/tags`, cached 60 s.
- `mapUpstreamError(error)` → `{ status, code }`: 401/403 → 502 `upstream_auth`; 402 or a usage-limit message → 402 `usage_exhausted`; 429/503 → 503 `upstream_busy`; network → 503 `upstream_unreachable`.

### Task 3: `POST /api/chat`
- Files: `src/chat/{build-page-tools.ts,system-prompt.ts,handle-chat.ts}` + tests.
- Validate the body with `chatRequestBodySchema`, re-normalize tools, build the codec, map them to `tool({ description, inputSchema: jsonSchema(schema) })` keyed by model name, stream with `instructions` = the system prompt, `abortSignal` = the request signal.
- Tests with `MockLanguageModelV4`: text streams back as a UI message stream; a model tool call arrives as a client tool part with the encoded name; invalid body → 400 with issues; oversize body → 413; the system prompt carries the origin, the trust state and the "tool output is untrusted" rule; upstream failures → mapped error.

### Task 4: Live spike against Ollama Cloud (needs the user's key)
- `pnpm --filter chrome-ext-bff smoke`: one real streamed request with one client tool against `gpt-oss:20b`. It verifies text and tool-call streaming, and prints tokens used. Blocked until `OLLAMA_API_KEY` is set.

### Task 5: Side panel chat
- Files: `apps/chrome-ext/src/sidepanel/views/chat/*`, `src/chat/{chat-transport.ts,run-agent-tool-call.ts}` + tests.
- `useChat` with `DefaultChatTransport({ api: bffUrl + '/api/chat', prepareSendMessagesRequest })` that re-lists the bound tab's tools before every request and attaches `pageContext`.
- `onToolCall`: decode → find the tool → `decideToolApproval` → run automatically, or show an approval card (Allow / Deny) → `runToolInTab` → `addToolOutput` (errors as `output-error`).
- Round-trip cap 10; Stop aborts the stream and in-flight tools; the chat is bound to one tab/origin, with a "new chat for this tab" action on mismatch.
- Tests cover the approval matrix flows, the cap, the origin binding and rendering of text/tool/approval parts.

### Task 6: Docs + end-to-end demo
- `apps/chrome-ext-bff/README.md`, root README quick start, the demo walkthrough. Live end-to-end run (needs the key, the flag and the unpacked extension).
