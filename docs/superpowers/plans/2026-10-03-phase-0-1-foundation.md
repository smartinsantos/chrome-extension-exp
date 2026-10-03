# Phase 0–1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working pnpm and Turborepo workspace with lint, format, typecheck and test pipelines, plus the three shared packages (`@repo/tsconfig`, `@repo/agent-protocol`, `@repo/ui`).

**Architecture:** Source-only internal packages that consuming bundlers compile. The root holds the tooling config (oxlint, Prettier, Vitest projects, Turbo). `@repo/agent-protocol` is pure TypeScript + zod with no runtime dependencies beyond zod.

**Tech Stack:** Node 24 · pnpm 12.8.1 · Turborepo 2.11.7 · TypeScript 6.0.3 · oxlint 1.86.0 (+ oxlint-tsgolint 7.0.2003) · Prettier 3.9.9 · Vitest 5.0.3 · zod 4.6.5 · React 19.3.0 · Tailwind 4.3.3 · shadcn 4.21.1.

**Spec:** [2026-10-03-webmcp-monorepo.md](2026-10-03-webmcp-monorepo.md) (sections 2, 3, 4 Phase 0 and 1, 6, 7)

## Global Constraints

- Node `>=24.15` (`.nvmrc` = `24`); pnpm `12.8.1` pinned through the `packageManager` field.
- Every shared dependency version lives in the pnpm `catalog:`, with exact pins.
- TypeScript **6.0.3** (not 7.x: `@nestjs/graphql@14` peers `^5.5 || ^6`).
- Lint with `oxlint --type-aware`; format with Prettier. No ESLint.
- Internal packages are source-only (`exports` point at `.ts`) and are type-checked with `tsc --noEmit`.
- Names are explicit and descriptive; comments only where intent isn't obvious.
- Docs are plain-language, use tables/bullets/mermaid where helpful, and every reference is a navigable link.

## Review Focus

1. **Two different WebMCP tool names that sanitize to the same provider-safe name** (e.g. `cards.move` and `cards_move`). Each must get a distinct model-facing name, and both must decode back correctly.
2. **The tool-name codec gets inputs in a different order on the extension and on the BFF.** Both sides must produce identical mappings.
3. **`inputSchema` arrives as a JSON string, as invalid JSON, as a non-object, or not at all.** Normalization yields a valid object schema or a typed rejection; it never throws.
4. **A hostile page sends 500 tools, 100 KB descriptions or deeply nested schemas.** Limits truncate or reject deterministically, and every rejection is reported.
5. **A tool name is empty, whitespace-only or over 64 characters.** The codec still produces a valid, unique model name, or validation rejects the name with a clear reason.

---

### Task 1: Workspace tooling and `@repo/tsconfig`

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.oxlintrc.json`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, `tsconfig.json` (root, for config files only)
- Create: `packages/tsconfig/package.json`, `packages/tsconfig/{base,bundler,react,nestjs}.json`, `packages/tsconfig/README.md`

**Interfaces:**

- Produces: presets `@repo/tsconfig/base.json` (strict core), `@repo/tsconfig/bundler.json` (code compiled by a bundler: `module: preserve`, `moduleResolution: bundler`, `noEmit`), `@repo/tsconfig/react.json` (bundler + JSX + DOM libs), `@repo/tsconfig/nestjs.json` (Node ESM with `nodenext` + decorators).
- Produces: root scripts `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `test`, `test:watch`, `build`, `dev`, `codegen`, `check`.

- [ ] **Step 1:** Write the root config files. The catalog holds every version from spec §3; the `turbo.json` tasks are `build`, `typecheck`, `codegen`, `schema` and `dev` (persistent, no cache).
- [ ] **Step 2:** Write the `@repo/tsconfig` presets and its README (a table of presets, when to use each, an example `extends`).
- [ ] **Step 3:** Run `pnpm install`.
      Expected: completes; no unapproved build-script warnings left after `pnpm approve-builds` (if any are prompted).
- [ ] **Step 4:** Run `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`.
      Expected: all exit 0 (tests pass with no test files thanks to `passWithNoTests`).
- [ ] **Step 5:** Commit: `chore: bootstrap pnpm + turborepo workspace tooling`.

