# Agents — accounting-for-life

This app is part of the monorepo. Start with the root [AGENTS.md](../../AGENTS.md) (Bun, Turborepo, shared Payload skill).

## Reading order (this app)

1. **[`.agents/skills/accounting-for-life-app/SKILL.md`](.agents/skills/accounting-for-life-app/SKILL.md)** — config paths, Zod, Postgres, seeding, multi-tenant plugin, `src/lang`.
2. **Root [`.agents/skills/payload/SKILL.md`](../../.agents/skills/payload/SKILL.md)** — generic Payload CMS patterns.
3. **Root workspace rules** — [`.agents/rules/`](../../.agents/rules/) — see [`.agents/rules/README.md`](../../.agents/rules/README.md) for the index.

## Overlay reference docs

| Topic | File |
|-------|------|
| Layout, config, types, plugins | [`reference/PROJECT.md`](.agents/skills/accounting-for-life-app/reference/PROJECT.md) |
| Frontend design system | [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) |
| Migrations and seeding | [`reference/DATABASE.md`](.agents/skills/accounting-for-life-app/reference/DATABASE.md) |
| Multi-tenant plugin | [`reference/MULTI-TENANT.md`](.agents/skills/accounting-for-life-app/reference/MULTI-TENANT.md) |
| App i18n (`src/lang`) | [`reference/I18N.md`](.agents/skills/accounting-for-life-app/reference/I18N.md) |

## Common commands (from this directory)

**Default dev:** run the app in Docker from the **repo root** (`./scripts/up.sh`) and use **`http://localhost:3001/admin`**. Do **not** start a second Payload dev server on the host (port 3000) unless you are explicitly using the host-only workflow below.

| Command | Purpose |
|---------|---------|
| `./scripts/up.sh` (repo root) | Docker Compose — app on **3001**, Postgres on **5442** |
| `bun dev` | Optional: Payload on the **host** only (port **3000**); use when DB is in Docker but not the app container |
| `bun run generate:types` | Regenerate `src/types.ts` |
| `bun run db:migrate:run` | Run migrations (production / CI) |
| `bun run db:push` | Dev: push schema to Postgres (`localhost:5442` from host) |
| `bun run db:seed <name>` | Run one seeder (see below) |
| MCP / API keys | [`docs/MCP.md`](docs/MCP.md) — `/api/mcp`, `MCP_ENABLED` |
| `bun test` | Unit + integration tests — [`docs/TESTING.md`](docs/TESTING.md) |

Update shared Payload skill from **repo root**: `bun run skills:update`.

## Documentation sync

When your work changes paths, env, scripts, config layout, or other documentation-critical behavior, update docs **before finishing** — see [`docs/MAINTAINING_DOCS.md`](docs/MAINTAINING_DOCS.md) and monorepo [`.agents/MAINTAINING_AGENT_CONTEXT.md`](../../.agents/MAINTAINING_AGENT_CONTEXT.md). Do not wait for the user to request this.
