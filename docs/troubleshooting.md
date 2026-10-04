# Troubleshooting

Something not working? Find what you see in the tables below. Each row says what it means and how to fix it.

## Starting the apps

| You see                                                                   | Meaning                                                                                          | Fix                                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `ERR_REQUIRE_CYCLE_MODULE` from the NestJS server when running `pnpm dev` | The terminal is on an older Node.js (for example 22). The repository needs Node 24               | Run `nvm use` in the repository folder (`nvm install` the first time), then `pnpm dev` again |
| `OLLAMA_API_KEY is missing` from the agent backend                        | `apps/chrome-ext-bff/.env` doesn't exist yet, or the key line is empty                           | Follow [Set it up](../apps/chrome-ext-bff/README.md#set-it-up), then restart                 |
| `EADDRINUSE` (address already in use)                                     | An earlier run is still holding the port                                                         | Stop it, or find it with `lsof -i :4000 -i :5173 -i :8787 -sTCP:LISTEN` and end that process |
| `AI_MODEL "…" is not covered by Ollama's free usage`                      | The model in `.env` isn't one of the [free models](../apps/chrome-ext-bff/README.md#free-models) | Pick a free model, or set `AI_ALLOW_ANY_MODEL=true` if you've added credits                  |

> **Why do I need `nvm use` again in a new terminal?** nvm only switches Node.js for the terminal you run it in. Run `nvm use` in each new terminal, or make 24 the default with `nvm alias default 24`. If `node -v` still shows an older version in a new terminal, another Node.js install (from Homebrew, for example) comes first on your `PATH`.

These are the ports `pnpm dev` uses:

| Port   | App                                                 |
| ------ | --------------------------------------------------- |
| `4000` | [NestJS GraphQL server](../apps/web-server-demo)    |
| `5173` | [Web demo](../apps/web-demo)                        |
| `8787` | [Agent backend](../apps/chrome-ext-bff) (127.0.0.1) |

## In the side panel

| You see                                                | Meaning                                                                       | Fix                                                                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| _WebMCP is not available_                              | Chrome's WebMCP flag is off                                                   | Open `chrome://flags/#enable-webmcp-testing`, set it to **Enabled** and relaunch Chrome                        |
| _Reload the page to connect_                           | The tab was open before the extension loaded                                  | Reload the tab                                                                                                 |
| _Extensions can't run on this page_                    | `chrome://` pages and the Chrome Web Store block all extensions               | Use a normal web page                                                                                          |
| _The agent backend isn't running at …_                 | Nothing answers at the backend address in **Settings**                        | `pnpm --filter chrome-ext-bff dev`, or check the address in Settings                                           |
| _Ollama Cloud rejected the API key_                    | Ollama answered "unauthorized" for the key in `.env`                          | Create a new key at [ollama.com/settings](https://ollama.com/settings), paste it into `.env`, restart          |
| _Ollama Cloud doesn't offer the model …_               | `AI_MODEL` is misspelled or was retired                                       | Pick one from the [free models](../apps/chrome-ext-bff/README.md#free-models)                                  |
| _Your free Ollama Cloud usage is used up_              | The monthly free allowance is spent                                           | Wait for the reset, or add credits at [ollama.com/settings](https://ollama.com/settings)                       |
| _Ollama Cloud is busy_                                 | The free plan answers one request at a time                                   | Try again in a moment                                                                                          |
| _Requests must come from the WebMCP Lab extension._    | The extension's origin isn't in `ALLOWED_ORIGINS`                             | Keep the default in [`.env.example`](../apps/chrome-ext-bff/.env.example); the extension id is always the same |
| _This chat works on … switch back to that tab_         | A chat stays with the tab it started on, so tools never run on the wrong page | Go back to that tab, or click **New chat**                                                                     |
| The agent says the site _is not trusted_ and won't act | The agent never uses tools of a site you haven't trusted                      | Turn on **Trust this site** in the Tools view, then ask again                                                  |

Changed `.env`? The agent backend reads it only when it starts, so restart it.

## Checking the agent backend directly

Two commands answer "is it the backend or the extension?":

```bash
curl -s http://127.0.0.1:8787/api/health     # free: no tokens spent
pnpm --filter chrome-ext-bff smoke           # spends a few tokens: real chat with a tool call
```

A healthy backend answers:

```json
{
  "status": "ok",
  "model": "gpt-oss:120b",
  "freeTier": true,
  "ollama": { "reachable": true, "authOk": true, "modelListed": true }
}
```

| Field is `false` | Look at                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| `reachable`      | Your internet connection, or `OLLAMA_BASE_URL`                                        |
| `authOk`         | `OLLAMA_API_KEY` (see [how the key is checked](../apps/chrome-ext-bff/README.md#api)) |
| `modelListed`    | `AI_MODEL`                                                                            |
