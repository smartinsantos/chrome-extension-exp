# Phase 3 Chrome Extension Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A WXT + React side-panel extension that discovers WebMCP tools on the active tab (any site), shows them, and runs them by hand behind a per-origin trust model. No LLM yet.

**Architecture:** An isolated-world content script on every page talks to `document.modelContext` through a pure, unit-tested `webmcp-host` module. It answers typed messages from the side panel (`list-tools`, `execute-tool`) and pushes `tools-changed` on `toolchange`. The background service worker opens the side panel, injects the content script into tabs that were already open, collects frame origins and keeps a per-tab tool-count badge. The side panel (React, hash router, TanStack Query, `@repo/ui`) shows Tools / Chat / Settings views.

**Tech Stack:** WXT 0.21.4 · @wxt-dev/module-react 1.2.2 · React 19.3 · TanStack Router (code-based, hash history) + Query · Tailwind 4 / @repo/ui · zod · @repo/agent-protocol · Vitest 5 with WXT's fake browser.

**Spec:** [2026-10-03-webmcp-monorepo.md](2026-10-03-webmcp-monorepo.md) (§1.2, Phase 3, §6, §7)

## Global Constraints

- Manifest V3; permissions `sidePanel`, `storage`, `scripting`, `webNavigation`; `host_permissions: ['<all_urls>']`; a fixed manifest `key` (stable extension ID).
- Use only `document.modelContext` (never `navigator.modelContext`); feature-detect it.
- `executeTool`: try the object form first, and fall back to the JSON string form on a `Failed to parse input` error.
- Every tool list a page sends goes through `normalizeToolDescriptors` from `@repo/agent-protocol` (untrusted-input limits).
- No secrets in the extension.

## Review Focus

1. **The page has no `document.modelContext`** (flag off, old Chrome, `chrome://` pages). The panel shows a clear diagnostic, never an empty list without explanation.
2. **Tools change while the panel is open** (SPA navigation, `open_board`). The list refreshes from `toolchange` and tab updates without a manual reload.
3. **A tool hangs or the page navigates mid-execution.** A timeout (30 s) and abort produce a structured error; nothing waits forever.
4. **A hostile page lies in `readOnlyHint`.** Untrusted origins always need approval, whatever the annotations say.
5. **The content script isn't in a tab that was open before install/update.** The background injects it, and messaging errors become a readable "reload the page" hint.

---

### Task 1: WXT scaffold, manifest and side panel shell

- Files: `apps/chrome-ext/{package.json,wxt.config.ts,tsconfig.json,vitest.config.ts,README.md}`, `src/entrypoints/background.ts`, `src/entrypoints/sidepanel/{index.html,main.tsx}`, `src/sidepanel/{app.tsx,router.tsx,routes/*}`, `src/styles/sidepanel.css`, `extension-key/README` (how the key was made).
- Generate an RSA key pair. The public key goes into the manifest `key`; derive the extension ID from it and document it. The private key is not committed.
- Tests: the router renders the Tools view by default, and the nav switches views.
- Verify: `wxt build` succeeds, and the generated `manifest.json` contains the permissions, `side_panel.default_path`, `key` and the content script entry.

### Task 2: Typed message protocol

- Files: `src/messaging/{extension-messages.ts,extension-messages.test.ts}`.
- Produces: zod schemas and types for `ListToolsRequest`, `ExecuteToolRequest`, `ToolsChangedEvent`, and the responses `ToolListResponse` (`{ status: 'ok', origin, tools, rejectedTools }` / `{ status: 'unsupported', reason }`) and `ToolExecutionResponse` (`{ status: 'ok', result: unknown }` / `{ status: 'error', code, message }`); a `parseExtensionMessage(raw)` guard.

### Task 3: `webmcp-host` (the content-script brain)

- Files: `src/webmcp-host/{webmcp-host.ts,webmcp-host.test.ts}`.
- Produces: `createWebMcpHost({ modelContext, origin, timeoutMs })` with `listTools()`, `executeTool(name, args, signal)` and `onToolsChanged(listener, debounceMs = 100)`, plus `detectModelContext(document)`.
- Tests (fake `modelContext`): list → normalized descriptors + rejected tools; object-form execute; string-form fallback; unknown tool → `TOOL_NOT_FOUND`; a JSON string result is parsed back to a value; a non-JSON result is returned as text; timeout → `TIMEOUT`; abort → `ABORTED`; a page error → `TOOL_FAILED` with its message; `toolchange` bursts are debounced into one notification; missing API → `unsupported`.

### Task 4: Content script + background service worker

- Files: `src/entrypoints/webmcp.content.ts`, `src/entrypoints/background.ts`, `src/background/{inject-into-open-tabs.ts,tool-count-badge.ts}`.
- Content script (`<all_urls>`, `document_start`, top frame) wires `webmcp-host` to runtime messages and pushes `tools-changed`.
- Background: `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`; inject into open tabs on install/update; badge = tool count per tab.
- Tests: badge text formatting and the update policy (fake browser).

### Task 5: Origin trust and the approval decision

- Files: `src/trust/{origin-trust.ts,origin-trust.test.ts,trusted-origins-store.ts}`.
- Produces: `decideToolApproval({ annotations, isTrustedOrigin, autoRunReadOnlyOnTrustedOrigins }) → 'run-automatically' | 'ask-user'`; a trusted-origins store in `storage.local` (seeded with `http://localhost:5173`).
- Tests: the full matrix, including a lying `readOnlyHint` on an untrusted origin → ask, and `consequentialHint` → always ask.

### Task 6: Side panel: active-tab tools, inspector and settings

- Files: `src/sidepanel/{active-tab/*,tools/*,settings/*,diagnostics/*}`, `src/messaging/send-to-tab.ts`.
- The Tools view: origin chip + trust toggle; tools grouped with annotation badges; schema viewer; JSON argument editor (validated as JSON); Execute → result/error panel; rejected tools listed with reasons; the unsupported-page / flag-off / content-script-missing states.
- Settings: BFF URL (for Phase 4), auto-run read-only on trusted origins, the trusted-origins list (remove), diagnostics (Chrome version, `modelContext` present on the active tab).
- Tests: rendering for each state with a fake messaging layer; Execute sends the parsed args; invalid JSON blocks Execute.

### Task 7: README, docs and live verification

- `apps/chrome-ext/README.md` (load unpacked, permissions and why, trust model, message flow diagram); update the root README and architecture doc.
- **Live check (needs the user's flag + Load unpacked):** the panel lists 2 tools on web-demo `/`, which becomes 7 after opening a board; running `move_card` from the panel moves a card on screen.
