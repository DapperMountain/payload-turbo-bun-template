# Agents — payload-multi-tenant-template

This app is part of the monorepo. Start with the root [AGENTS.md](../../AGENTS.md) (Bun, Turborepo, shared Payload skill).

## Reading order (this app)

1. **[`.agents/skills/dapper-payload-app/SKILL.md`](.agents/skills/dapper-payload-app/SKILL.md)** — config paths, Zod, Postgres, seeding, multi-tenant plugin, `src/lang`.
2. **Root [`.agents/skills/payload/SKILL.md`](../../.agents/skills/payload/SKILL.md)** — generic Payload CMS patterns.
3. **Root workspace rules** — [`.agents/rules/`](../../.agents/rules/) — see [`.agents/rules/README.md`](../../.agents/rules/README.md) for the index.

## Overlay reference docs

| Topic | File |
|-------|------|
| Layout, config, types, plugins | [`reference/PROJECT.md`](.agents/skills/dapper-payload-app/reference/PROJECT.md) |
| Frontend design system | [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) |
| Migrations and seeding | [`reference/DATABASE.md`](.agents/skills/dapper-payload-app/reference/DATABASE.md) |
| Multi-tenant plugin | [`reference/MULTI-TENANT.md`](.agents/skills/dapper-payload-app/reference/MULTI-TENANT.md) |
| App i18n (`src/lang`) | [`reference/I18N.md`](.agents/skills/dapper-payload-app/reference/I18N.md) |

## Common commands (from this directory)

| Command | Purpose |
|---------|---------|
| `bun dev` | Next dev (port 3000) |
| `bun run generate:types` | Regenerate `src/types.ts` |
| `bun run db:migrate:run` | Run migrations (dev `.env`) |
| `bun test` | Tests — [`bunfig.toml`](./bunfig.toml), local [`.env.test`](./.env.test.example) (copy from example); see [`docs/TESTING.md`](docs/TESTING.md) |

Update shared Payload skill from **repo root**: `bun run skills:update`.

## Documentation sync

When your work changes paths, env, scripts, config layout, or other documentation-critical behavior, update docs **before finishing** — see [`docs/MAINTAINING_DOCS.md`](docs/MAINTAINING_DOCS.md) and monorepo [`.agents/MAINTAINING_AGENT_CONTEXT.md`](../../.agents/MAINTAINING_AGENT_CONTEXT.md). Do not wait for the user to request this.
