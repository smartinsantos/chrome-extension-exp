# Demo walkthrough

A 10-minute tour that shows the whole idea: a web page offers its actions as tools, and an AI agent in Chrome's side panel uses them while you stay in control.

## Before you start

You need the full setup from the [README](../README.md#getting-started). The short version:

| Step | Command or action                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1    | Chrome 154+ with `chrome://flags/#enable-webmcp-testing` **Enabled** (then relaunch)                                         |
| 2    | `apps/chrome-ext-bff/.env` with your `OLLAMA_API_KEY` ([how](../apps/chrome-ext-bff/README.md#set-it-up))                    |
| 3    | `pnpm dev` (starts the API, the web demo, the agent backend and the extension build)                                         |
| 4    | Load `apps/chrome-ext/.output/chrome-mv3-dev` unpacked in `chrome://extensions` ([how](../apps/chrome-ext/README.md#try-it)) |

## 1. Meet the page's tools

1. Open <http://localhost:5173>. You'll see two boards.
2. Click the extension's toolbar icon. The side panel opens on **Tools**.
3. You see **2 tools**: `list_boards` and `open_board`. The toolbar badge also shows `2`.
4. Click `list_boards`, then **Run tool**. The JSON result lists both boards. This is exactly what an agent would get.

## 2. Watch tools appear and disappear

1. In the page, open **WebMCP Launch**.
2. The Tools view updates on its own: now there are **7 tools** (`get_board`, `create_card`, `update_card`, `move_card`, `archive_card` were added).
3. Go back to the boards list: the five board tools disappear again.

That's WebMCP's `toolchange` at work: the page offers tools that fit what's on screen.

## 3. Let the agent work

Switch to **Chat** (on the WebMCP Launch board):

| You type                                                              | What happens                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| "What's overdue?"                                                     | The agent calls `get_board` (read-only, on a trusted site, so it runs without asking) and answers |
| "Add a card 'Record the demo video' to To Do, due Friday, label docs" | An approval card appears for `create_card`. Click **Allow**: the card appears on the board        |
| "Move every urgent card in To Do to Doing"                            | Several `move_card` calls, each needing approval. The board updates live as you allow them        |
| "Archive 'Pick the AI model provider'"                                | `archive_card` is marked consequential, so it always asks. **Deny** it, and the agent accepts no  |
| Ask again and **Allow** it                                            | The card is archived, and the page shows an **Undo** button                                       |

The token counter at the top of the chat shows how much of your free Ollama usage the conversation used.

## 4. Try another site

1. Open a different website that uses WebMCP (Google's [WebMCP demos](https://github.com/GoogleChromeLabs/webmcp-tools) are a good start).
2. The site starts **Untrusted**, so even tools that claim to be read-only ask for approval.
3. Turn on **Trust this site** in the Tools view, and read-only tools run without asking.

## What to look at under the hood

| Where                                                                       | What you'll learn                                           |
| --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Side panel → right-click → **Inspect** → Network                            | The streamed chat (`/api/chat`) with tool calls and results |
| The web demo's DevTools → Network                                           | The GraphQL calls a tool makes: the same ones a click makes |
| The web demo's DevTools → Console: `await document.modelContext.getTools()` | The raw WebMCP tool list the extension reads                |
| [`docs/architecture.md`](architecture.md)                                   | How the pieces fit together                                 |