### Task 2: `@repo/agent-protocol` tool-name codec

**Files:**

- Create: `packages/agent-protocol/{package.json,tsconfig.json,vitest.config.ts,README.md}`
- Create: `packages/agent-protocol/src/tool-names/{tool-name-codec.ts,tool-name-codec.test.ts,stable-hash.ts,stable-hash.test.ts}`
- Create: `packages/agent-protocol/src/index.ts`

**Interfaces:**

- Produces: `createToolNameCodec(webToolNames: readonly string[]): ToolNameCodec`
  - `ToolNameCodec.toModelToolName(webToolName: string): string` (throws `UnknownToolNameError` for names not in the set)
  - `ToolNameCodec.toWebToolName(modelToolName: string): string | undefined`
  - `MODEL_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/`
- Produces: `stableHash(text: string): string` (FNV-1a 32-bit, base36, 7 chars, zero-padded)

- [ ] **Step 1: Write the failing tests.** Cases for `tool-name-codec.test.ts`:
  1. Already-safe names pass through unchanged (`move_card` → `move_card`).
  2. Unsafe characters are replaced and a hash suffix added (`cards.move` → matches the pattern, ≠ `cards_move`).
  3. Colliding names (`cards.move`, `cards_move`, `cards move`) all get distinct model names, and each decodes back to its original.
  4. Order independence: the codec built from `[a, b, c]` and the one built from `[c, a, b]` give identical mappings.
  5. Names over 64 characters are shortened with a hash suffix and match the pattern; two long names sharing a 64-character prefix stay distinct.
  6. An empty or whitespace-only web name still gets a valid model name (`tool_<hash>`).
  7. `toWebToolName('unknown')` returns `undefined`; `toModelToolName('not-in-set')` throws `UnknownToolNameError`.
  8. Duplicate web names in the input are deduplicated, not rejected.
     Cases for `stable-hash.test.ts`: deterministic output, 7 base36 characters, and different outputs for `a` vs `b`.
- [ ] **Step 2:** Run `pnpm --filter @repo/agent-protocol test`. Expected: FAIL (modules not found).
- [ ] **Step 3:** Implement `stable-hash.ts` and `tool-name-codec.ts`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(agent-protocol): add deterministic tool-name codec`.

### Task 3: `@repo/agent-protocol` tool descriptors and untrusted-input limits

**Files:**

- Create: `packages/agent-protocol/src/tool-descriptors/{tool-descriptor-schema.ts,untrusted-input-limits.ts,normalize-tool-descriptors.ts,normalize-tool-descriptors.test.ts}`

**Interfaces:**

- Produces: `UNTRUSTED_INPUT_LIMITS = { maxToolsPerPage: 64, maxToolNameLength: 128, maxToolDescriptionLength: 1024, maxInputSchemaBytes: 16384, maxInputSchemaDepth: 10 }`
- Produces: `webMcpToolDescriptorSchema` (zod) and `type WebMcpToolDescriptor = { name, title?, description, inputSchema: JsonObjectSchema, annotations: ToolAnnotations, origin }`
- Produces: `type ToolAnnotations = { readOnlyHint: boolean; consequentialHint: boolean; untrustedContentHint: boolean }` (defaults `false`)
- Produces: `normalizeToolDescriptors(rawTools: readonly unknown[], origin: string): { tools: WebMcpToolDescriptor[]; rejectedTools: RejectedTool[] }`
- Produces: `type RejectedTool = { name: string; reason: ToolRejectionReason }` with `ToolRejectionReason = 'invalid-shape' | 'name-too-long' | 'invalid-input-schema' | 'input-schema-too-large' | 'input-schema-too-deep' | 'over-tool-limit'`

- [ ] **Step 1: Write the failing tests.** Cases:
  1. A valid object `inputSchema` is kept as is.
  2. `inputSchema` given as a JSON string is parsed.
  3. Missing `inputSchema` → `{ type: 'object', properties: {} }`.
  4. Invalid JSON string or a non-object schema → rejected with `invalid-input-schema`.
  5. Schema over 16 KB → `input-schema-too-large`; nesting deeper than 10 → `input-schema-too-deep`.
  6. Description over 1024 characters → truncated to the limit, with a trailing `… [truncated]`.
  7. Missing annotations → all `false`; truthy non-boolean values are coerced to booleans.
  8. 70 tools → the first 64 are kept (sorted by name for determinism) and 6 are reported as `over-tool-limit`.
  9. Non-object entries (null, string) → `invalid-shape` with name `'(unnamed)'`.
  10. The `origin` is stamped on every kept tool.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(agent-protocol): normalize WebMCP tool descriptors with untrusted-input limits`.

