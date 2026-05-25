# MCP (Model Context Protocol)

This app uses the official **[`@payloadcms/plugin-mcp`](https://payloadcms.com/docs/plugins/mcp)** plugin so AI clients (Cursor, VS Code Copilot, Claude, etc.) can call Payload over MCP.

Configuration lives in the `plugins` array in [`config/payload.ts`](../config/payload.ts) (`mcpPlugin` after `multiTenantPlugin`).

## Enable / disable

| Variable | Default | Effect |
|----------|---------|--------|
| `MCP_ENABLED` | `true` | When `false`, the plugin sets `disabled: true` (schema stays consistent; `/api/mcp` is inactive). |

After changing the flag or first install, restart the dev server.

## What the plugin adds

- **HTTP endpoint:** `{SERVER_URL}/api/mcp` (e.g. `http://localhost:3000/api/mcp` for local `bun dev`, or `http://localhost:3001/api/mcp` with root Docker Compose).
- **Admin:** **MCP → API Keys** — create keys and toggle which collections, globals, tools, prompts, and resources each key may use.
- **Collections exposed in config:** `users`, `tenants` (capabilities still gated per API key and by Payload access control).

Enabling a collection in `mcpPlugin({ collections: … })` only makes tools *available*; each API key must allow the operations you want in the admin UI.

## Security and multi-tenant

- Every MCP request requires `Authorization: Bearer <api-key>`.
- The key is tied to a **Payload user** (`users` collection). Collection access rules, hooks, and the **multi-tenant** plugin apply to that user — same as the REST API.
- Prefer keys for **system admin** or tightly scoped users when testing; do not hand out keys with broader access than the automation needs.

## Setup (local)

1. Ensure `MCP_ENABLED=true` in `.env` (default in [`.env.example`](../.env.example)).
2. Run migrations if you have not since enabling MCP:

   ```bash
   bun run db:migrate:run
   ```

3. Start Payload: `bun dev` (from this app) or `./scripts/up.sh` (from repo root).
4. In admin: **MCP → API Keys** → **Create** → choose a **User** (labels use virtual `fullName`; `users.forceSelect` ensures name fields load when pickers only select the title field) → allow capabilities → copy the generated key.
5. Point your MCP client at `{public URL}/api/mcp` with the Bearer header.

## Cursor

Cursor does not open `/api/mcp` by itself. Add a server in **`~/.cursor/mcp.json`** (user settings) or the project’s `.cursor/mcp.json`.

Prefer **direct HTTP** (Payload serves streamable HTTP on `/api/mcp`):

```json
{
  "mcpServers": {
    "payload": {
      "url": "http://127.0.0.1:3001/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:PAYLOAD_MCP_API_KEY}"
      }
    }
  }
}
```

Set the key in your shell (e.g. `~/.zshrc`): `export PAYLOAD_MCP_API_KEY="…"` from **MCP → API Keys** in admin. Restart Cursor after changing env vars.

| How you run the app | MCP URL on your Mac |
|---------------------|---------------------|
| `bun dev` in `apps/payload-multi-tenant-template` (host) | `http://127.0.0.1:3000/api/mcp` |
| Root `./scripts/up.sh` / Docker Compose (`3001:3000`) | `http://127.0.0.1:3001/api/mcp` |

Use the same host/port as `NEXT_PUBLIC_SERVER_URL` in `.env`. Prefer **`127.0.0.1`** if `localhost` fails.

**Settings → MCP** — enable the server and reload the window if it stays disconnected. Do not commit API keys; keep them in env vars or local config only.

**Alternative:** `bunx mcp-remote` with `--header` (see [Payload MCP docs](https://payloadcms.com/docs/plugins/mcp)) if direct `url` mode fails in your Cursor version.

### Cursor cannot reach localhost (troubleshooting)

1. **Payload must be running** — open `{NEXT_PUBLIC_SERVER_URL}/admin` in the browser first.
2. **Prove `/api/mcp` responds** (replace URL and key):

   ```bash
   curl -i "http://127.0.0.1:3001/api/mcp" \
     -X POST \
     -H "Authorization: Bearer YOUR_MCP_API_KEY" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
   ```

   - `000` / connection refused → wrong port or app not up.
   - `401` → bad or missing Bearer key.
   - `200` + JSON → server is fine; fix Cursor config next.

3. **`mcp.json` must exist** — usually `~/.cursor/mcp.json` or project `.cursor/mcp.json` (add the server in Cursor Settings if you prefer the UI).
4. **MCP enabled** — `MCP_ENABLED=true` in `.env`, restart dev after changes; run `bun run db:migrate:run` once.
5. **`bunx mcp-remote` must run on the host** — from repo root: `bunx -y mcp-remote http://127.0.0.1:3001/api/mcp --header "Authorization: Bearer TEST"` (expect auth error with a fake key, not “connection refused”).
6. **Remote / VM workspace** — if Cursor’s backend is not on your Mac, `localhost` is *its* machine, not yours; use port forwarding or run Cursor against a local clone.
7. Check **MCP logs** in Cursor (server entry → show output) for `ECONNREFUSED`, `401`, or `mcp-remote` not found.

## VS Code Copilot

```json
{
  "mcp.servers": {
    "payload-multi-tenant-template": {
      "command": "bunx",
      "args": [
        "-y",
        "mcp-remote",
        "http://127.0.0.1:3000/api/mcp",
        "--header",
        "Authorization: Bearer YOUR_MCP_API_KEY"
      ]
    }
  }
}
```

## Test the endpoint

```bash
curl -i "${NEXT_PUBLIC_SERVER_URL:-http://localhost:3000}/api/mcp" \
  -X POST \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```

Or use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) with the same URL and header.

## Custom tools

Add prompts, tools, or resources via the `mcp` option on `mcpPlugin` in [`config/payload.ts`](../config/payload.ts). See [Payload MCP plugin docs](https://payloadcms.com/docs/plugins/mcp).

## Related docs

- [Payload MCP plugin](https://payloadcms.com/docs/plugins/mcp)
- [Multi-tenant access](../.agents/skills/dapper-payload-app/reference/MULTI-TENANT.md)
- [Config env vars](../config/README.md)