### Task 4: `@repo/agent-protocol` chat request contract

**Files:**

- Create: `packages/agent-protocol/src/chat-api/{chat-request-schema.ts,chat-request-schema.test.ts,api-error.ts}`

**Interfaces:**

- Produces: `chatRequestBodySchema` (zod) → `type ChatRequestBody = { id: string; messages: ChatUiMessage[]; pageContext: PageContext }`
- Produces: `type PageContext = { tabId: number; url: string; origin: string; title: string; isTrustedOrigin: boolean; tools: WebMcpToolDescriptor[] }`
- Produces: `type ApiErrorCode = 'invalid_request' | 'forbidden_origin' | 'payload_too_large' | 'usage_exhausted' | 'upstream_auth' | 'upstream_busy' | 'upstream_unreachable'` and `type ApiErrorBody = { error: { code: ApiErrorCode; message: string; details?: unknown } }`

- [ ] **Step 1: Write the failing tests.** Cases: a valid body parses; a missing `pageContext` fails; a non-URL `url` fails; an `origin` that doesn't match the URL's origin fails; more than 64 tools fails; `messages` must be a non-empty array of `{ id, role ∈ user|assistant|system, parts: array }`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS. Also run `pnpm --filter @repo/agent-protocol typecheck`. Expected: exit 0.
- [ ] **Step 5:** Write `packages/agent-protocol/README.md` (what it is, a mermaid diagram of who uses it, a table of exports, examples). Commit: `feat(agent-protocol): define chat API request contract`.

### Task 5: `@repo/ui` shared design system

**Files:**

- Create: `packages/ui/{package.json,tsconfig.json,vitest.config.ts,components.json,README.md}`
- Create: `packages/ui/src/styles/globals.css`, `packages/ui/src/lib/utils.ts`, `packages/ui/src/components/*.tsx` (generated by the shadcn CLI), `packages/ui/src/components/button.test.tsx`, `packages/ui/src/test/setup.ts`

**Interfaces:**

- Produces: imports `@repo/ui/components/<name>`, `@repo/ui/lib/utils` (`cn`), `@repo/ui/globals.css`.

- [ ] **Step 1:** Write the failing test `button.test.tsx`: renders the children, applies the `destructive` variant class, and forwards `onClick`.
- [ ] **Step 2:** Run it. Expected: FAIL (no component yet).
- [ ] **Step 3:** Add the shadcn components with the CLI in monorepo mode (`button, card, input, textarea, badge, scroll-area, separator, tooltip, alert-dialog, dialog, dropdown-menu, select, skeleton, switch`). Write `globals.css` with Tailwind 4 and an `@source` glob for `apps/**`.
- [ ] **Step 4:** Run the tests plus `pnpm --filter @repo/ui typecheck`. Expected: PASS and exit 0.
- [ ] **Step 5:** README (how to add a component, how apps import styles). Commit: `feat(ui): add shared shadcn design system package`.

### Task 6: Foundation milestone verification and docs

**Files:**

- Create: `README.md` (root), `docs/architecture.md` (initial: system diagram + package map)

- [ ] **Step 1:** Run `pnpm check` (lint + typecheck + test) from a clean install (`rm -rf node_modules && pnpm install`). Expected: all green.
- [ ] **Step 2:** Exercise `@repo/agent-protocol` the way the apps will: a throwaway script (scratchpad, not committed) that imports the package through Node type stripping and runs the codec + normalization on a realistic tool list. Expected: the output matches the documented examples.
- [ ] **Step 3:** Write the root README and the architecture doc (plain language, tables, mermaid, navigable links).
- [ ] **Step 4:** Commit: `docs: add root README and architecture overview`.
